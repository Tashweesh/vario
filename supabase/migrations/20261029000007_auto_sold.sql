-- Auto-tag listings as sold / rented.
-- When a CRM contact is closed as "won", every listing linked to that contact is marked `sold`
-- (the site shows it as «مباع» for sale listings and «مؤجّر» for rentals) and a system activity is logged.
-- The automatic update bypasses the "agents may only save drafts" rule through a transaction-local flag that is
-- set only inside the trigger, so an agent closing their own deal does not hit the publish restriction.

create or replace function public.listings_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.staff_role := public.current_staff_role();
  auto boolean := coalesce(current_setting('vairo.auto_close', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    if new.id is null or new.id = '' then
      new.id := case when new.deal = 'rent'
        then 'VR-' || nextval('public.listing_rent_seq')
        else 'VS-' || nextval('public.listing_sale_seq') end;
    end if;
    if r = 'agent' then
      new.agent_id := coalesce(new.agent_id, public.current_agent_id());
      if new.status <> 'draft' then
        raise exception 'الوسيط يحفظ كمسودة فقط — النشر لمحرر المحتوى' using errcode = '42501';
      end if;
      new.featured := false;
    end if;
    new.status_changed_at := now();
  else
    if r = 'agent' and not auto then
      if new.status is distinct from old.status and new.status <> 'draft' then
        raise exception 'الوسيط يحفظ كمسودة فقط — النشر لمحرر المحتوى' using errcode = '42501';
      end if;
      if new.featured is distinct from old.featured or new.featured_rank is distinct from old.featured_rank then
        raise exception 'تمييز العقار من صلاحية محرر المحتوى' using errcode = '42501';
      end if;
      if new.agent_id is distinct from old.agent_id then
        raise exception 'لا يمكن للوسيط تغيير الوسيط المسؤول' using errcode = '42501';
      end if;
    end if;
    if new.status is distinct from old.status then new.status_changed_at := now(); end if;
    if new.deal = 'sale' then new.rent := null; new.furnishing := null; new.deposit := null; new.available := null; end if;
    if new.deal = 'rent' then new.price := null; new.payment := null; new.plan_source := null; end if;
  end if;
  return new;
end $$;

create or replace function public.contacts_close_listings()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  lid text;
  lbl text;
begin
  if new.stage = 'closed' and new.score = 'won'
     and (old.stage is distinct from 'closed' or old.score is distinct from 'won') then
    perform set_config('vairo.auto_close', '1', true);
    for lid in
      select cl.listing_id from public.contact_listings cl
      join public.listings l on l.id = cl.listing_id
      where cl.contact_id = new.id and l.status <> 'sold'
    loop
      update public.listings set status = 'sold' where id = lid;
      select case when deal = 'rent' then 'مؤجّر' else 'مباع' end into lbl from public.listings where id = lid;
      insert into public.activities (contact_id, kind, body, agent_id)
      values (new.id, 'system', 'وُسم العقار ' || lid || ' تلقائياً كـ«' || lbl || '» بعد إغلاق الصفقة', new.agent_id);
    end loop;
    perform set_config('vairo.auto_close', '', true);
  end if;
  return new;
end $$;

drop trigger if exists contacts_close_listings on public.contacts;
create trigger contacts_close_listings after update of stage, score on public.contacts
  for each row execute function public.contacts_close_listings();
