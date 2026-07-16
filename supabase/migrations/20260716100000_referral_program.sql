-- Programme de parrainage ShopSenegal
-- Chaque utilisateur reçoit un code unique à l'inscription.
-- À l'achat : code parrain optionnel.
-- Panier ≥ 5 500 FCFA + code valide → +300 FCFA crédit parrain + +300 FCFA filleul.
-- Panier ≥ 20 000 FCFA + code valide → −50 % sur la livraison.
-- Livraison : ≥ 20 000 FCFA → 1 000 FCFA ; sinon 6 % du panier (avant réductions).

alter table public.users add column if not exists referral_code text;
alter table public.users add column if not exists referral_credit_fcfa integer not null default 0;

create unique index if not exists users_referral_code_unique
  on public.users (referral_code)
  where referral_code is not null;

alter table public.orders add column if not exists referral_code_used text;
alter table public.orders add column if not exists delivery_fee_fcfa integer;
alter table public.orders add column if not exists delivery_discount_fcfa integer not null default 0;
alter table public.orders add column if not exists referral_reward_granted boolean not null default false;

notify pgrst, 'reload schema';
