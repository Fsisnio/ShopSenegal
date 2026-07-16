-- Crédit parrainage utilisé sur une commande (déduit au moment du paiement).

alter table public.orders add column if not exists referral_credit_applied_fcfa integer not null default 0;

notify pgrst, 'reload schema';
