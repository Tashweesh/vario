-- VAIRO: helper functions, triggers, RPCs and row-level security.

-- ───────────────────────────── role helpers
create or replace function public.current_staff_role()
returns public.staff_role
language sql stable security definer set search_path = ''
as $$
  select s.role from public.staff s join public.agents a on a.id = s.agent_id
  where s.user_id = auth.uid() and a.active
$$;

create or replace function public.current_agent_id()
returns text
language sql stable security definer set search_path = ''
as $$
  select s.agent_id from public.staff s join public.agents a on a.id = s.agent_id
  where s.user_id = auth.uid() and a.active
$$;

create or replace function public.is_staff()
returns boolean language sql stable set search_path = ''
as $$ select public.current_staff_role() is not null $$;

create or replace function public.is_editor()
returns boolean language sql stable set search_path = ''
as $$ select coalesce(public.current_staff_role() in ('admin', 'editor'), false) $$;

create or replace function public.is_admin()
returns boolean language sql stable set search_path = ''
as $$ select coalesce(public.current_staff_role() = 'admin', false) $$;

-- Public "who am I" for the CMS/CRM shell.
create or replace function public.me()
returns table (agent_id text, name text, title text, img text, phone text, email text, role public.staff_role)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.name, a.title, a.img, a.phone, s.email, s.role
  from public.staff s join public.agents a on a.id = s.agent_id
  where s.user_id = auth.uid() and a.active
$$;

-- ───────────────────────────── generic triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

create trigger areas_updated before update on public.areas for each row execute function public.set_updated_at();
create trigger developers_updated before update on public.developers for each row execute function public.set_updated_at();
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();
create trigger listings_updated before update on public.listings for each row execute function public.set_updated_at();
create trigger listing_private_updated before update on public.listing_private for each row execute function public.set_updated_at();
create trigger contacts_updated before update on public.contacts for each row execute function public.set_updated_at();
create trigger site_settings_updated before update on public.site_settings for each row execute function public.set_updated_at();

create or replace function public.projects_progress_stamp()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.progress is distinct from old.progress then new.progress_updated_at = now(); end if;
  return new;
end $$;
create trigger projects_progress before update on public.projects for each row execute function public.projects_progress_stamp();

-- ───────────────────────────── staff ↔ auth linking (by email)
create or replace function public.link_staff_on_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.staff set user_id = new.id
  where lower(email) = lower(new.email) and user_id is null;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.link_staff_on_signup();

create or replace function public.link_staff_on_invite()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.user_id is null or (tg_op = 'UPDATE' and lower(new.email) <> lower(old.email)) then
    new.user_id = (select u.id from auth.users u where lower(u.email) = lower(new.email) limit 1);
  end if;
  return new;
end $$;
create trigger staff_link before insert or update of email on public.staff
  for each row execute function public.link_staff_on_invite();

-- An admin must not lock themselves (or the team) out.
create or replace function public.staff_keep_one_admin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.staff s join public.agents a on a.id = s.agent_id where s.role = 'admin' and a.active) then
    raise exception 'يجب أن يبقى مدير نظام واحد على الأقل' using errcode = 'P0001';
  end if;
  return null;
end $$;
create constraint trigger staff_one_admin after update or delete on public.staff
  deferrable initially deferred for each row execute function public.staff_keep_one_admin();
create constraint trigger agents_one_admin after update of active on public.agents
  deferrable initially deferred for each row execute function public.staff_keep_one_admin();

-- ───────────────────────────── listings
create or replace function public.listings_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.staff_role := public.current_staff_role();
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
    if r = 'agent' then
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
create trigger listings_before before insert or update on public.listings
  for each row execute function public.listings_before_write();

create or replace function public.listings_log()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  actor text := (select a.name from public.agents a where a.id = public.current_agent_id());
  lbl text;
begin
  if tg_op = 'INSERT' then
    insert into public.listing_events (listing_id, kind, label, actor_name)
    values (new.id, 'created', case when new.status = 'draft' then 'أُنشئ كمسودة' else 'أُنشئ ونُشر' end, actor);
    return null;
  end if;
  if new.status is distinct from old.status then
    lbl := case new.status when 'live' then 'نُشر' when 'draft' then 'أُعيد إلى مسودة'
                           when 'reserved' then 'حُجز' when 'sold' then 'مباع / مؤجّر' end;
    insert into public.listing_events (listing_id, kind, label, actor_name) values (new.id, 'status', lbl, actor);
  end if;
  if new.price is distinct from old.price or new.rent is distinct from old.rent then
    insert into public.listing_events (listing_id, kind, label, actor_name) values (new.id, 'price', 'تعديل السعر', actor);
  end if;
  if new.featured is distinct from old.featured then
    insert into public.listing_events (listing_id, kind, label, actor_name)
    values (new.id, 'featured', case when new.featured then 'أُضيف للمميزة' else 'أُزيل من المميزة' end, actor);
  end if;
  return null;
end $$;
create trigger listings_after after insert or update on public.listings
  for each row execute function public.listings_log();

-- Page-view counter for the public site (no read access to anything).
create or replace function public.track_listing_view(p_id text)
returns void language sql security definer set search_path = ''
as $$ update public.listings set views = views + 1 where id = p_id and status <> 'draft' $$;

-- Reorder homepage featured listings in one call (admin).
create or replace function public.set_featured_order(p_ids text[])
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 8 then raise exception 'حتى 8 عقارات مميزة فقط' using errcode = '22023'; end if;
  update public.listings set featured = false, featured_rank = null where featured and not (id = any(p_ids));
  update public.listings l set featured = true, featured_rank = o.ord
  from unnest(p_ids) with ordinality as o(id, ord) where l.id = o.id;
end $$;

-- ───────────────────────────── CRM triggers
create or replace function public.activities_touch_contact()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.contacts set
    last_activity_at = now(),
    first_response_at = case when first_response_at is null and new.kind in ('note', 'call') then now() else first_response_at end
  where id = new.contact_id;
  return null;
end $$;
create trigger activities_touch after insert on public.activities
  for each row execute function public.activities_touch_contact();

create or replace function public.contacts_stage_stamp()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    new.last_activity_at := now();
    if new.stage = 'closed' then new.closed_at := now(); else new.closed_at := null; end if;
    if new.stage <> 'new' and new.first_response_at is null then new.first_response_at := now(); end if;
  end if;
  return new;
end $$;
create trigger contacts_stage before update on public.contacts
  for each row execute function public.contacts_stage_stamp();

-- ───────────────────────────── public lead capture
-- Every form / WhatsApp / booking on the public site lands here and becomes a CRM contact.
create or replace function public.submit_lead(
  p_name text,
  p_phone text,
  p_kind text default 'contact',
  p_message text default null,
  p_listing_ids text[] default '{}',
  p_source text default 'الموقع',
  p_budget integer default null,
  p_deal public.deal_type default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_contact uuid;
  v_agent text;
  v_ids text[];
  v_label text;
begin
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'الاسم مطلوب' using errcode = '22023';
  end if;
  if length(v_digits) < 7 or length(v_digits) > 15 then
    raise exception 'رقم الهاتف غير صحيح' using errcode = '22023';
  end if;
  if p_kind not in ('contact', 'owner', 'viewing', 'brochure', 'tour', 'whatsapp', 'invest', 'match') then
    raise exception 'نوع الطلب غير معروف' using errcode = '22023';
  end if;
  if p_source not in ('الموقع', 'واتساب') then
    raise exception 'مصدر غير معروف' using errcode = '22023';
  end if;
  if length(coalesce(p_message, '')) > 2000 then
    raise exception 'الرسالة طويلة جداً' using errcode = '22023';
  end if;

  -- only real, public listings can be referenced
  select coalesce(array_agg(id), '{}') into v_ids from public.listings
  where id = any(coalesce(p_listing_ids, '{}')) and status <> 'draft';

  -- basic flood protection per phone number
  if (select count(*) from public.activities a join public.contacts c on c.id = a.contact_id
      where regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_digits
        and a.kind = 'web' and a.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'طلبات كثيرة، حاول بعد قليل' using errcode = '54000';
  end if;

  select id into v_contact from public.contacts
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits
  order by created_at desc limit 1;

  if v_contact is null then
    select agent_id into v_agent from public.listings where id = any(v_ids) and agent_id is not null limit 1;
    insert into public.contacts (name, phone, source, stage, score, deal, agent_id, budget, note)
    values (v_name, v_phone, p_source, 'new', 'warm', p_deal, v_agent, p_budget, nullif(btrim(coalesce(p_message, '')), ''))
    returning id into v_contact;
  else
    update public.contacts set
      budget = coalesce(p_budget, budget),
      deal = coalesce(p_deal, deal),
      note = coalesce(nullif(btrim(coalesce(p_message, '')), ''), note),
      -- a closed/lost lead coming back is a new opportunity
      stage = case when stage = 'closed' then 'new' else stage end
    where id = v_contact;
  end if;

  insert into public.contact_listings (contact_id, listing_id)
  select v_contact, unnest(v_ids) on conflict do nothing;

  v_label := case p_kind
    when 'contact' then 'طلب تواصل' when 'owner' then 'مالك يريد عرض عقاره'
    when 'viewing' then 'طلب معاينة' when 'brochure' then 'طلب الكتيّب وقائمة الأسعار'
    when 'tour' then 'طلب جولة معاينات' when 'whatsapp' then 'تواصل عبر واتساب'
    when 'invest' then 'طلب جلسة استثمار' when 'match' then 'نتائج ڤايرو ماتش' end;

  insert into public.activities (contact_id, kind, body)
  values (v_contact, 'web', v_label
    || case when cardinality(v_ids) > 0 then ' — ' || array_to_string(v_ids, '، ') else '' end
    || case when nullif(btrim(coalesce(p_message, '')), '') is not null then E'\n' || btrim(p_message) else '' end);

  update public.listings set leads = leads + 1 where id = any(v_ids);
  return v_contact;
end $$;

-- ───────────────────────────── grants
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on function public.submit_lead from public;
grant execute on function public.submit_lead to anon, authenticated;
grant execute on function public.track_listing_view(text) to anon, authenticated;
grant execute on function public.me() to authenticated;
grant execute on function public.set_featured_order(text[]) to authenticated;

-- ───────────────────────────── row-level security
alter table public.areas enable row level security;
alter table public.developers enable row level security;
alter table public.projects enable row level security;
alter table public.project_units enable row level security;
alter table public.agents enable row level security;
alter table public.staff enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.listing_private enable row level security;
alter table public.listing_events enable row level security;
alter table public.site_settings enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_listings enable row level security;
alter table public.activities enable row level security;
alter table public.viewings enable row level security;

-- content: everyone reads, editors write
create policy "areas read" on public.areas for select using (true);
create policy "areas write" on public.areas for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "developers read" on public.developers for select using (true);
create policy "developers write" on public.developers for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "projects read" on public.projects for select using (published or public.is_staff());
create policy "projects write" on public.projects for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "units read" on public.project_units for select using (true);
create policy "units write" on public.project_units for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- agents: public profile only when the "show agent" setting is on
create policy "agents read" on public.agents for select using (
  public.is_staff() or (active and coalesce((select show_agent from public.site_settings where id = 1), true)));
create policy "agents write" on public.agents for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read" on public.staff for select to authenticated using (public.is_staff());
create policy "staff write" on public.staff for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- listings
create policy "listings read" on public.listings for select using (status <> 'draft' or public.is_staff());
create policy "listings insert" on public.listings for insert to authenticated with check (
  public.is_editor() or (public.current_staff_role() = 'agent' and agent_id = public.current_agent_id()));
create policy "listings update" on public.listings for update to authenticated
  using (public.is_editor() or (public.current_staff_role() = 'agent' and agent_id = public.current_agent_id()))
  with check (public.is_editor() or (public.current_staff_role() = 'agent' and agent_id = public.current_agent_id()));
create policy "listings delete" on public.listings for delete to authenticated using (public.is_editor());

create or replace function public.can_edit_listing(p_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_editor() or exists (
    select 1 from public.listings l where l.id = p_id
      and public.current_staff_role() = 'agent' and l.agent_id = public.current_agent_id())
$$;

create policy "media read" on public.listing_media for select using (
  public.is_staff() or exists (select 1 from public.listings l where l.id = listing_id and l.status <> 'draft'));
create policy "media write" on public.listing_media for all to authenticated
  using (public.can_edit_listing(listing_id)) with check (public.can_edit_listing(listing_id));
create policy "private rw" on public.listing_private for all to authenticated
  using (public.can_edit_listing(listing_id)) with check (public.can_edit_listing(listing_id));
create policy "events read" on public.listing_events for select to authenticated using (public.is_staff());

-- settings
create policy "settings read" on public.site_settings for select using (true);
create policy "settings write" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- CRM: whole team
create policy "contacts staff" on public.contacts for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "contact_listings staff" on public.contact_listings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "activities staff" on public.activities for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "viewings staff" on public.viewings for all to authenticated using (public.is_staff()) with check (public.is_staff());
