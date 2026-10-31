-- Admins can remove a team member for good: the agent profile, the staff row (login link + role) and the
-- auth account are deleted in one call, so the person can no longer sign in. Their listings, contacts,
-- activities and viewings are kept and become unassigned (the agent_id foreign keys are "on delete set null").
-- Deleting the auth user needs the postgres owner, which is why this is a security-definer RPC and not RLS.

create or replace function public.delete_staff_user(p_agent_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  if p_agent_id = public.current_agent_id() then raise exception 'لا تگدر تحذف حسابك' using errcode = '22023'; end if;
  if not exists (select 1 from public.agents a where a.id = p_agent_id) then raise exception 'المستخدم غير موجود' using errcode = 'P0002'; end if;

  select s.user_id into v_user from public.staff s where s.agent_id = p_agent_id;
  -- cascades to staff; the staff_one_admin constraint trigger still refuses to remove the last active admin
  delete from public.agents where id = p_agent_id;
  if v_user is not null then delete from auth.users where id = v_user; end if;
end $$;

revoke execute on function public.delete_staff_user(text) from public, anon;
grant execute on function public.delete_staff_user(text) to authenticated;
