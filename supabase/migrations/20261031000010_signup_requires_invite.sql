-- Sign-up is only for invited emails. Supabase Auth lets anyone create an account through the public
-- sign-up endpoint; until now such an account got a session (an "authenticated" JWT) that opened nothing
-- (every policy checks is_staff()), but it still existed and the login page had no way out of it.
-- This BEFORE INSERT trigger on auth.users refuses accounts whose email has no pending staff invitation,
-- so the invite in CMS → المستخدمون is the only way an account can ever be created.
-- Supabase Auth reports the refusal to the client as "Database error saving new user"; the app maps it.

create or replace function public.auth_user_requires_invite()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.staff s where lower(s.email) = lower(new.email) and s.user_id is null) then
    raise exception 'هذا البريد غير مدعو لفريق ڤايرو' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.auth_user_requires_invite() from public, anon, authenticated;

drop trigger if exists on_auth_user_requires_invite on auth.users;
create trigger on_auth_user_requires_invite before insert on auth.users
  for each row execute function public.auth_user_requires_invite();

-- One-time cleanup: accounts created before this rule that never matched an invitation.
delete from auth.users u where not exists (select 1 from public.staff s where s.user_id = u.id);
