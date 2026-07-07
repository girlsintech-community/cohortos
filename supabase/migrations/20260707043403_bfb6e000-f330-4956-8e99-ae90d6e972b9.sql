
-- 1. Fix has_role EXECUTE so RLS policies stop failing with "permission denied for function has_role"
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2. Username column on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
-- Backfill for existing rows: use email prefix from auth.users when possible
UPDATE public.profiles p
   SET username = lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
  FROM auth.users u
 WHERE u.id = p.id AND p.username IS NULL;
-- Deduplicate any collisions by appending a short suffix
WITH dupes AS (
  SELECT id, username,
         row_number() OVER (PARTITION BY username ORDER BY created_at) - 1 AS n
    FROM public.profiles
   WHERE username IS NOT NULL
)
UPDATE public.profiles p SET username = d.username || d.n::text
  FROM dupes d WHERE d.id = p.id AND d.n > 0;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles(lower(username));

-- 3. Mention notifications for post comments and discussion replies
CREATE OR REPLACE FUNCTION public.notify_mentions_from_text(_source_user uuid, _text text, _title_prefix text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uname text;
  _mentioned RECORD;
  _source_name text;
BEGIN
  SELECT display_name INTO _source_name FROM public.profiles WHERE id = _source_user;
  FOR _uname IN
    SELECT DISTINCT lower(m[1])
      FROM regexp_matches(_text, '@([a-zA-Z0-9_]{2,30})', 'g') AS m
  LOOP
    FOR _mentioned IN
      SELECT id FROM public.profiles WHERE lower(username) = _uname AND id <> _source_user
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (_mentioned.id, 'mention',
              COALESCE(_source_name, 'Someone') || ' mentioned you' || COALESCE(' in ' || _title_prefix, ''),
              LEFT(_text, 200), _link);
    END LOOP;
  END LOOP;
END; $$;
GRANT EXECUTE ON FUNCTION public.notify_mentions_from_text(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_comment_mentions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(NEW.author_id, NEW.content, 'a post', '/feed');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_comment_mentions ON public.post_comments;
CREATE TRIGGER trg_comment_mentions AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.on_comment_mentions();

CREATE OR REPLACE FUNCTION public.on_reply_mentions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(NEW.author_id, NEW.body, 'a discussion', '/discussions');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_reply_mentions ON public.discussion_replies;
CREATE TRIGGER trg_reply_mentions AFTER INSERT ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.on_reply_mentions();

-- 4. Pods
CREATE TABLE IF NOT EXISTS public.pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pods TO authenticated;
GRANT ALL ON public.pods TO service_role;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pod_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'mentee', -- 'mentor' | 'mentee' | 'team_member'
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pod_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pod_members TO authenticated;
GRANT ALL ON public.pod_members TO service_role;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pod_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pod_messages TO authenticated;
GRANT ALL ON public.pod_messages TO service_role;
ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a member of a pod?
CREATE OR REPLACE FUNCTION public.is_pod_member(_pod_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pod_members WHERE pod_id = _pod_id AND user_id = _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_pod_member(uuid, uuid) TO authenticated;

-- pods policies
DROP POLICY IF EXISTS "Members see their pods" ON public.pods;
CREATE POLICY "Members see their pods" ON public.pods FOR SELECT TO authenticated
  USING (public.is_pod_member(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin manages pods" ON public.pods;
CREATE POLICY "Admin manages pods" ON public.pods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pod_members policies
DROP POLICY IF EXISTS "Members see own pod roster" ON public.pod_members;
CREATE POLICY "Members see own pod roster" ON public.pod_members FOR SELECT TO authenticated
  USING (public.is_pod_member(pod_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin manages pod members" ON public.pod_members;
CREATE POLICY "Admin manages pod members" ON public.pod_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pod_messages policies
DROP POLICY IF EXISTS "Members read pod messages" ON public.pod_messages;
CREATE POLICY "Members read pod messages" ON public.pod_messages FOR SELECT TO authenticated
  USING (public.is_pod_member(pod_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Members write pod messages" ON public.pod_messages;
CREATE POLICY "Members write pod messages" ON public.pod_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_pod_member(pod_id, auth.uid()));
DROP POLICY IF EXISTS "Author or admin delete pod message" ON public.pod_messages;
CREATE POLICY "Author or admin delete pod message" ON public.pod_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. Admin RPC to set a user's primary role (mentee/mentor/team_member)
CREATE OR REPLACE FUNCTION public.set_user_primary_role(_target uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _role NOT IN ('mentee','mentor','team_member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles SET primary_role = _role::public.app_role WHERE id = _target;
END; $$;
GRANT EXECUTE ON FUNCTION public.set_user_primary_role(uuid, text) TO authenticated;

-- 6. Enable realtime for pod_messages so chat updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.pod_messages;
