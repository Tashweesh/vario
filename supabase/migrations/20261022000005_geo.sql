-- Real map coordinates (WGS84) replace the schematic x/y percentages.
-- Areas always have a centre; listings and projects may carry their own pin and
-- otherwise fall back to their area's centre on the public map.

alter table public.areas
  add column lat numeric(9,6) not null default 36.1911 check (lat between -90 and 90),
  add column lng numeric(9,6) not null default 44.0092 check (lng between -180 and 180);

update public.areas a set lat = v.lat, lng = v.lng
from (values
  ('center',    36.1911, 44.0092),
  ('ankawa',    36.2290, 43.9895),
  ('gulan',     36.2005, 43.9760),
  ('bakhtiari', 36.1735, 43.9900),
  ('iskan',     36.1965, 44.0335),
  ('pirmam',    36.2640, 44.0720),
  ('kirkuk',    36.1270, 43.9995),
  ('kasnazan',  36.1860, 44.1500)
) as v(id, lat, lng)
where a.id = v.id;

alter table public.areas drop column x, drop column y;

alter table public.listings
  add column lat numeric(9,6) check (lat between -90 and 90),
  add column lng numeric(9,6) check (lng between -180 and 180),
  add constraint listings_latlng_pair check ((lat is null) = (lng is null));

alter table public.projects
  add column lat numeric(9,6) check (lat between -90 and 90),
  add column lng numeric(9,6) check (lng between -180 and 180),
  add constraint projects_latlng_pair check ((lat is null) = (lng is null));
