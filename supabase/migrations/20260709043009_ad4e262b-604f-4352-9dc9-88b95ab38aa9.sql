
-- 1. Add screenshot_url to challenge_submissions
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS screenshot_url text;

-- 2. Add image_url / link_url to pod_messages
ALTER TABLE public.pod_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.pod_messages ADD COLUMN IF NOT EXISTS link_url text;

-- 3. Expand community_reactions target_type check to include 'feed_post' and 'post'
ALTER TABLE public.community_reactions DROP CONSTRAINT IF EXISTS community_reactions_target_type_check;
ALTER TABLE public.community_reactions ADD CONSTRAINT community_reactions_target_type_check
  CHECK (target_type = ANY (ARRAY['post'::text,'feed_post'::text,'post_comment'::text,'discussion'::text,'discussion_reply'::text]));

-- 4. Allow authenticated users to suggest resources (must be inactive; only admin approves/activates)
DROP POLICY IF EXISTS "Users can suggest resources" ON public.resources;
CREATE POLICY "Users can suggest resources" ON public.resources
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_active = false);

-- 5. Create feedback_reports table
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bug_report','feedback')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback_reports TO authenticated;
GRANT ALL ON public.feedback_reports TO service_role;
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users submit own feedback" ON public.feedback_reports;
CREATE POLICY "Users submit own feedback" ON public.feedback_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feedback" ON public.feedback_reports;
CREATE POLICY "Users read own feedback" ON public.feedback_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin update feedback" ON public.feedback_reports;
CREATE POLICY "Admin update feedback" ON public.feedback_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
