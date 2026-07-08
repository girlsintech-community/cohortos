-- Secure pre-login allowlist check without exposing approved emails
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_emails
    WHERE lower(email) = lower(trim(_email))
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;

-- Ensure the founder/admin email is approved and has admin access
INSERT INTO public.allowed_emails (email)
VALUES ('girlsleadingtech@gmail.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'girlsleadingtech@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles p
SET primary_role = 'admin'::public.app_role
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) = 'girlsleadingtech@gmail.com';

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_primary_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO authenticated;

-- Level names based on career-growth progression
CREATE OR REPLACE FUNCTION public.level_from_xp(_xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LEAST(8, GREATEST(1, 1 + FLOOR(GREATEST(_xp, 0) / 250)::int));
$$;

CREATE OR REPLACE FUNCTION public.level_name_from_level(_level integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE LEAST(8, GREATEST(1, _level))
    WHEN 1 THEN 'Explorer'
    WHEN 2 THEN 'Learner'
    WHEN 3 THEN 'Problem Solver'
    WHEN 4 THEN 'Builder'
    WHEN 5 THEN 'Collaborator'
    WHEN 6 THEN 'Contributor'
    WHEN 7 THEN 'Mentor''s Pick'
    ELSE 'Cohort Champion'
  END;
$$;
GRANT EXECUTE ON FUNCTION public.level_from_xp(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.level_name_from_level(integer) TO authenticated;

-- Replace XP helper so all level math uses the new 8-level system
CREATE OR REPLACE FUNCTION public.award_xp(_user uuid, _amount integer, _type text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_xp integer;
BEGIN
  IF _amount = 0 THEN
    RETURN;
  END IF;

  UPDATE public.profiles
    SET xp = GREATEST(0, xp + _amount)
    WHERE id = _user
    RETURNING xp INTO _new_xp;

  IF _new_xp IS NOT NULL THEN
    UPDATE public.profiles
      SET level = public.level_from_xp(_new_xp)
      WHERE id = _user;

    INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata)
    VALUES (_user, _type, _amount, COALESCE(_meta, '{}'::jsonb));
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer, text, jsonb) TO authenticated;

-- Daily login XP, once per calendar day
CREATE OR REPLACE FUNCTION public.record_daily_login()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _already boolean;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.xp_events
    WHERE user_id = _me
      AND event_type = 'daily_login'
      AND created_at >= date_trunc('day', now())
  ) INTO _already;

  IF _already THEN
    RETURN false;
  END IF;

  PERFORM public.award_xp(_me, 5, 'daily_login', jsonb_build_object('day', current_date));
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_daily_login() TO authenticated;

-- Valuable-action XP triggers
CREATE OR REPLACE FUNCTION public.on_like_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _post_author uuid;
BEGIN
  SELECT author_id INTO _post_author FROM public.posts WHERE id = NEW.post_id;
  PERFORM public.award_xp(NEW.user_id, 1, 'like_given', jsonb_build_object('post_id', NEW.post_id));
  IF _post_author IS NOT NULL AND _post_author <> NEW.user_id THEN
    PERFORM public.award_xp(_post_author, 2, 'post_upvoted', jsonb_build_object('post_id', NEW.post_id, 'by', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_post_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.link_url IS NOT NULL AND NEW.link_url <> '' THEN
    PERFORM public.award_xp(NEW.author_id, 20, 'linkedin_or_learning_link_shared', jsonb_build_object('post_id', NEW.id, 'link_url', NEW.link_url));
  ELSIF NEW.image_url IS NOT NULL AND NEW.image_url <> '' THEN
    PERFORM public.award_xp(NEW.author_id, 25, 'project_update_uploaded', jsonb_build_object('post_id', NEW.id));
  ELSE
    PERFORM public.award_xp(NEW.author_id, 5, 'learning_update_posted', jsonb_build_object('post_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_comment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 10, 'answered_doubt', jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_discussion_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 10, 'discussion_created', jsonb_build_object('discussion_id', NEW.id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_discussion_reply_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 10, 'answered_discussion_doubt', jsonb_build_object('reply_id', NEW.id, 'discussion_id', NEW.discussion_id));
  RETURN NEW;
END;
$$;

-- Recreate missing triggers for XP, streaks, notifications, and mentions
DROP TRIGGER IF EXISTS trg_update_streak_on_xp ON public.xp_events;
CREATE TRIGGER trg_update_streak_on_xp
AFTER INSERT ON public.xp_events
FOR EACH ROW EXECUTE FUNCTION public.update_user_streak();

DROP TRIGGER IF EXISTS trg_award_xp_on_post ON public.posts;
CREATE TRIGGER trg_award_xp_on_post
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.on_post_created();

DROP TRIGGER IF EXISTS trg_award_xp_on_like ON public.post_likes;
CREATE TRIGGER trg_award_xp_on_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.on_like_created();

DROP TRIGGER IF EXISTS trg_award_xp_on_comment ON public.post_comments;
CREATE TRIGGER trg_award_xp_on_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.on_comment_created();

DROP TRIGGER IF EXISTS trg_award_xp_on_discussion ON public.discussions;
CREATE TRIGGER trg_award_xp_on_discussion
AFTER INSERT ON public.discussions
FOR EACH ROW EXECUTE FUNCTION public.on_discussion_created();

DROP TRIGGER IF EXISTS trg_award_xp_on_disc_reply ON public.discussion_replies;
CREATE TRIGGER trg_award_xp_on_disc_reply
AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.on_discussion_reply_created();

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.post_likes;
CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.post_comments;
CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_on_disc_reply ON public.discussion_replies;
CREATE TRIGGER trg_notify_on_disc_reply
AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_on_discussion_reply();

DROP TRIGGER IF EXISTS trg_comment_mentions ON public.post_comments;
CREATE TRIGGER trg_comment_mentions
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.on_comment_mentions();

DROP TRIGGER IF EXISTS trg_reply_mentions ON public.discussion_replies;
CREATE TRIGGER trg_reply_mentions
AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.on_reply_mentions();

-- Badges that tell the student's cohort story
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '⭐',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read badges" ON public.badges;
CREATE POLICY "Signed-in users read badges"
ON public.badges FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read earned badges" ON public.user_badges;
CREATE POLICY "Signed-in users read earned badges"
ON public.user_badges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Mentors and admins award badges" ON public.user_badges;
CREATE POLICY "Mentors and admins award badges"
ON public.user_badges FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.primary_role IN ('mentor','team_member','admin'))
);
DROP POLICY IF EXISTS "Admins manage badges" ON public.user_badges;
CREATE POLICY "Admins manage badges"
ON public.user_badges FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete earned badges" ON public.user_badges;
CREATE POLICY "Admins delete earned badges"
ON public.user_badges FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.badges (slug, name, description, icon) VALUES
  ('seven_day_streak', '7-Day Streak', 'Built consistency through daily learning habits.', '🔥'),
  ('conversation_starter', 'Conversation Starter', 'Asked thoughtful questions and initiated useful discussions.', '💬'),
  ('community_helper', 'Community Helper', 'Solved doubts and strengthened the cohort community.', '🤝'),
  ('resume_expert', 'Resume Expert', 'Reviewed resumes and helped peers improve their career profile.', '📝'),
  ('networking_ninja', 'Networking Ninja', 'Built meaningful professional connections.', '🌐'),
  ('builder', 'Builder', 'Shipped real project progress instead of only planning.', '🚀'),
  ('consistency_champion', 'Consistency Champion', 'Completed weekly assignments with discipline.', '📚'),
  ('top_contributor', 'Top Contributor', 'Created high-impact contributions this week.', '🏆'),
  ('problem_solver', 'Problem Solver', 'Practiced DSA consistently and solved meaningful milestones.', '💡'),
  ('mentors_choice', 'Mentor''s Choice', 'Recognized by a mentor for exceptional effort or leadership.', '⭐'),
  ('mystery_badge', 'Mystery Badge', 'Completed a hidden weekly challenge.', '🎁')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- Helpful/community reactions that increase reputation, not spammy message count
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post_comment','discussion_reply','discussion')),
  target_id uuid NOT NULL,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  giver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('helpful','great_explanation','motivated_me','clever_solution','upvote','mentor_helpful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, giver_id, reaction_type),
  CHECK (receiver_id <> giver_id)
);
CREATE INDEX IF NOT EXISTS community_reactions_receiver_idx ON public.community_reactions(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_reactions_target_idx ON public.community_reactions(target_type, target_id);
GRANT SELECT, INSERT, DELETE ON public.community_reactions TO authenticated;
GRANT ALL ON public.community_reactions TO service_role;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read community reactions" ON public.community_reactions;
CREATE POLICY "Signed-in users read community reactions"
ON public.community_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users add reactions as themselves" ON public.community_reactions;
CREATE POLICY "Users add reactions as themselves"
ON public.community_reactions FOR INSERT TO authenticated
WITH CHECK (
  giver_id = auth.uid()
  AND receiver_id <> auth.uid()
  AND (
    reaction_type <> 'mentor_helpful'
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.primary_role IN ('mentor','team_member','admin'))
  )
);
DROP POLICY IF EXISTS "Users remove own reactions" ON public.community_reactions;
CREATE POLICY "Users remove own reactions"
ON public.community_reactions FOR DELETE TO authenticated
USING (giver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.on_community_reaction_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _xp integer := 0;
  _badge uuid;
BEGIN
  _xp := CASE NEW.reaction_type
    WHEN 'helpful' THEN 2
    WHEN 'great_explanation' THEN 2
    WHEN 'motivated_me' THEN 2
    WHEN 'clever_solution' THEN 2
    WHEN 'upvote' THEN 2
    WHEN 'mentor_helpful' THEN 15
    ELSE 0
  END;

  PERFORM public.award_xp(NEW.receiver_id, _xp, 'reputation_' || NEW.reaction_type, jsonb_build_object('target_type', NEW.target_type, 'target_id', NEW.target_id, 'giver_id', NEW.giver_id));

  IF NEW.reaction_type = 'mentor_helpful' THEN
    SELECT id INTO _badge FROM public.badges WHERE slug = 'mentors_choice';
    IF _badge IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, awarded_by, reason)
      VALUES (NEW.receiver_id, _badge, NEW.giver_id, 'Helpful answer recognized by a mentor')
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.receiver_id,
    'reputation',
    CASE NEW.reaction_type
      WHEN 'mentor_helpful' THEN 'A mentor marked your answer helpful'
      WHEN 'great_explanation' THEN 'Someone praised your explanation'
      WHEN 'motivated_me' THEN 'Your answer motivated someone'
      WHEN 'clever_solution' THEN 'Someone liked your clever solution'
      ELSE 'Someone marked your answer helpful'
    END,
    'Quality contributions increase your community reputation.',
    CASE WHEN NEW.target_type = 'discussion_reply' OR NEW.target_type = 'discussion' THEN '/discussions' ELSE '/feed' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_reaction_xp ON public.community_reactions;
CREATE TRIGGER trg_community_reaction_xp
AFTER INSERT ON public.community_reactions
FOR EACH ROW EXECUTE FUNCTION public.on_community_reaction_created();

-- Daily quest confirmation gate and completion reward
CREATE TABLE IF NOT EXISTS public.platform_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_guides TO authenticated;
GRANT ALL ON public.platform_guides TO service_role;
ALTER TABLE public.platform_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read platform guides" ON public.platform_guides;
CREATE POLICY "Signed-in users read platform guides"
ON public.platform_guides FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.user_guide_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  guide_version text NOT NULL DEFAULT '2026-07-08',
  UNIQUE (user_id, guide_version)
);
GRANT SELECT, INSERT ON public.user_guide_confirmations TO authenticated;
GRANT ALL ON public.user_guide_confirmations TO service_role;
ALTER TABLE public.user_guide_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own guide confirmations" ON public.user_guide_confirmations;
CREATE POLICY "Users read own guide confirmations"
ON public.user_guide_confirmations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users confirm guides for themselves" ON public.user_guide_confirmations;
CREATE POLICY "Users confirm guides for themselves"
ON public.user_guide_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.platform_guides (slug, title, body, sort_order) VALUES
  ('guide', 'Platform Guide', 'CohortOS rewards valuable progress: solving, building, helping, discussing, reviewing, and sharing proof of learning. XP should reflect employability growth, not screen time.', 1),
  ('rules', 'Community Rules', 'Ask thoughtful questions, share context, credit resources, keep posts useful, avoid spam, and use reactions to recognize genuinely helpful answers.', 2),
  ('code_of_conduct', 'Code of Conduct', 'Be respectful, inclusive, constructive, and career-focused. No harassment, personal attacks, plagiarism, or misleading progress claims.', 3)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Multi-streaks: track the habits separately so one missed habit does not erase all motivation
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak_type text NOT NULL CHECK (streak_type IN ('dsa','assignment','learning','community_help','build')),
  current_count integer NOT NULL DEFAULT 0,
  best_count integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, streak_type)
);
GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read streaks" ON public.user_streaks;
CREATE POLICY "Signed-in users read streaks"
ON public.user_streaks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own streaks" ON public.user_streaks;
CREATE POLICY "Users manage own streaks"
ON public.user_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own streaks" ON public.user_streaks;
CREATE POLICY "Users update own streaks"
ON public.user_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_streak(_user uuid, _streak_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := current_date;
  _last date;
  _current integer;
BEGIN
  INSERT INTO public.user_streaks (user_id, streak_type, current_count, best_count, last_activity_date)
  VALUES (_user, _streak_type, 1, 1, _today)
  ON CONFLICT (user_id, streak_type) DO NOTHING;

  SELECT last_activity_date, current_count INTO _last, _current
  FROM public.user_streaks
  WHERE user_id = _user AND streak_type = _streak_type;

  IF _last = _today THEN
    RETURN;
  ELSIF _last = _today - INTERVAL '1 day' THEN
    _current := COALESCE(_current, 0) + 1;
  ELSE
    _current := 1;
  END IF;

  UPDATE public.user_streaks
  SET current_count = _current,
      best_count = GREATEST(best_count, _current),
      last_activity_date = _today,
      updated_at = now()
  WHERE user_id = _user AND streak_type = _streak_type;
END;
$$;
GRANT EXECUTE ON FUNCTION public.touch_user_streak(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_xp_event_update_streaks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type IN ('challenge_approved','challenge_submitted','dsa_problem_solved') THEN
    PERFORM public.touch_user_streak(NEW.user_id, 'dsa');
  END IF;
  IF NEW.event_type IN ('weekly_assignment_submitted','challenge_approved') THEN
    PERFORM public.touch_user_streak(NEW.user_id, 'assignment');
  END IF;
  IF NEW.event_type IN ('daily_login','learning_update_posted','linkedin_or_learning_link_shared') THEN
    PERFORM public.touch_user_streak(NEW.user_id, 'learning');
  END IF;
  IF NEW.event_type IN ('answered_doubt','answered_discussion_doubt','reputation_helpful','reputation_great_explanation','reputation_motivated_me','reputation_clever_solution','reputation_mentor_helpful') THEN
    PERFORM public.touch_user_streak(NEW.user_id, 'community_help');
  END IF;
  IF NEW.event_type IN ('project_update_uploaded','secret_build_challenge','builder_progress') THEN
    PERFORM public.touch_user_streak(NEW.user_id, 'build');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_event_update_multi_streaks ON public.xp_events;
CREATE TRIGGER trg_xp_event_update_multi_streaks
AFTER INSERT ON public.xp_events
FOR EACH ROW EXECUTE FUNCTION public.on_xp_event_update_streaks();

-- Mentor appreciation cards, capped at 5/week per mentor
CREATE TABLE IF NOT EXISTS public.mentor_appreciations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_type text NOT NULL CHECK (card_type IN ('outstanding_improvement','great_team_player','excellent_explanation','consistency','leadership')),
  message text,
  xp_bonus integer NOT NULL DEFAULT 15 CHECK (xp_bonus BETWEEN 1 AND 100),
  week_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mentor_id <> student_id)
);
CREATE INDEX IF NOT EXISTS mentor_appreciations_mentor_week_idx ON public.mentor_appreciations(mentor_id, week_start);
CREATE INDEX IF NOT EXISTS mentor_appreciations_student_idx ON public.mentor_appreciations(student_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.mentor_appreciations TO authenticated;
GRANT ALL ON public.mentor_appreciations TO service_role;
ALTER TABLE public.mentor_appreciations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read appreciation cards" ON public.mentor_appreciations;
CREATE POLICY "Signed-in users read appreciation cards"
ON public.mentor_appreciations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Mentors create appreciation cards" ON public.mentor_appreciations;
CREATE POLICY "Mentors create appreciation cards"
ON public.mentor_appreciations FOR INSERT TO authenticated
WITH CHECK (
  mentor_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.primary_role IN ('mentor','team_member','admin'))
  )
);
DROP POLICY IF EXISTS "Admins delete appreciation cards" ON public.mentor_appreciations;
CREATE POLICY "Admins delete appreciation cards"
ON public.mentor_appreciations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_mentor_appreciation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  SELECT count(*) INTO _count
  FROM public.mentor_appreciations
  WHERE mentor_id = NEW.mentor_id
    AND week_start = NEW.week_start;

  IF _count >= 5 THEN
    RAISE EXCEPTION 'Mentors can send only 5 appreciation cards per week';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mentor_appreciation_limit ON public.mentor_appreciations;
CREATE TRIGGER trg_validate_mentor_appreciation_limit
BEFORE INSERT ON public.mentor_appreciations
FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_appreciation_limit();

CREATE OR REPLACE FUNCTION public.on_mentor_appreciation_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _badge uuid;
BEGIN
  PERFORM public.award_xp(NEW.student_id, NEW.xp_bonus, 'mentor_appreciation', jsonb_build_object('card_type', NEW.card_type, 'mentor_id', NEW.mentor_id));
  SELECT id INTO _badge FROM public.badges WHERE slug = 'mentors_choice';
  IF _badge IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, awarded_by, reason)
    VALUES (NEW.student_id, _badge, NEW.mentor_id, COALESCE(NEW.message, 'Mentor appreciation'))
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.student_id, 'mentor_appreciation', 'You received mentor appreciation', COALESCE(NEW.message, 'A mentor recognized your progress.'), '/profile');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_appreciation_xp ON public.mentor_appreciations;
CREATE TRIGGER trg_mentor_appreciation_xp
AFTER INSERT ON public.mentor_appreciations
FOR EACH ROW EXECUTE FUNCTION public.on_mentor_appreciation_created();

-- Keep existing profiles aligned with the new level system
UPDATE public.profiles
SET level = public.level_from_xp(xp);