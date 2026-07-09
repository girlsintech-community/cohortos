-- Migration: Fix RLS recursion, resource insertion, challenge submission updates

-- 1. Fix is_pod_member infinite RLS recursion by changing SQL to plpgsql so it cannot be inlined
CREATE OR REPLACE FUNCTION public.is_pod_member(_pod_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.pod_members WHERE pod_id = _pod_id AND user_id = _user_id);
END; $$;

-- 2. Grant INSERT privilege on public.resources to authenticated users
GRANT INSERT ON public.resources TO authenticated;

-- 3. Relax RLS policy for challenge submissions to allow UPDATE while status is 'submitted' or 'rejected'
DROP POLICY IF EXISTS "User update own rejected submission" ON public.challenge_submissions;
CREATE POLICY "User update own rejected submission" ON public.challenge_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('submitted', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
