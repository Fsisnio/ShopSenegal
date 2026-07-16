-- Rattrapage : codes parrain pour les comptes existants.
-- Inclut le schéma parrainage si la migration 20260716100000 n'a pas encore été appliquée.

-- 1) Colonnes parrainage (users + orders)
alter table public.users add column if not exists referral_code text;
alter table public.users add column if not exists referral_credit_fcfa integer not null default 0;

create unique index if not exists users_referral_code_unique
  on public.users (referral_code)
  where referral_code is not null;

alter table public.orders add column if not exists referral_code_used text;
alter table public.orders add column if not exists delivery_fee_fcfa integer;
alter table public.orders add column if not exists delivery_discount_fcfa integer not null default 0;
alter table public.orders add column if not exists referral_reward_granted boolean not null default false;

-- 2) Génération des codes pour les utilisateurs sans code
-- Même logique que app-data.js (initiales + 4 derniers chiffres du téléphone + suffixe unique).

do $$
declare
  r record;
  v_prefix text;
  v_tail text;
  v_suffix text;
  v_code text;
  v_attempt int;
  w1 text;
  w2 text;
  v_init text;
begin
  for r in
    select id, full_name, phone
    from public.users
    where referral_code is null
    order by created_at nulls last, id
  loop
    w1 := split_part(trim(coalesce(r.full_name, '')), ' ', 1);
    w2 := split_part(trim(coalesce(r.full_name, '')), ' ', 2);
    v_init :=
      regexp_replace(upper(substring(coalesce(w1, '') from 1 for 1)), '[^A-Z]', '', 'g') ||
      regexp_replace(upper(substring(coalesce(w2, '') from 1 for 1)), '[^A-Z]', '', 'g');
    v_init := regexp_replace(coalesce(v_init, ''), '[^A-Z]', '', 'g');

    if length(v_init) = 0 then
      v_prefix := 'SS';
    else
      v_prefix := left(v_init, 3);
    end if;

    v_tail := lpad(
      right(regexp_replace(coalesce(r.phone, ''), '[^0-9]', '', 'g'), 4),
      4,
      '0'
    );

    v_attempt := 0;
    loop
      v_suffix := upper(substr(md5(r.id || ':' || v_attempt::text), 1, 3));
      v_code := v_prefix || v_tail || v_suffix;

      exit when not exists (
        select 1 from public.users u where u.referral_code = v_code
      );

      v_attempt := v_attempt + 1;
      if v_attempt > 25 then
        v_code := 'SS' || upper(substr(replace(r.id, '-', ''), 1, 10));
        exit;
      end if;
    end loop;

    update public.users
    set referral_code = v_code
    where id = r.id;
  end loop;
end $$;

notify pgrst, 'reload schema';
