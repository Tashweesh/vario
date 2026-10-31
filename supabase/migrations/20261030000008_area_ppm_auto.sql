-- Area buying price (areas.ppm, USD per m²) is derived automatically from the sale listings currently on the market
-- in that area (status live/reserved, with a visible price and a size): the average of price ÷ size, rounded.
-- It is recomputed whenever a listing is inserted, deleted, or has its price, size, status, deal, area or
-- hide_price changed. Areas with no qualifying listing keep their last value.

create or replace function public.area_recalc_ppm(p_area text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v integer;
begin
  if p_area is null then return; end if;
  select round(avg(l.price::numeric / l.size))::integer into v
  from public.listings l
  where l.area_id = p_area and l.deal = 'sale' and l.status in ('live', 'reserved')
    and coalesce(l.price, 0) > 0 and coalesce(l.size, 0) > 0 and not l.hide_price;
  if v is not null then
    update public.areas set ppm = v where id = p_area and ppm is distinct from v;
  end if;
end $$;

create or replace function public.listings_area_ppm()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform public.area_recalc_ppm(new.area_id); end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.area_id is distinct from new.area_id) then perform public.area_recalc_ppm(old.area_id); end if;
  return null;
end $$;

drop trigger if exists listings_area_ppm on public.listings;
create trigger listings_area_ppm
  after insert or delete or update of price, size, status, deal, area_id, hide_price on public.listings
  for each row execute function public.listings_area_ppm();

-- backfill every area from the listings that exist today
select public.area_recalc_ppm(id) from public.areas;
