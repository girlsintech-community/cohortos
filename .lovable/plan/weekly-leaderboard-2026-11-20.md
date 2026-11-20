# Weekly Leaderboard

## What will change
- Add a secure weekly-score history query that exposes aggregated leaderboard results without exposing raw XP event records.
- Add an All-time / Weekly filter, selectable week, and List / Graph view to the leaderboard.
- Plot the selected week’s leading members across recent weeks so members can compare rank progression.
- Keep existing all-time category boards and search behavior.

## Technical details
- Use an authenticated, read-only database function over XP events and onboarded profiles.
- Build the history chart with the existing Recharts dependency and the project’s semantic color tokens.
- Add focused coverage for week selection and ranking logic, then verify the signed-in leaderboard in the preview.