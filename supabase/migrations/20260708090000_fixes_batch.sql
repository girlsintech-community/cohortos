-- Migration: Batch fixes for reactions, pods, challenges, auth
-- 1. Update community_reactions target_type CHECK to include 'feed_post'
ALTER TABLE public.community_reactions DROP CONSTRAINT IF EXISTS community_reactions_target_type_check;
ALTER TABLE public.community_reactions ADD CONSTRAINT community_reactions_target_type_check
  CHECK (target_type IN ('post_comment','discussion_reply','discussion','feed_post'));

-- 2. Add image_url and link_url columns to pod_messages
ALTER TABLE public.pod_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 3. Add UPDATE RLS policy on pod_messages for authors
DROP POLICY IF EXISTS "Author update own pod message" ON public.pod_messages;
CREATE POLICY "Author update own pod message" ON public.pod_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 4. Update find_profile_by_email to be more robust
-- Now also looks up by profiles table joining with auth.users
CREATE OR REPLACE FUNCTION public.find_profile_by_email(_email text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, auth AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.primary_role IN ('mentor','team_member','admin'))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- First try auth.users
  SELECT id INTO _id FROM auth.users WHERE lower(trim(email)) = lower(trim(_email)) LIMIT 1;
  -- If found in auth.users, verify there's a profile row
  IF _id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _id) THEN
      RETURN _id;
    END IF;
  END IF;
  RETURN _id;
END; $$;

-- 5. Create pod-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pod-images', 'pod-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated read pod-images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'pod-images');

CREATE POLICY "authenticated upload pod-images own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pod-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "authenticated delete own pod-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pod-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Ensure feedback and screenshot_url columns exist on challenge_submissions
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- 7. Allow admin UPDATE on challenge_submissions (for approving/rejecting with feedback)
DROP POLICY IF EXISTS "Admin update submissions" ON public.challenge_submissions;
CREATE POLICY "Admin update submissions" ON public.challenge_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
