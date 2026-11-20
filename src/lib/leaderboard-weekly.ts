export type LeaderboardMember = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak: number;
  college: string | null;
};

export type WeeklyLeaderboardRecord = {
  week_start: string;
  user_id: string;
  weekly_xp: number;
  weekly_rank: number | null;
};

export type WeeklyLeaderboardRow = LeaderboardMember & {
  weekly_xp: number;
  weekly_rank: number;
};

export type WeeklyTrendPoint = {
  week_start: string;
  week_label: string;
  [memberId: string]: string | number | null;
};

export function getAvailableWeeks(history: WeeklyLeaderboardRecord[]): string[] {
  return [...new Set(history.map((record) => record.week_start))].sort((a, b) => b.localeCompare(a));
}

export function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return weekStart;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getWeeklyLeaderboardRows(
  history: WeeklyLeaderboardRecord[],
  members: LeaderboardMember[],
  weekStart: string,
  query = "",
): WeeklyLeaderboardRow[] {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const searchTerm = query.trim().toLocaleLowerCase();

  return history
    .filter((record) => record.week_start === weekStart && record.weekly_xp > 0)
    .flatMap((record) => {
      const member = membersById.get(record.user_id);
      if (!member || record.weekly_rank === null) return [];

      const matchesSearch =
        !searchTerm ||
        (member.display_name ?? "").toLocaleLowerCase().includes(searchTerm) ||
        (member.college ?? "").toLocaleLowerCase().includes(searchTerm);

      return matchesSearch
        ? [{ ...member, weekly_xp: record.weekly_xp, weekly_rank: record.weekly_rank }]
        : [];
    })
    .sort(
      (a, b) =>
        a.weekly_xp - b.weekly_xp === 0
          ? (a.display_name ?? "").localeCompare(b.display_name ?? "")
          : b.weekly_xp - a.weekly_xp,
    );
}

export function getWeeklyTrendSeries(
  history: WeeklyLeaderboardRecord[],
  selectedWeekRows: WeeklyLeaderboardRow[],
  limit = 5,
): { members: WeeklyLeaderboardRow[]; points: WeeklyTrendPoint[] } {
  const members = selectedWeekRows.slice(0, limit);
  const weeks = [...new Set(history.map((record) => record.week_start))].sort((a, b) =>
    a.localeCompare(b),
  );
  const ranksByWeekAndMember = new Map(
    history.map((record) => [`${record.week_start}:${record.user_id}`, record.weekly_rank]),
  );

  const points = weeks.map((weekStart) => {
    const point: WeeklyTrendPoint = {
      week_start: weekStart,
      week_label: formatWeekLabel(weekStart),
    };

    for (const member of members) {
      point[member.id] = ranksByWeekAndMember.get(`${weekStart}:${member.id}`) ?? null;
    }

    return point;
  });

  return { members, points };
}