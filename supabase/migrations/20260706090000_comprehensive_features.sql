-- ============================================================
-- COMPREHENSIVE MIGRATION: All new features
-- ============================================================

-- ============ 1. STREAK UPDATE LOGIC ============
-- Trigger on xp_events to update streak when user earns XP
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last DATE;
  _today DATE := CURRENT_DATE;
BEGIN
  SELECT last_active_date INTO _last FROM public.profiles WHERE id = NEW.user_id;

  IF _last IS NULL OR _last < _today - INTERVAL '1 day' THEN
    -- First activity ever or gap > 1 day: reset streak
    UPDATE public.profiles
      SET streak = 1, last_active_date = _today
      WHERE id = NEW.user_id;
  ELSIF _last = _today - INTERVAL '1 day' THEN
    -- Consecutive day: increment streak
    UPDATE public.profiles
      SET streak = streak + 1, last_active_date = _today
      WHERE id = NEW.user_id;
  END IF;
  -- If _last = _today, do nothing (already active today)

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_streak_on_xp ON public.xp_events;
CREATE TRIGGER trg_update_streak_on_xp
  AFTER INSERT ON public.xp_events
  FOR EACH ROW EXECUTE FUNCTION public.update_user_streak();

REVOKE EXECUTE ON FUNCTION public.update_user_streak() FROM PUBLIC, anon, authenticated;

-- ============ 2. ALLOWED EMAILS ============
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

GRANT SELECT ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can check allowed emails"
  ON public.allowed_emails FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage allowed emails"
  ON public.allowed_emails FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed allowed emails
INSERT INTO public.allowed_emails (email) VALUES
  ('tavisshiksjjha@gmail.com'),
  ('ankitha4202@gmail.com'),
  ('aakritiarya2005@gmail.com'),
  ('pratikshakhare042006@gmail.com'),
  ('shaifalycgc15@gmail.com'),
  ('bhavnichhabra2006@gmail.com'),
  ('rhythmaroravips@gmail.com'),
  ('jsukrutha1157@gmail.com'),
  ('suhanigarg740@gmail.com'),
  ('tejashwanimishra43@gmail.com'),
  ('nixi.krishna@gmail.com'),
  ('recruit.ishasinghal@gmail.com'),
  ('sruthir28122gmail.com'),
  ('akshitatyagi04@gmail.com'),
  ('manik23265@gmail.com'),
  ('girlsleadingtech@gmail.com'),
  ('official.movingstar@gmail.com'),
  ('aadya.agro20@gmail.com'),
  ('aarushiaaryan2007@gmail.com'),
  ('aditid092@gmail.com'),
  ('akshithasriram54@gmail.com'),
  ('as7567112@gmail.com'),
  ('ananyasingh.4526@gmail.com'),
  ('anuja3327@gmail.com'),
  ('anushkakar06@gmail.com'),
  ('anushkasharan05@gmail.com'),
  ('archiaggarwal26@gmail.com'),
  ('archita09agrawal@gmail.com'),
  ('asrithakovvuri17@gmail.com'),
  ('aurosikhakanungo@gmail.com'),
  ('daisyknp11517@gmail.com'),
  ('gowrinandab29@gmail.com'),
  ('yogabeeram@gmail.com'),
  ('bhavyakumar.2506@gmail.com'),
  ('brahminiseelam@gmail.com'),
  ('celinaprajapati08@gmail.com'),
  ('chhavimishra.1729@gmail.com'),
  ('debasmitapal2005@gmail.com'),
  ('divyanshi4840@gmail.com'),
  ('diyavarghese20june@gmail.com'),
  ('saini.dia333@gmail.com'),
  ('nithyagoudelikatti@gmail.com'),
  ('afrajamaludeen2007@gmail.com'),
  ('raiharshita0001@gmail.com'),
  ('ig.valiente09@gmail.com'),
  ('jahnavibasam545@gmail.com'),
  ('kajalkap098@gmail.com'),
  ('dillicv04@gmail.com'),
  ('kavyasreeb355@gmail.com'),
  ('khushitiwari1237@gmail.com'),
  ('khushirajput1608@gmail.com'),
  ('khushii.sgg@gmail.com'),
  ('kinnaridodiya939@gmail.com'),
  ('kollavineesha@gmail.com'),
  ('konchada10082007@gmail.com'),
  ('jkratika8@gmail.com'),
  ('kpriyars0028@gmail.com'),
  ('bashitha2007ksheerasagar@gmail.com'),
  ('uppalapatikusuma74@gmail.com'),
  ('raparthilakshitha@gmail.com'),
  ('pslavanya2202@gmail.com'),
  ('mahimasenthil6@gmail.com'),
  ('manasimandal0305@gmail.com'),
  ('ishasangwan511@gmail.com'),
  ('smeenakshi1308@gmail.com'),
  ('monighamanoharan2006@gmail.com'),
  ('monikay7084@gmail.com'),
  ('mumtazf762@gmail.com'),
  ('najmashanaaz@gmail.com'),
  ('navyakhurana.art@gmail.com'),
  ('niharikahaval1318@gmail.com'),
  ('nishakaram99@gmail.com'),
  ('guptanishi9520@gmail.com'),
  ('pamini2006@gmail.com'),
  ('sandhyapalla42@gmail.com'),
  ('parwathijayaram1@gmail.com'),
  ('prastuteeborah986@gmail.com'),
  ('pratisthajais1903@gmail.com'),
  ('purbalighosh8@gmail.com'),
  ('purvijain2708@gmail.com'),
  ('nijhara16@gmial.com'),
  ('radhikaaaguptaaa25@gmail.com'),
  ('rahmakhan2022@gmail.com'),
  ('mukhu.kumari84@gmail.com'),
  ('rishima2512@gmail.com'),
  ('ritisha2935@gmail.com'),
  ('rohitak.srimayee@gmail.com'),
  ('ruhanika2006@gmail.com'),
  ('spandana200506@gmail.com'),
  ('sairishitamanne24@gmail.com'),
  ('saishaverma0512@gmail.com'),
  ('sakshigagwani@gmail.com'),
  ('salonis.edu1@gmail.com'),
  ('dbrushstokes@gmail.com'),
  ('jainsanvi02@gmail.com'),
  ('shruti070107@gmail.com'),
  ('simranbali2006@gmail.com'),
  ('smita.bhoine01@gmail.com'),
  ('snehanair486@gmail.com'),
  ('sreejanair2801@gmail.com'),
  ('kmkp.suba@gmail.com'),
  ('mahajansugandh3@gmail.com'),
  ('jangirsunita864@gmail.com'),
  ('sushi1901sb@gmail.com'),
  ('paulsuranjana64@gmail.com'),
  ('rathswastideepa@gmail.com'),
  ('tanisha092015@gmail.com'),
  ('tanuchauhan25710@gmail.com'),
  ('tejaswinipolineni2709@gmail.com'),
  ('twinkle141106@gmail.com'),
  ('unnatii.joshii@gmail.com'),
  ('unnishasen2006@gmail.com'),
  ('khandelwalurvashi1304@gmail.com'),
  ('sujithraasudhakar02@gmail.com'),
  ('vaagishathakur@gmail.com'),
  ('vaishnavi.khari2006@gmail.com'),
  ('vani.verma018@gmail.com'),
  ('pandeyvanshika82@gmail.com'),
  ('vanshikad959@gmail.com'),
  ('singhvarnika840gmail.com'),
  ('vijayshreeparakh7@gmail.com'),
  ('moulikavinjamuri@gmail.com'),
  ('vasanthivuppala890@gmail.com'),
  ('yamininarayanan2007@gmail.com'),
  ('momaashi05@gmail.com'),
  ('aditi15679@gmail.com'),
  ('singhanchal9454@gmail.com'),
  ('arsh187777@gmail.com'),
  ('ayushisrivastava542@gmail.com'),
  ('bashyamharika@gmail.com'),
  ('rama8785343@gmail.com'),
  ('24cse137@ipec.org.in'),
  ('ranadrishti04@gmail.com'),
  ('harshitasen1510@gmail.com'),
  ('singhishita0404@gmail.com'),
  ('kalisettyprasanna72@gmail.com'),
  ('itgworlkash@gmail.com'),
  ('nainamodi123@gmail.com'),
  ('gracetheresa38@gmail.com'),
  ('parul.0516sharma@gmail.com'),
  ('pk8313982@gmail.com'),
  ('prerna2367pm@gmail.com'),
  ('radhikadodain13@gmail.com'),
  ('ramyasridulam063@gmail.com'),
  ('ranjanalogendran23@gmail.com'),
  ('hema130384@gmail.com'),
  ('samikshabajoria2006@gmail.com'),
  ('firangesamruddhi@gmail.com'),
  ('shagun4kashyap@gmail.com'),
  ('shatakshithakur2025@gmail.com'),
  ('shreyaadhikari0211@gmail.com'),
  ('chandelsoumya77@gmail.com'),
  ('suhanikaushik342@gmail.com'),
  ('vesdes5@gmail.com'),
  ('vaishnavi.kulkarni6306@gmail.com'),
  ('yogitamehta3488@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- ============ 3. RESOURCES TABLE ============
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active resources"
  ON public.resources FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admin manage resources"
  ON public.resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ 4. NOTIFICATIONS TABLE ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'like', 'comment', 'reply', 'badge'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: notify post author on like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _post RECORD;
  _liker_name TEXT;
BEGIN
  SELECT author_id INTO _post FROM public.posts WHERE id = NEW.post_id;
  IF _post.author_id = NEW.user_id THEN RETURN NEW; END IF; -- don't notify self
  SELECT display_name INTO _liker_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _post.author_id,
    'like',
    _liker_name || ' liked your post',
    NULL,
    '/feed'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.post_likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;

-- Trigger: notify post author on comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _post RECORD;
  _commenter_name TEXT;
BEGIN
  SELECT author_id INTO _post FROM public.posts WHERE id = NEW.post_id;
  IF _post.author_id = NEW.author_id THEN RETURN NEW; END IF;
  SELECT display_name INTO _commenter_name FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _post.author_id,
    'comment',
    _commenter_name || ' replied to your post',
    LEFT(NEW.content, 100),
    '/feed'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.post_comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;

-- Trigger: notify discussion author on reply
CREATE OR REPLACE FUNCTION public.notify_on_discussion_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _disc RECORD;
  _replier_name TEXT;
BEGIN
  SELECT author_id INTO _disc FROM public.discussions WHERE id = NEW.discussion_id;
  IF _disc.author_id = NEW.author_id THEN RETURN NEW; END IF;
  SELECT display_name INTO _replier_name FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _disc.author_id,
    'reply',
    _replier_name || ' replied to your discussion',
    LEFT(NEW.body, 100),
    '/discussions'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_disc_reply ON public.discussion_replies;
CREATE TRIGGER trg_notify_on_disc_reply
  AFTER INSERT ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_discussion_reply();

REVOKE EXECUTE ON FUNCTION public.notify_on_discussion_reply() FROM PUBLIC, anon, authenticated;

-- ============ 5. POST CATEGORY ============
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- Allow NULL content for posts (some might have only image/link)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_content_check CHECK (char_length(content) <= 2000);
