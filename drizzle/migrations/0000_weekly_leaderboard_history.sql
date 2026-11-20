CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard_history(_weeks integer DEFAULT 12)
RETURNS TABLE (
  week_start date,
  user_id uuid,
  weekly_xp integer,
  weekly_rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH settings AS (
    SELECT
      date_trunc('week', now() AT TIME ZONE 'UTC')::date AS current_week,
      LEAST(GREATEST(COALESCE(_weeks, 12), 1), 26) AS week_count
  ), weeks AS (
    SELECT (settings.current_week - (week_offset * 7))::date AS week_start
    FROM settings
    CROSS JOIN LATERAL generate_series(0, settings.week_count - 1) AS series(week_offset)
  ), weekly_scores AS (
    SELECT
      date_trunc('week', events.created_at AT TIME ZONE 'UTC')::date AS week_start,
      events.user_id,
      SUM(events.xp_amount)::integer AS weekly_xp
    FROM public.xp_events AS events
    CROSS JOIN settings
    WHERE events.created_at >= ((settings.current_week - ((settings.week_count - 1) * 7))::timestamp AT TIME ZONE 'UTC')
      AND events.created_at < ((settings.current_week + 7)::timestamp AT TIME ZONE 'UTC')
    GROUP BY 1, 2
  ), member_weeks AS (
    SELECT
      weeks.week_start,
      profiles.id AS user_id,
      COALESCE(weekly_scores.weekly_xp, 0)::integer AS weekly_xp
    FROM weeks
    CROSS JOIN public.profiles AS profiles
    LEFT JOIN weekly_scores
      ON weekly_scores.week_start = weeks.week_start
      AND weekly_scores.user_id = profiles.id
    WHERE profiles.onboarded = true
  )
  SELECT
    member_weeks.week_start,
    member_weeks.user_id,
    member_weeks.weekly_xp,
    CASE
      WHEN member_weeks.weekly_xp > 0 THEN RANK() OVER (
        PARTITION BY member_weeks.week_start
        ORDER BY member_weeks.weekly_xp DESC
      )
      ELSE NULL
    END AS weekly_rank
  FROM member_weeks
  ORDER BY member_weeks.week_start DESC, member_weeks.weekly_xp DESC;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_leaderboard_history(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard_history(integer) TO authenticated;