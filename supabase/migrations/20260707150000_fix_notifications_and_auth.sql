-- 1. Correct the typo for girlsleadingtech@gmail.com and ensure it's in allowed_emails
INSERT INTO public.allowed_emails (email)
VALUES ('girlsleadingtech@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Also fix the typoed one if it exists or just leave it, but ensure the correct one is an admin
DO $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = 'girlsleadingtech@gmail.com';
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles SET primary_role = 'admin' WHERE id = _user_id;
  END IF;
END $$;

-- 2. Add SECURITY DEFINER function to check if email is allowed (accessible by anon)
CREATE OR REPLACE FUNCTION public.check_if_email_is_allowed(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE lower(email) = lower(trim(_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_if_email_is_allowed(TEXT) TO anon, authenticated;

-- 3. Fix notification triggers to be more robust (COALESCE for title/body and handle NULLs)

CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _post_author_id UUID;
  _liker_name TEXT;
BEGIN
  SELECT author_id INTO _post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if post not found or it's a self-like
  IF _post_author_id IS NULL OR _post_author_id = NEW.user_id THEN 
    RETURN NEW; 
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO _liker_name FROM public.profiles WHERE id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _post_author_id,
    'like',
    _liker_name || ' liked your post',
    NULL,
    '/feed'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _post_author_id UUID;
  _commenter_name TEXT;
BEGIN
  SELECT author_id INTO _post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  IF _post_author_id IS NULL OR _post_author_id = NEW.author_id THEN 
    RETURN NEW; 
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO _commenter_name FROM public.profiles WHERE id = NEW.author_id;
  
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _post_author_id,
    'comment',
    _commenter_name || ' replied to your post',
    LEFT(NEW.content, 100),
    '/feed'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_discussion_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _disc_author_id UUID;
  _replier_name TEXT;
BEGIN
  SELECT author_id INTO _disc_author_id FROM public.discussions WHERE id = NEW.discussion_id;
  
  IF _disc_author_id IS NULL OR _disc_author_id = NEW.author_id THEN 
    RETURN NEW; 
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO _replier_name FROM public.profiles WHERE id = NEW.author_id;
  
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _disc_author_id,
    'reply',
    _replier_name || ' replied to your discussion',
    LEFT(NEW.body, 100),
    '/discussions'
  );
  RETURN NEW;
END;
$$;

-- 4. Add notification for challenge approval
CREATE OR REPLACE FUNCTION public.notify_on_challenge_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'challenge_approved',
      'Challenge Approved! 🎉',
      'Your submission has been reviewed and approved. XP awarded!',
      '/challenges'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_challenge_approval ON public.challenge_submissions;
CREATE TRIGGER trg_notify_on_challenge_approval
  AFTER UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_challenge_approval();

-- 5. Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

