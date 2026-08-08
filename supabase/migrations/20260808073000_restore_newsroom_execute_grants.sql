-- Migration 20260804163719 over-revoked EXECUTE on these SECURITY DEFINER
-- helpers, removing it from `authenticated` as well as `anon`/`PUBLIC`. Since
-- RLS policies evaluate under the querying role's own privileges, this broke
-- every insert/update/select gated by is_newsroom()/can_publish()/has_role()
-- for real newsroom users (e.g. "permission denied for function is_newsroom"
-- when creating an article). These functions are self-scoped
-- (`_user_id = auth.uid()`), so granting EXECUTE back to `authenticated` only
-- lets a user check their own roles, not anyone else's.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_newsroom(uuid) TO authenticated;
