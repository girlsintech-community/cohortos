
-- 1. Post attachments
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 2. Founder admin: girlsleadingtech@gmail.com (replaces cohortos@gmail.com)
CREATE OR REPLACE FUNCTION public.grant_admin_for_founder_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'girlsleadingtech@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Grant admin now if that user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email = 'girlsleadingtech@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Additional XP triggers for engagement
CREATE OR REPLACE FUNCTION public.on_like_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 1, 'like_given', jsonb_build_object('post_id', NEW.post_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_xp_on_like ON public.post_likes;
CREATE TRIGGER trg_award_xp_on_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.on_like_created();

CREATE OR REPLACE FUNCTION public.on_discussion_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 5, 'discussion_created', jsonb_build_object('discussion_id', NEW.id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_xp_on_discussion ON public.discussions;
CREATE TRIGGER trg_award_xp_on_discussion
AFTER INSERT ON public.discussions
FOR EACH ROW EXECUTE FUNCTION public.on_discussion_created();

CREATE OR REPLACE FUNCTION public.on_discussion_reply_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 3, 'discussion_reply', jsonb_build_object('reply_id', NEW.id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_xp_on_disc_reply ON public.discussion_replies;
CREATE TRIGGER trg_award_xp_on_disc_reply
AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.on_discussion_reply_created();

CREATE OR REPLACE FUNCTION public.on_submission_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 2, 'challenge_submitted', jsonb_build_object('challenge_id', NEW.challenge_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_xp_on_submission ON public.challenge_submissions;
CREATE TRIGGER trg_award_xp_on_submission
AFTER INSERT ON public.challenge_submissions
FOR EACH ROW EXECUTE FUNCTION public.on_submission_created();
