
-- Add primary_role to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_role public.app_role;

-- ==============================
-- POST COMMENTS
-- ==============================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FK to profiles for embed
ALTER TABLE public.post_comments
  ADD CONSTRAINT post_comments_author_profile_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments readable by authenticated" ON public.post_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own comments" ON public.post_comments
  FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments" ON public.post_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON public.post_comments(post_id);

-- ==============================
-- XP ON POST / COMMENT
-- ==============================
CREATE OR REPLACE FUNCTION public.award_xp(_user uuid, _amount int, _type text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET xp = xp + _amount,
        level = 1 + ((xp + _amount) / 500)
    WHERE id = _user;
  INSERT INTO public.xp_events (user_id, event_type, xp_amount, metadata)
    VALUES (_user, _type, _amount, _meta);
END;
$$;

CREATE OR REPLACE FUNCTION public.on_post_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 5, 'post_created', jsonb_build_object('post_id', NEW.id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_xp_on_post ON public.posts;
CREATE TRIGGER trg_award_xp_on_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.on_post_created();

CREATE OR REPLACE FUNCTION public.on_comment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.author_id, 3, 'comment_created', jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_xp_on_comment ON public.post_comments;
CREATE TRIGGER trg_award_xp_on_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.on_comment_created();

-- ==============================
-- SPEED NETWORKING
-- ==============================
CREATE TABLE IF NOT EXISTS public.speed_networking_queue (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.speed_networking_queue TO authenticated;
GRANT ALL ON public.speed_networking_queue TO service_role;

ALTER TABLE public.speed_networking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own queue row" ON public.speed_networking_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mentees can queue themselves" ON public.speed_networking_queue
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.primary_role = 'mentee')
  );
CREATE POLICY "Users leave queue" ON public.speed_networking_queue
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.speed_networking_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.speed_networking_matches TO authenticated;
GRANT ALL ON public.speed_networking_matches TO service_role;

ALTER TABLE public.speed_networking_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "See own matches" ON public.speed_networking_matches
  FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
-- Inserts happen via RPC (security definer) — no INSERT policy needed for users, but keep service_role.

-- RPC: request a match. Returns match_id if paired, else NULL (queued).
CREATE OR REPLACE FUNCTION public.request_speed_match()
RETURNS TABLE (match_id uuid, partner_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _partner uuid;
  _match_id uuid;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _me AND p.primary_role = 'mentee') THEN
    RAISE EXCEPTION 'Speed networking is for mentees only';
  END IF;

  -- Find someone else waiting
  SELECT user_id INTO _partner FROM public.speed_networking_queue
    WHERE user_id <> _me ORDER BY created_at ASC LIMIT 1;

  IF _partner IS NOT NULL THEN
    DELETE FROM public.speed_networking_queue WHERE user_id IN (_me, _partner);
    INSERT INTO public.speed_networking_matches (user_a, user_b)
      VALUES (_me, _partner) RETURNING id INTO _match_id;
    RETURN QUERY SELECT _match_id, _partner, 'matched'::text;
  ELSE
    INSERT INTO public.speed_networking_queue (user_id) VALUES (_me)
      ON CONFLICT (user_id) DO NOTHING;
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, 'waiting'::text;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.request_speed_match() FROM public;
GRANT EXECUTE ON FUNCTION public.request_speed_match() TO authenticated;
