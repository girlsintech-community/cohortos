-- Migration: Challenges, Discussion Replies, and Auth Upgrades

-- 1. Add girlsleadintech@gmail.com to allowed_emails
INSERT INTO public.allowed_emails (email)
VALUES ('girlsleadintech@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 2. Update grant_admin_for_founder_email trigger function
CREATE OR REPLACE FUNCTION public.grant_admin_for_founder_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('girlsleadingtech@gmail.com', 'girlsleadintech@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update profile primary_role to 'admin'
    UPDATE public.profiles SET primary_role = 'admin' WHERE id = NEW.id;

    -- Remove 'mentee' user_role if it was assigned by handle_new_user
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'mentee';
  END IF;
  RETURN NEW;
END;
$$;

-- Grant admin now to girlsleadintech@gmail.com if that user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email = 'girlsleadintech@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update profiles.primary_role for existing user if exists
UPDATE public.profiles p
SET primary_role = 'admin'::public.app_role
FROM auth.users u
WHERE u.id = p.id AND u.email = 'girlsleadintech@gmail.com';

-- Remove mentee role if exists for the user
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'girlsleadintech@gmail.com')
  AND role = 'mentee';

-- 3. Add UPDATE policy on discussion_replies for authors
CREATE POLICY "Author update reply" ON public.discussion_replies
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 4. Seed Striver's A2Z DSA Sheet resource
INSERT INTO public.resources (title, description, url, category, is_active)
SELECT 'Striver''s A2Z DSA Sheet',
       'Learn Data Structures and Algorithms from A to Z with this comprehensive curated sheet.',
       'https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z',
       'DSA Sheets',
       TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.resources WHERE url = 'https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z'
);

-- 5. Drop trigger awarding XP automatically on challenge submission
DROP TRIGGER IF EXISTS trg_award_xp_on_submission ON public.challenge_submissions;

-- 6. Add feedback and screenshot_url to challenge_submissions
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- 7. Add UPDATE policy on challenge_submissions for users to resubmit rejected solutions
CREATE POLICY "User update own rejected submission" ON public.challenge_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'rejected')
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');

-- 8. Create challenge-screenshots storage bucket and add policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-screenshots', 'challenge-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated read challenge-screenshots" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'challenge-screenshots');

CREATE POLICY "authenticated upload challenge-screenshots own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'challenge-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "authenticated delete own challenge-screenshots" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'challenge-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
