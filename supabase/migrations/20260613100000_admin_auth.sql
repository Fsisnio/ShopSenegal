-- ShopSenegal — authentification admin (Supabase Auth + liste blanche)
-- 1) Créer l'utilisateur dans Supabase → Authentication → Users (email + mot de passe)
-- 2) Exécuter cette migration (ou supabase db push)
-- 3) L'email doit figurer dans public.admin_users

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin read own allowlist row" on public.admin_users;

-- Un utilisateur connecté ne peut lire que sa propre ligne (vérification accès admin)
create policy "admin read own allowlist row"
  on public.admin_users
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Compte admin initial (créer aussi l'utilisateur Auth avec le même email)
insert into public.admin_users (email, full_name)
values ('faladespero1@gmail.com', 'Administrateur ShopSenegal')
on conflict (email) do nothing;

notify pgrst, 'reload schema';
