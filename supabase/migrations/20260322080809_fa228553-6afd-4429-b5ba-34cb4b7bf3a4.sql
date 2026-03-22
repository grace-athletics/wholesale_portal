-- Update michael's role from client to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'c277b623-f998-4d14-b7b6-d1abd4a09a08';