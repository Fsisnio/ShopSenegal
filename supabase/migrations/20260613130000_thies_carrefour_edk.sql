-- ShopSenegal — centres commerciaux Carrefour et EDK à Thiès

insert into public.places (id, name, area) values
  ('p11', 'Carrefour Thiès', 'Thiès'),
  ('p12', 'EDK Thiès', 'Thiès')
on conflict (id) do update set
  name = excluded.name,
  area = excluded.area;

notify pgrst, 'reload schema';
