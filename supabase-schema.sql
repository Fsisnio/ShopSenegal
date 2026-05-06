create extension if not exists "uuid-ossp";

create table if not exists public.drivers (
  id text primary key,
  first_name text not null,
  last_name text not null,
  zone text not null,
  photo text not null
);

create table if not exists public.places (
  id text primary key,
  name text not null,
  area text not null
);

create table if not exists public.users (
  id text primary key,
  full_name text not null,
  phone text not null unique,
  email text unique,
  address text not null,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  client text not null,
  telephone text not null,
  adresse text not null,
  note text,
  creneau text,
  paiement text,
  besoins jsonb not null default '[]'::jsonb,
  photos integer not null default 0,
  status text not null default 'Nouvelle',
  payment_status text not null default 'Non paye',
  assigned_driver text,
  created_at timestamptz not null default now()
);

alter table public.drivers enable row level security;
alter table public.places enable row level security;
alter table public.users enable row level security;
alter table public.orders enable row level security;

drop policy if exists "public read drivers" on public.drivers;
drop policy if exists "public write drivers" on public.drivers;
drop policy if exists "public read places" on public.places;
drop policy if exists "public write places" on public.places;
drop policy if exists "public read users" on public.users;
drop policy if exists "public write users" on public.users;
drop policy if exists "public read orders" on public.orders;
drop policy if exists "public write orders" on public.orders;

create policy "public read drivers"
on public.drivers for select
using (true);

create policy "public write drivers"
on public.drivers for all
using (true)
with check (true);

create policy "public read places"
on public.places for select
using (true);

create policy "public write places"
on public.places for all
using (true)
with check (true);

create policy "public read users"
on public.users for select
using (true);

create policy "public write users"
on public.users for all
using (true)
with check (true);

create policy "public read orders"
on public.orders for select
using (true);

create policy "public write orders"
on public.orders for all
using (true)
with check (true);
