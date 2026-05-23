-- Colonnes optionnelles pour la facturation Paydunya / traçabilité
alter table public.orders
add column if not exists paydunya_invoice_token text;

alter table public.orders
add column if not exists estimated_total_fcfa integer;
