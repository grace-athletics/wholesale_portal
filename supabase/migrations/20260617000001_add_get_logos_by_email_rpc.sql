-- RPC function to look up customer logos by email
-- Used by traveler generator webhook to fetch logos from Supabase Storage

CREATE OR REPLACE FUNCTION get_logos_by_email(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  logo_record json;
BEGIN
  -- Find user by email (case-insensitive)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(user_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get their latest logo record
  SELECT row_to_json(cl.*)
  INTO logo_record
  FROM client_logos cl
  WHERE cl.user_id = target_user_id
  ORDER BY cl.version DESC
  LIMIT 1;

  RETURN logo_record;
END;
$$;

-- Grant execute permission to service_role (for webhook server)
GRANT EXECUTE ON FUNCTION get_logos_by_email(text) TO service_role;

-- Also grant to authenticated users (so portal can call it if needed)
GRANT EXECUTE ON FUNCTION get_logos_by_email(text) TO authenticated;
