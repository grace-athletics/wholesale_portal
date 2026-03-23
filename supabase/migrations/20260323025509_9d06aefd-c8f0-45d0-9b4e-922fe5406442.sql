CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _sub_status text;
BEGIN
  IF NEW.email IN ('michael@myglovebrand.com', 'kevin@myglovebrand.com') THEN
    _role := 'admin';
    _sub_status := 'active';
  ELSE
    _role := 'client';
    _sub_status := 'inactive';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, company_name, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    _sub_status
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;