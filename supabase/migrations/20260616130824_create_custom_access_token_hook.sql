-- Allow the auth subsystem to read memberships during token issuance.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.memberships TO supabase_auth_admin;

-- Called by Supabase Auth on every login and token refresh.
-- Reads the caller's membership and injects org_id, branch_id, and role
-- into app_metadata so the NestJS AuthGuard can trust them as signed claims.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id    uuid;
  v_branch_id uuid;
  v_role      text;
  claims      jsonb;
BEGIN
  SELECT org_id, branch_id, role
    INTO v_org_id, v_branch_id, v_role
    FROM public.memberships
   WHERE user_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF v_org_id IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims -> 'app_metadata', '{}'::jsonb) || jsonb_build_object(
        'org_id',    v_org_id,
        'branch_id', v_branch_id,
        'role',      v_role
      )
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
