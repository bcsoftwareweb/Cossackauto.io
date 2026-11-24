-- Run this script in the Supabase SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'New profiles are always customer. Only a trusted project owner may promote a verified account to admin; users cannot change their own role.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update their own name" on public.profiles;
create policy "Users can update their own name"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), ''),
    'customer'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, full_name, role)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), ''),
  'customer'
from auth.users
on conflict (id) do nothing;

-- After verifying an account created through /account, promote it manually as
-- the project owner. Do not expose this update through the frontend.
-- update public.profiles
-- set role = 'admin'
-- where id = (
--   select id
--   from auth.users
--   where email = lower('admin@example.com')
-- );

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null check (page_slug in ('home', 'about', 'services', 'reviews', 'reservation')),
  section_key text not null default gen_random_uuid()::text,
  section_type text not null check (section_type in ('hero', 'intro', 'profile', 'service', 'content')),
  eyebrow text not null default '',
  title text not null default '',
  body text not null default '',
  image_path text,
  button_label text,
  button_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_slug, section_key)
);

alter table public.site_sections
  add column if not exists eyebrow text not null default '';

alter table public.site_sections enable row level security;

revoke all on table public.site_sections from public, anon, authenticated;
grant select on table public.site_sections to anon, authenticated;
grant insert (page_slug, section_type, eyebrow, title, body, image_path, button_label, button_url, sort_order, is_published)
  on table public.site_sections to authenticated;
grant update (page_slug, eyebrow, title, body, image_path, button_label, button_url, sort_order, is_published)
  on table public.site_sections to authenticated;
grant delete on table public.site_sections to authenticated;

drop policy if exists "Anyone can read published site sections" on public.site_sections;
create policy "Anyone can read published site sections"
  on public.site_sections for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Admins can read all site sections" on public.site_sections;
create policy "Admins can read all site sections"
  on public.site_sections for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert site sections" on public.site_sections;
create policy "Admins can insert site sections"
  on public.site_sections for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update site sections" on public.site_sections;
create policy "Admins can update site sections"
  on public.site_sections for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete site sections" on public.site_sections;
create policy "Admins can delete site sections"
  on public.site_sections for delete to authenticated
  using (public.is_admin());

create table if not exists public.customer_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_path text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_updates enable row level security;

revoke all on table public.customer_updates from public, anon, authenticated;
grant select on table public.customer_updates to authenticated;
grant insert (title, body, image_path, is_published)
  on table public.customer_updates to authenticated;
grant update (title, body, image_path, is_published)
  on table public.customer_updates to authenticated;
grant delete on table public.customer_updates to authenticated;

drop policy if exists "Signed-in customers can read published updates" on public.customer_updates;
create policy "Signed-in customers can read published updates"
  on public.customer_updates for select to authenticated
  using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert customer updates" on public.customer_updates;
create policy "Admins can insert customer updates"
  on public.customer_updates for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update customer updates" on public.customer_updates;
create policy "Admins can update customer updates"
  on public.customer_updates for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete customer updates" on public.customer_updates;
create policy "Admins can delete customer updates"
  on public.customer_updates for delete to authenticated
  using (public.is_admin());

create or replace function public.set_content_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_content_updated_at() from public, anon, authenticated;

drop trigger if exists set_site_sections_updated_at on public.site_sections;
create trigger set_site_sections_updated_at
  before update on public.site_sections
  for each row execute function public.set_content_updated_at();

drop trigger if exists set_customer_updates_updated_at on public.customer_updates;
create trigger set_customer_updates_updated_at
  before update on public.customer_updates
  for each row execute function public.set_content_updated_at();

insert into public.site_sections (
  page_slug, section_key, section_type, eyebrow, title, body, button_label, button_url, sort_order, is_published
)
values
  ('home', 'home-hero', 'hero', 'Neighborhood auto repair', 'Cossack Auto Solutions', 'Honest work and fair prices from a shop you can trust down the street.', 'Book an appointment', '/reservation', 0, true),
  ('about', 'about-intro', 'intro', 'About us', 'Meet the shop', 'Your trusted neighborhood auto repair shop. Honest work, fair prices, quality service.', null, null, 0, true),
  ('about', 'about-profile', 'profile', '', 'Your Name', 'Hi, I''m Your Name — owner of Cossack Auto Solutions. I started this shop because I believe in honest, high-quality auto repair.' || E'\n\n' || 'I treat every vehicle like my own and stand behind my work. If you''d like to schedule service, please use the button below to book an appointment.', 'Book an appointment', '/reservation', 1, true),
  ('services', 'services-intro', 'intro', 'What we offer', 'Services', 'From oil changes and fluid service to brakes, suspension, diagnostics, engine repair, and pre-purchase inspections, we provide reliable maintenance and repair solutions for your vehicle.', null, null, 0, true),
  ('services', 'service-oil-change', 'service', '', 'Oil Change', 'Full synthetic, blend, or conventional oil change services.', null, null, 10, true),
  ('services', 'service-fluid-services', 'service', '', 'Fluid Services', 'Transmission, brake fluid, coolant, and related fluid flush services.', null, null, 20, true),
  ('services', 'service-brakes', 'service', '', 'Brakes', 'Brake pad, rotor, and caliper replacement and service.', null, null, 30, true),
  ('services', 'service-suspension', 'service', '', 'Suspension and Steering', 'Shocks, struts, CV axles, and steering component service.', null, null, 40, true),
  ('services', 'service-batteries', 'service', '', 'Batteries, Starters and Alternators', 'Battery, starter, alternator, and charging system service.', null, null, 50, true),
  ('services', 'service-diagnostics', 'service', '', 'Diagnostics and Check Engine Lights', 'Vehicle diagnostics and check engine light testing and troubleshooting.', null, null, 60, true),
  ('services', 'service-engine-repair', 'service', '', 'Engine Repair Work', 'Engine repair and related mechanical service.', null, null, 70, true),
  ('services', 'service-inspections', 'service', '', 'Pre-purchase Inspections', 'Vehicle inspections for buyers before making a purchase decision.', null, null, 80, true),
  ('reviews', 'reviews-intro', 'intro', 'Testimonials', 'Customer reviews', 'We''d love to hear about your experience with Cossack Auto Solutions.', null, null, 0, true),
  ('reservation', 'reservation-intro', 'intro', 'Schedule service', 'Book an appointment', 'Fill out the form below and we''ll get back to you to confirm your appointment.', null, null, 0, true)
on conflict (page_slug, section_key) do nothing;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  vehicle text,
  date timestamptz,
  notes text,
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.reservations
  add column if not exists photo_path text;

alter table public.reservations enable row level security;

revoke all on table public.reservations from public, anon, authenticated;
grant insert (name, email, phone, vehicle, date, notes, photo_path)
  on table public.reservations to anon;

drop policy if exists "Anyone can submit a reservation" on public.reservations;
create policy "Anyone can submit a reservation"
  on public.reservations for insert to anon
  with check (true);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business text,
  rating smallint not null check (rating between 1 and 5),
  review text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

revoke all on table public.reviews from public, anon, authenticated;
grant select on table public.reviews to anon;
grant insert (name, business, rating, review) on table public.reviews to anon;

drop policy if exists "Anyone can read published reviews" on public.reviews;
create policy "Anyone can read published reviews"
  on public.reviews for select to anon
  using (is_published = true);

drop policy if exists "Anyone can submit reviews for approval" on public.reviews;
create policy "Anyone can submit reviews for approval"
  on public.reviews for insert to anon
  with check (is_published = false);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'reservation-photos',
  'reservation-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload reservation photos" on storage.objects;
create policy "Anyone can upload reservation photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'reservation-photos');

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'site-media',
  'site-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view site media" on storage.objects;
create policy "Anyone can view site media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-media');

drop policy if exists "Admins can upload site media" on storage.objects;
create policy "Admins can upload site media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admins can update site media" on storage.objects;
create policy "Admins can update site media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and public.is_admin())
  with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admins can delete site media" on storage.objects;
create policy "Admins can delete site media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and public.is_admin());
