import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLine, Flame, Loader2, ListOrdered, Medal, Search, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  formatWeekLabel,
  getAvailableWeeks,
  getWeeklyLeaderboardRows,
  getWeeklyTrendSeries,
  type WeeklyLeaderboardRecord,
} from "@/lib/leaderboard-weekly";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard | CohortOS" },
      {
        name: "description",
        content: "View cohort XP standings, weekly leaders, and member rank progress over time.",
      },
      { property: "og:title", content: "Leaderboard | CohortOS" },
      {
        property: "og:description",
        content: "View cohort XP standings, weekly leaders, and member rank progress over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<"all-time" | "weekly">("all-time");
  const [weeklyView, setWeeklyView] = useState<"list" | "graph">("list");
  const [selectedWeek, setSelectedWeek] = useState("");
  const { data, isLoading: profilesLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp, level, streak, college")
        .order("xp", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["leaderboardScores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_leaderboard_scores");
      if (error) throw error;
      return data as Array<{
        user_id: string;
        dsa_score: number;
        community_score: number;
        project_score: number;
        mentor_score: number;
      }>;
    },
  });

  const { data: weeklyHistory, isLoading: weeklyHistoryLoading, isError: weeklyHistoryError } = useQuery({
    queryKey: ["leaderboardWeeklyHistory"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_weekly_leaderboard_history", {
        _weeks: 12,
      });
      if (error) throw error;
      return data as WeeklyLeaderboardRecord[];
    },
  });

  const filtered = (data ?? []).filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (p.display_name ?? "").toLowerCase().includes(s) ||
      (p.college ?? "").toLowerCase().includes(s)
    );
  });

  const scoreMap = new Map((scores ?? []).map((s) => [s.user_id, s]));
  const boards = {
    xp: filtered,
    dsa: rankByScore(filtered, (p) => scoreMap.get(p.id)?.dsa_score ?? 0),
    community: rankByScore(filtered, (p) => scoreMap.get(p.id)?.community_score ?? 0),
    projects: rankByScore(filtered, (p) => scoreMap.get(p.id)?.project_score ?? 0),
    mentor: rankByScore(filtered, (p) => scoreMap.get(p.id)?.mentor_score ?? 0),
  };
  const weekOptions = getAvailableWeeks(weeklyHistory ?? []);
  const activeWeek = weekOptions.includes(selectedWeek) ? selectedWeek : (weekOptions[0] ?? "");
  const weeklyRows = getWeeklyLeaderboardRows(weeklyHistory ?? [], data ?? [], activeWeek, q);
  const trend = getWeeklyTrendSeries(weeklyHistory ?? [], weeklyRows);
  const chartConfig: ChartConfig = Object.fromEntries(
    trend.members.map((member, index) => [
      member.id,
      {
        label: member.display_name ?? "Member",
        color: `var(--chart-${(index % 5) + 1})`,
      },
    ]),
  );
  const isLoading =
    profilesLoading || scoresLoading || (period === "weekly" && weeklyHistoryLoading);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard 🏆</h1>
          <p className="text-muted-foreground">
            {period === "weekly"
              ? "Weekly standings reward progress made during each week."
              : `Showing all ${data?.length ?? 0} registered members across the platform.`}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-1 rounded-md border bg-card p-1">
          <Button
            type="button"
            size="sm"
            variant={period === "all-time" ? "default" : "ghost"}
            aria-pressed={period === "all-time"}
            onClick={() => setPeriod("all-time")}
          >
            All-time
          </Button>
          <Button
            type="button"
            size="sm"
            variant={period === "weekly" ? "default" : "ghost"}
            aria-pressed={period === "weekly"}
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or college…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : period === "weekly" ? (
        <section className="space-y-4" aria-label="Weekly leaderboard">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={activeWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Choose leaderboard week">
                <SelectValue placeholder="Choose a week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem key={week} value={week}>
                    Week of {formatWeekLabel(week)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex w-fit items-center gap-1 rounded-md border bg-card p-1">
              <Button
                type="button"
                size="sm"
                variant={weeklyView === "list" ? "default" : "ghost"}
                aria-pressed={weeklyView === "list"}
                onClick={() => setWeeklyView("list")}
              >
                <ListOrdered aria-hidden="true" /> List
              </Button>
              <Button
                type="button"
                size="sm"
                variant={weeklyView === "graph" ? "default" : "ghost"}
                aria-pressed={weeklyView === "graph"}
                onClick={() => setWeeklyView("graph")}
              >
                <ChartLine aria-hidden="true" /> Graph
              </Button>
            </div>
          </div>

          {weeklyHistoryError ? (
            <p role="alert" className="py-8 text-center text-sm text-destructive">
              Weekly leaderboard data could not be loaded. Please try again.
            </p>
          ) : weekOptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Weekly results will appear when members earn XP.
            </p>
          ) : weeklyView === "list" ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 px-4 pb-3 pt-4 sm:px-6">
                <CardTitle className="text-base">Week of {formatWeekLabel(activeWeek)}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {weeklyRows.length} {weeklyRows.length === 1 ? "member" : "members"} ranked
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <Board
                  rows={weeklyRows}
                  userId={user.id}
                  metric="weekly"
                  getScore={(member) => member.weekly_xp ?? 0}
                  getRank={(member, index) => member.weekly_rank ?? index + 1}
                  scoreLabel="XP this week"
                />
              </CardContent>
            </Card>
          ) : (
            <WeeklyTrendChart members={trend.members} points={trend.points} config={chartConfig} />
          )}
        </section>
      ) : (
        <Tabs defaultValue="xp">
          <TabsList className="flex-wrap">
            <TabsTrigger value="xp">XP</TabsTrigger>
            <TabsTrigger value="dsa">DSA</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="mentor">Mentor</TabsTrigger>
          </TabsList>
          <TabsContent value="xp" className="mt-4">
            <Board rows={boards.xp} userId={user.id} metric="xp" getScore={(p) => p.xp} />
          </TabsContent>
          <TabsContent value="dsa" className="mt-4">
            <Board rows={boards.dsa} userId={user.id} metric="dsa" getScore={(p) => scoreMap.get(p.id)?.dsa_score ?? 0} />
          </TabsContent>
          <TabsContent value="community" className="mt-4">
            <Board rows={boards.community} userId={user.id} metric="community" getScore={(p) => scoreMap.get(p.id)?.community_score ?? 0} />
          </TabsContent>
          <TabsContent value="projects" className="mt-4">
            <Board rows={boards.projects} userId={user.id} metric="projects" getScore={(p) => scoreMap.get(p.id)?.project_score ?? 0} />
          </TabsContent>
          <TabsContent value="mentor" className="mt-4">
            <Board rows={boards.mentor} userId={user.id} metric="mentor" getScore={(p) => scoreMap.get(p.id)?.mentor_score ?? 0} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

type Row = import("@/lib/leaderboard-weekly").LeaderboardMember & {
  weekly_xp?: number;
  weekly_rank?: number | null;
};

function rankByScore(rows: Row[], getScore: (row: Row) => number) {
  return [...rows].sort((a, b) => getScore(b) - getScore(a) || b.xp - a.xp);
}

function Board({
  rows,
  userId,
  metric,
  getScore,
  getRank,
  scoreLabel = "XP",
}: {
  rows: Row[];
  userId: string;
  metric: string;
  getScore: (row: Row) => number;
  getRank?: (row: Row, index: number) => number;
  scoreLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          rows.map((p, i) => {
            const rank = getRank ? getRank(p, i) : i + 1;
            const isMe = p.id === userId;
            const initials = (p.display_name || "?").slice(0, 2).toUpperCase();
            const medal = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-700" : "";
            return (
              <Link
                key={`${metric}-${p.id}`}
                to="/u/$id"
                params={{ id: p.id }}
                className={`flex items-center gap-4 p-4 hover:bg-muted/40 transition ${isMe ? "bg-primary/5" : ""}`}
              >
                <div className={`w-8 text-center font-bold ${medal}`}>
                  {rank <= 3 ? <Medal className="h-5 w-5 mx-auto" /> : `#${rank}`}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {p.display_name} {isMe && <span className="text-xs text-primary">(you)</span>}
                  </p>
                  {p.college && <p className="text-xs text-muted-foreground truncate">{p.college}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {getScore(p).toLocaleString()} {scoreLabel}
                  </p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                    <Trophy className="h-3 w-3" /> L{p.level} <Flame className="h-3 w-3" /> {p.streak}d
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyTrendChart({
  members,
  points,
  config,
}: {
  members: Row[];
  points: Array<Record<string, string | number | null>>;
  config: ChartConfig;
}) {
  return (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6">
        <CardTitle className="text-base">Rank progression for this week’s leaders</CardTitle>
        <p className="text-sm text-muted-foreground">
          Weekly rank across the latest {points.length} weeks.
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        {members.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No members earned XP during this week.
          </p>
        ) : (
          <ChartContainer config={config} className="h-[320px] w-full">
            <RechartsLineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week_label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                reversed
                allowDecimals={false}
                domain={[1, "dataMax"]}
                tickFormatter={(rank: number) => `#${rank}`}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `Week of ${label}`}
                    formatter={(value) => (value == null ? "Not ranked" : `#${value}`)}
                  />
                }
              />
              {members.map((member, index) => (
                <Line
                  key={member.id}
                  type="monotone"
                  dataKey={member.id}
                  name={member.id}
                  stroke={`var(--color-${member.id})`}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                  strokeDasharray={index === 0 ? undefined : undefined}
                />
              ))}
            </RechartsLineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
