-- Weekly Wrap, Masterclasses, User Screen Time, Notes and To-Dos Additions

-- 1. Masterclasses Table
CREATE TABLE IF NOT EXISTS public.masterclasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  watch_link text NOT NULL,
  image_url text,
  speaker_name text NOT NULL,
  speaker_linkedin text,
  speaker_designation text,
  speaker_bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.masterclasses TO authenticated;
GRANT ALL ON public.masterclasses TO service_role;
ALTER TABLE public.masterclasses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read masterclasses" ON public.masterclasses;
CREATE POLICY "Authenticated users read masterclasses" ON public.masterclasses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage masterclasses" ON public.masterclasses;
CREATE POLICY "Admins manage masterclasses" ON public.masterclasses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 2. User Screen Time Table
CREATE TABLE IF NOT EXISTS public.user_screen_time (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  seconds_spent integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_screen_time TO authenticated;
GRANT ALL ON public.user_screen_time TO service_role;
ALTER TABLE public.user_screen_time ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own screen time or admin" ON public.user_screen_time;
CREATE POLICY "Users read own screen time or admin" ON public.user_screen_time
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users upsert own screen time" ON public.user_screen_time;
CREATE POLICY "Users upsert own screen time" ON public.user_screen_time
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Increment Screen Time function
CREATE OR REPLACE FUNCTION public.increment_screen_time(seconds_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _today date := CURRENT_DATE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_screen_time (user_id, date, seconds_spent)
  VALUES (_user_id, _today, seconds_to_add)
  ON CONFLICT (user_id, date)
  DO UPDATE SET seconds_spent = public.user_screen_time.seconds_spent + seconds_to_add,
                updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_screen_time(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_screen_time(integer) TO authenticated;


-- 3. User Notes Table
CREATE TABLE IF NOT EXISTS public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON public.user_notes;
CREATE POLICY "Users manage own notes" ON public.user_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 4. Cohort To-Dos Table
CREATE TABLE IF NOT EXISTS public.cohort_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_todos TO authenticated;
GRANT ALL ON public.cohort_todos TO service_role;
ALTER TABLE public.cohort_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read cohort todos" ON public.cohort_todos;
CREATE POLICY "Read cohort todos" ON public.cohort_todos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage cohort todos" ON public.cohort_todos;
CREATE POLICY "Admins manage cohort todos" ON public.cohort_todos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 5. Cohort To-Do Completions Table
CREATE TABLE IF NOT EXISTS public.user_todo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.cohort_todos(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, todo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_todo_completions TO authenticated;
GRANT ALL ON public.user_todo_completions TO service_role;
ALTER TABLE public.user_todo_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own completions or admin" ON public.user_todo_completions;
CREATE POLICY "Users read own completions or admin" ON public.user_todo_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own completions" ON public.user_todo_completions;
CREATE POLICY "Users insert own completions" ON public.user_todo_completions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own completions" ON public.user_todo_completions;
CREATE POLICY "Users delete own completions" ON public.user_todo_completions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- 6. Personal To-Dos Table
CREATE TABLE IF NOT EXISTS public.personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_todos TO authenticated;
GRANT ALL ON public.personal_todos TO service_role;
ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own personal todos" ON public.personal_todos;
CREATE POLICY "Users manage own personal todos" ON public.personal_todos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 7. Add default "Speed Networking Challenge"
INSERT INTO public.challenges (title, description, difficulty, xp_reward, is_active)
SELECT 
  'Speed Networking Challenge', 
  'Pair with a fellow cohort sister using the Speed Networking tab, meet over Google Meet, and share your experience in the feed!', 
  'easy', 
  50, 
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.challenges WHERE title = 'Speed Networking Challenge'
);
