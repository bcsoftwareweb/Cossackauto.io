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

create or replace function public.admin_list_customers()
returns table (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    coalesce(p.full_name, ''),
    u.email::text,
    u.created_at
  from auth.users as u
  join public.profiles as p on p.id = u.id
  where public.is_admin()
    and p.role = 'customer'
  order by u.created_at desc;
$$;

revoke all on function public.admin_list_customers() from public, anon;
grant execute on function public.admin_list_customers() to authenticated;

create table if not exists public.site_pages (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 120),
  is_system boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_pages (slug, title, is_system, is_published)
values
  ('home', 'Home', true, true),
  ('about', 'About', true, true),
  ('services', 'Services', true, true),
  ('reviews', 'Reviews', true, true),
  ('reservation', 'Reservation', true, true)
on conflict (slug) do nothing;

alter table public.site_pages enable row level security;

revoke all on table public.site_pages from public, anon, authenticated;
grant select on table public.site_pages to anon, authenticated;
grant insert (slug, title, is_published) on table public.site_pages to authenticated;
grant update (slug, title, is_published) on table public.site_pages to authenticated;
grant delete on table public.site_pages to authenticated;

drop policy if exists "Anyone can read published site pages" on public.site_pages;
create policy "Anyone can read published site pages"
  on public.site_pages for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Admins can read all site pages" on public.site_pages;
create policy "Admins can read all site pages"
  on public.site_pages for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create custom site pages" on public.site_pages;
create policy "Admins can create custom site pages"
  on public.site_pages for insert to authenticated
  with check (public.is_admin() and not is_system);

drop policy if exists "Admins can update custom site pages" on public.site_pages;
create policy "Admins can update custom site pages"
  on public.site_pages for update to authenticated
  using (public.is_admin() and not is_system)
  with check (public.is_admin() and not is_system);

drop policy if exists "Admins can delete custom site pages" on public.site_pages;
create policy "Admins can delete custom site pages"
  on public.site_pages for delete to authenticated
  using (public.is_admin() and not is_system);

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null default 'Cossack Auto Solutions'
    check (length(trim(site_name)) between 1 and 100),
  logo_path text,
  header_background_color text not null default '#0f1113'
    check (header_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  header_text_color text not null default '#efe7dd'
    check (header_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  header_accent_color text not null default '#8e0f18'
    check (header_accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

revoke all on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert (id, site_name, logo_path, header_background_color, header_text_color, header_accent_color)
  on table public.site_settings to authenticated;
grant update (site_name, logo_path, header_background_color, header_text_color, header_accent_color)
  on table public.site_settings to authenticated;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
  on public.site_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.site_navigation (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(trim(label)) between 1 and 60),
  page_slug text references public.site_pages(slug) on update cascade on delete cascade,
  href text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint site_navigation_target_check check (
    (page_slug is not null and href is null)
    or (page_slug is null and href is not null)
  ),
  constraint site_navigation_href_check check (
    href is null
    or (
      (left(href, 1) = '/' and left(href, 2) <> '//')
      or lower(href) like 'http://%'
      or lower(href) like 'https://%'
    )
  ),
  unique (page_slug)
);

insert into public.site_navigation (label, page_slug, sort_order, is_published)
values
  ('Home', 'home', 0, true),
  ('About', 'about', 10, true),
  ('Services', 'services', 20, true),
  ('Reviews', 'reviews', 30, true),
  ('Reservation', 'reservation', 40, true)
on conflict (page_slug) do nothing;

alter table public.site_navigation enable row level security;

revoke all on table public.site_navigation from public, anon, authenticated;
grant select on table public.site_navigation to anon, authenticated;
grant insert (label, page_slug, href, sort_order, is_published)
  on table public.site_navigation to authenticated;
grant update (label, page_slug, href, sort_order, is_published)
  on table public.site_navigation to authenticated;
grant delete on table public.site_navigation to authenticated;

drop policy if exists "Anyone can read published navigation" on public.site_navigation;
create policy "Anyone can read published navigation"
  on public.site_navigation for select to anon, authenticated
  using (
    is_published
    and (
      page_slug is null
      or exists (
        select 1
        from public.site_pages
        where slug = site_navigation.page_slug
          and is_published
      )
    )
  );

drop policy if exists "Admins can read all navigation" on public.site_navigation;
create policy "Admins can read all navigation"
  on public.site_navigation for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create navigation links" on public.site_navigation;
create policy "Admins can create navigation links"
  on public.site_navigation for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update navigation links" on public.site_navigation;
create policy "Admins can update navigation links"
  on public.site_navigation for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete navigation links" on public.site_navigation;
create policy "Admins can delete navigation links"
  on public.site_navigation for delete to authenticated
  using (public.is_admin());

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null references public.site_pages(slug) on update cascade on delete cascade,
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
  drop constraint if exists site_sections_page_slug_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_sections_page_slug_fkey'
      and conrelid = 'public.site_sections'::regclass
  ) then
    alter table public.site_sections
      add constraint site_sections_page_slug_fkey
      foreign key (page_slug)
      references public.site_pages(slug)
      on update cascade
      on delete cascade;
  end if;
end;
$$;

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
  using (
    is_published = true
    and exists (
      select 1
      from public.site_pages
      where slug = site_sections.page_slug
        and is_published
    )
  );

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

drop trigger if exists set_site_pages_updated_at on public.site_pages;
create trigger set_site_pages_updated_at
  before update on public.site_pages
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
grant select on table public.reviews to authenticated;
grant insert (name, business, rating, review) on table public.reviews to anon;
grant update (is_published) on table public.reviews to authenticated;

drop policy if exists "Anyone can read published reviews" on public.reviews;
create policy "Anyone can read published reviews"
  on public.reviews for select to anon
  using (is_published = true);

drop policy if exists "Anyone can submit reviews for approval" on public.reviews;
create policy "Anyone can submit reviews for approval"
  on public.reviews for insert to anon
  with check (is_published = false);

drop policy if exists "Admins can read all reviews" on public.reviews;
create policy "Admins can read all reviews"
  on public.reviews for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can moderate reviews" on public.reviews;
create policy "Admins can moderate reviews"
  on public.reviews for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
