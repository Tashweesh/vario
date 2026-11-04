-- Area rent (areas.rent, USD per m² per month) is derived automatically from the rent listings currently on the
-- market in that area (status live/reserved, with a visible rent and a size): the average of monthly rent ÷ size,
-- to one decimal. Same rule as the sale price (20261030000008_area_ppm_auto.sql). Rent listings keep their monthly
-- rent in listings.rent (listings_before_write nulls `price` for rent rows), so the trigger now also watches `rent`
-- and its function refreshes both figures for the affected area(s). Areas with no qualifying listing keep their value.

create or replace function public.area_recalc_rent(p_area text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v numeric;
begin
  if p_area is null then return; end if;
  select round(avg(l.rent::numeric / l.size), 1) into v
  from public.listings l
  where l.area_id = p_area and l.deal = 'rent' and l.status in ('live', 'reserved')
    and coalesce(l.rent, 0) > 0 and coalesce(l.size, 0) > 0 and not l.hide_price;
  if v is not null then
    update public.areas set rent = v where id = p_area and rent is distinct from v;
  end if;
end $$;

create or replace function public.listings_area_ppm()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.area_recalc_ppm(new.area_id);
    perform public.area_recalc_rent(new.area_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.area_id is distinct from new.area_id) then
    perform public.area_recalc_ppm(old.area_id);
    perform public.area_recalc_rent(old.area_id);
  end if;
  return null;
end $$;

-- recreate the trigger so a change to the monthly rent also recomputes the area figures
drop trigger if exists listings_area_ppm on public.listings;
create trigger listings_area_ppm
  after insert or delete or update of price, rent, size, status, deal, area_id, hide_price on public.listings
  for each row execute function public.listings_area_ppm();

-- backfill every area from the rent listings that exist today
select public.area_recalc_rent(id) from public.areas;
