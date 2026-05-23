-- ShopSenegal — catalogue produits g\u00e9r\u00e9 depuis l'admin
-- Distinct du fichier data/auchan-products.json (catalogue scrap\u00e9 / public)
-- Ex\u00e9cuter via supabase db push ou dans le SQL Editor.

create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text,
  category text,
  description text,
  price_fcfa integer,
  image_url text,
  source_url text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Colonnes ajout\u00e9es apr\u00e8s coup (migration douce si la table existait d\u00e9j\u00e0)
alter table public.products add column if not exists name text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price_fcfa integer;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists source_url text;
alter table public.products add column if not exists in_stock boolean default true;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

-- RLS coh\u00e9rente avec les autres tables (acc\u00e8s public, \u00e0 durcir quand Supabase Auth sera branch\u00e9)
alter table public.products enable row level security;

drop policy if exists "public read products" on public.products;
drop policy if exists "public write products" on public.products;

create policy "public read products"
  on public.products for select
  using (true);

create policy "public write products"
  on public.products for all
  using (true)
  with check (true);

-- Trigger pour maintenir updated_at \u00e0 jour
create or replace function public.touch_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch
before update on public.products
for each row
execute function public.touch_products_updated_at();

notify pgrst, 'reload schema';
