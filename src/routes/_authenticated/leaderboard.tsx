import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Loader2, Medal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = Route.useRouteContext();
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard 🏆</h1>
        <p className="text-muted-foreground">Top XP earners across the cohort.</p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {data?.map((p, i) => {
              const rank = i + 1;
              const isMe = p.id === user.id;
              const initials = (p.display_name || "?").slice(0, 2).toUpperCase();
              const medal = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-700" : "";
              return (
                <div key={p.id} className={`flex items-center gap-4 p-4 ${isMe ? "bg-primary/5" : ""}`}>
                  <div className={`w-8 text-center font-bold ${medal}`}>
                    {rank <= 3 ? <Medal className="h-5 w-5 mx-auto" /> : `#${rank}`}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.display_name} {isMe && <span className="text-xs text-primary">(you)</span>}</p>
                    {p.college && <p className="text-xs text-muted-foreground truncate">{p.college}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{p.xp.toLocaleString()} XP</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-2"><Trophy className="h-3 w-3" /> L{p.level} <Flame className="h-3 w-3" /> {p.streak}d</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}