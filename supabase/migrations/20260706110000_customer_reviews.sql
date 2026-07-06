-- ShopSenegal — avis clients (popup après achat ou visite)

create table if not exists public.customer_reviews (
  id text primary key,
  rating integer not null check (rating between 1 and 5),
  comment text,
  source text not null default 'visit',
  page text,
  order_id text,
  client_phone text,
  created_at timestamptz not null default now()
);

alter table public.customer_reviews enable row level security;

drop policy if exists "public insert customer_reviews" on public.customer_reviews;
drop policy if exists "public read customer_reviews" on public.customer_reviews;

create policy "public insert customer_reviews"
  on public.customer_reviews for insert
  with check (true);

create policy "public read customer_reviews"
  on public.customer_reviews for select
  using (true);

notify pgrst, 'reload schema';
