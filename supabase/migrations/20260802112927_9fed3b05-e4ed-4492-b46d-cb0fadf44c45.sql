-- 1. Hide author private contact fields from public/authenticated reads
REVOKE SELECT ON public.authors FROM anon, authenticated;
GRANT SELECT (id, user_id, slug, display_name, role_label, bio, avatar_url, city, created_at)
  ON public.authors TO anon, authenticated;
GRANT ALL ON public.authors TO service_role;

-- 2. Harden SECURITY DEFINER role helpers: self-scoped only, not callable by anon
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_publish(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','directeur_publication','redacteur_chef')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_newsroom(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_publish(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_newsroom(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_publish(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_newsroom(uuid) TO authenticated, service_role;