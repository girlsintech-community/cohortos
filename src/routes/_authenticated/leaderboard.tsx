import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Loader2, Medal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp, level, streak, college")
        .order("xp", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: scores } = useQuery({
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard 🏆</h1>
        <p className="text-muted-foreground">Top XP earners across the cohort.</p>
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

type Row = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak: number;
  college: string | null;
};

function rankByScore(rows: Row[], getScore: (row: Row) => number) {
  return [...rows].sort((a, b) => getScore(b) - getScore(a) || b.xp - a.xp);
}

function Board({
  rows,
  userId,
  metric,
  getScore,
}: {
  rows: Row[];
  userId: string;
  metric: string;
  getScore: (row: Row) => number;
}) {
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          rows.map((p, i) => {
            const rank = i + 1;
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
                  <p className="font-bold text-primary">{getScore(p).toLocaleString()} XP</p>
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
