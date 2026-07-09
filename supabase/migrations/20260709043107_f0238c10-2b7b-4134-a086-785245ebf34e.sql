
-- Masterclasses (admin manages, all authenticated read)
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
GRANT SELECT ON public.masterclasses TO authenticated;
GRANT ALL ON public.masterclasses TO service_role;
ALTER TABLE public.masterclasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read masterclasses" ON public.masterclasses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage masterclasses" ON public.masterclasses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Cohort todos (admin manages, everyone reads)
CREATE TABLE IF NOT EXISTS public.cohort_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cohort_todos TO authenticated;
GRANT ALL ON public.cohort_todos TO service_role;
ALTER TABLE public.cohort_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read cohort_todos" ON public.cohort_todos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage cohort_todos" ON public.cohort_todos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- User todo completions (each user tracks their own)
CREATE TABLE IF NOT EXISTS public.user_todo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.cohort_todos(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, todo_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_todo_completions TO authenticated;
GRANT ALL ON public.user_todo_completions TO service_role;
ALTER TABLE public.user_todo_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own completions" ON public.user_todo_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Personal todos
CREATE TABLE IF NOT EXISTS public.personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_todos TO authenticated;
GRANT ALL ON public.personal_todos TO service_role;
ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own personal_todos" ON public.personal_todos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User notes
CREATE TABLE IF NOT EXISTS public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own notes" ON public.user_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User screen time
CREATE TABLE IF NOT EXISTS public.user_screen_time (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  seconds_spent integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);
GRANT SELECT ON public.user_screen_time TO authenticated;
GRANT ALL ON public.user_screen_time TO service_role;
ALTER TABLE public.user_screen_time ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own screen_time" ON public.user_screen_time FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.increment_screen_time(seconds_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RETURN; END IF;
  IF seconds_to_add IS NULL OR seconds_to_add <= 0 THEN RETURN; END IF;
  INSERT INTO public.user_screen_time (user_id, date, seconds_spent)
  VALUES (_me, current_date, seconds_to_add)
  ON CONFLICT (user_id, date) DO UPDATE SET seconds_spent = public.user_screen_time.seconds_spent + EXCLUDED.seconds_spent;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_screen_time(integer) TO authenticated;
