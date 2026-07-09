-- 1. Fix feedback_reports relationship to profiles (PostgREST joining)
ALTER TABLE public.feedback_reports
  DROP CONSTRAINT IF EXISTS feedback_reports_user_id_fkey;

ALTER TABLE public.feedback_reports
  ADD CONSTRAINT feedback_reports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Ensure authenticated users have appropriate table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_todos TO authenticated;

-- 3. Fix feedback_reports DELETE policy for admins
DROP POLICY IF EXISTS "Admin delete feedback" ON public.feedback_reports;
CREATE POLICY "Admin delete feedback" ON public.feedback_reports
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Fix challenge_submissions SELECT policy to use public.has_role
DROP POLICY IF EXISTS "Read own or admin submissions" ON public.challenge_submissions;
CREATE POLICY "Read own or admin submissions" ON public.challenge_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
