CREATE OR REPLACE FUNCTION public.get_leaderboard_scores()
RETURNS TABLE (
  user_id uuid,
  dsa_score integer,
  community_score integer,
  project_score integer,
  mentor_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    COALESCE(SUM(e.xp_amount) FILTER (WHERE e.event_type IN ('challenge_approved','challenge_submitted','dsa_problem_solved')), 0)::integer AS dsa_score,
    COALESCE(SUM(e.xp_amount) FILTER (WHERE e.event_type IN ('answered_doubt','answered_discussion_doubt','reputation_helpful','reputation_great_explanation','reputation_motivated_me','reputation_clever_solution','reputation_mentor_helpful','discussion_created')), 0)::integer AS community_score,
    COALESCE(SUM(e.xp_amount) FILTER (WHERE e.event_type IN ('project_update_uploaded','builder_progress','linkedin_or_learning_link_shared')), 0)::integer AS project_score,
    COALESCE(SUM(e.xp_amount) FILTER (WHERE e.event_type IN ('mentor_appreciation','reputation_mentor_helpful')), 0)::integer AS mentor_score
  FROM public.profiles p
  LEFT JOIN public.xp_events e ON e.user_id = p.id
  WHERE p.onboarded = true
  GROUP BY p.id;
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_scores() TO authenticated;