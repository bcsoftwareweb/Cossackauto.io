-- Run this script in the Supabase SQL Editor.
create extension if not exists "pgcrypto";

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
