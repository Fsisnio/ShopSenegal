-- ShopSenegal — lieux d'emplette : marchés de Thiès uniquement
-- Remplace les anciennes entrées (Dakar, etc.) par le catalogue Thiès.

delete from public.places;

insert into public.places (id, name, area) values
  ('p1', 'Marché Assane Lô', 'Thiès centre'),
  ('p2', 'Marché Tilène', 'Thiès'),
  ('p3', 'Marché Keur Mbaye Fall', 'Thiès'),
  ('p4', 'Marché Grand Standing', 'Thiès'),
  ('p5', 'Marché Thiaday', 'Thiès'),
  ('p6', 'Marché Manko', 'Thiès'),
  ('p7', 'Marché Ngangate', 'Thiès'),
  ('p8', 'Auchan Thiès', 'Thiès'),
  ('p9', 'Casino Thiès', 'Thiès'),
  ('p10', 'Marché de quartier (Thiès)', 'Thiès'),
  ('p11', 'Carrefour Thiès', 'Thiès'),
  ('p12', 'EDK Thiès', 'Thiès')
on conflict (id) do update set
  name = excluded.name,
  area = excluded.area;

notify pgrst, 'reload schema';
