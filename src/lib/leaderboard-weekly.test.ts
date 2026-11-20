import { describe, expect, test } from "bun:test";
import {
  getAvailableWeeks,
  getWeeklyLeaderboardRows,
  getWeeklyTrendSeries,
  type LeaderboardMember,
  type WeeklyLeaderboardRecord,
} from "@/lib/leaderboard-weekly";

const members: LeaderboardMember[] = [
  {
    id: "member-a",
    display_name: "Asha",
    avatar_url: null,
    xp: 140,
    level: 2,
    streak: 3,
    college: "North College",
  },
  {
    id: "member-b",
    display_name: "Mira",
    avatar_url: null,
    xp: 190,
    level: 3,
    streak: 4,
    college: "South College",
  },
];

const history: WeeklyLeaderboardRecord[] = [
  { week_start: "2026-11-02", user_id: "member-a", weekly_xp: 90, weekly_rank: 1 },
  { week_start: "2026-11-02", user_id: "member-b", weekly_xp: 30, weekly_rank: 2 },
  { week_start: "2026-11-09", user_id: "member-a", weekly_xp: 40, weekly_rank: 2 },
  { week_start: "2026-11-09", user_id: "member-b", weekly_xp: 70, weekly_rank: 1 },
];

describe("weekly leaderboard", () => {
  test("offers available weeks newest first", () => {
    expect(getAvailableWeeks(history)).toEqual(["2026-11-09", "2026-11-02"]);
  });

  test("ranks only members with XP in the selected week and searches their college", () => {
    const rows = getWeeklyLeaderboardRows(history, members, "2026-11-09", "south");

    expect(rows.map((row) => [row.id, row.weekly_rank, row.weekly_xp])).toEqual([
      ["member-b", 1, 70],
    ]);
  });

  test("plots each selected leader’s rank chronologically", () => {
    const selectedRows = getWeeklyLeaderboardRows(history, members, "2026-11-09");
    const trend = getWeeklyTrendSeries(history, selectedRows);

    expect(trend.points.map((point) => [point.week_start, point["member-b"]])).toEqual([
      ["2026-11-02", 2],
      ["2026-11-09", 1],
    ]);
  });
});