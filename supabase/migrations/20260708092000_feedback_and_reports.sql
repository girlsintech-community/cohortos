-- Migration: Feedback & Reports Table and RLS
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bug_report', 'feedback')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_reports TO authenticated;
GRANT ALL ON public.feedback_reports TO service_role;
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create feedback reports as themselves" ON public.feedback_reports;
CREATE POLICY "Users create feedback reports as themselves"
  ON public.feedback_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read feedback reports" ON public.feedback_reports;
CREATE POLICY "Admins read feedback reports"
  ON public.feedback_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete feedback reports" ON public.feedback_reports;
CREATE POLICY "Admins delete feedback reports"
  ON public.feedback_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
