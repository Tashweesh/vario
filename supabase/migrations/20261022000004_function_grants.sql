-- VAIRO: limit which functions are callable over the API.
-- Postgres grants EXECUTE to PUBLIC by default. Trigger functions never need to be called directly,
-- and admin/staff RPCs are not for anonymous visitors. The role helpers (current_staff_role, is_staff, …)
-- stay executable because row-level security policies call them as the requesting user; they only
-- ever describe the caller themselves.
revoke execute on function
  public.set_updated_at(), public.projects_progress_stamp(), public.link_staff_on_signup(), public.link_staff_on_invite(),
  public.staff_keep_one_admin(), public.listings_before_write(), public.listings_log(), public.activities_touch_contact(),
  public.contacts_stage_stamp()
from public, anon, authenticated;

revoke execute on function public.me(), public.set_featured_order(text[]) from public, anon;
grant execute on function public.me(), public.set_featured_order(text[]) to authenticated;

-- intentionally public: lead capture and the page-view counter
revoke execute on function public.track_listing_view(text) from public;
grant execute on function public.track_listing_view(text) to anon, authenticated;
