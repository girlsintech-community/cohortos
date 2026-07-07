
CREATE OR REPLACE FUNCTION public.find_profile_by_email(_email text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT id INTO _id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(text) TO authenticated;
