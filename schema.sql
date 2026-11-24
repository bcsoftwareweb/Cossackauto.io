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
