import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Zap, Target, Users, MessageSquare, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const XP_PER_LEVEL = 500;

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rank } = useQuery({
    queryKey: ["rank", user.id, profile?.xp],
    enabled: !!profile,
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gt("xp", profile?.xp ?? 0);
      return (count ?? 0) + 1;
    },
  });

  const { data: totalUsers } = useQuery({
    queryKey: ["totalUsers"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.streak ?? 0;
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Learner";
  const progressToNext = (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;

  const missions = [
    { icon: MessageSquare, label: "Post an update in the feed", xp: 5, done: false },
    { icon: Target, label: "Answer a discussion question", xp: 8, done: false },
    { icon: CheckCircle2, label: "Submit today's challenge", xp: 100, done: false },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl p-6 sm:p-8 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elevated)" }}>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-sm text-primary-foreground/80">{greeting()},</p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">{name} 👋</h1>
            <p className="mt-2 text-primary-foreground/85 max-w-lg">
              You're on level {level} with {xp.toLocaleString()} XP. Keep shipping — every action counts.
            </p>
          </div>
          <div className="flex gap-3">
            <StatChip icon={Flame} label="Streak" value={`${streak}d`} />
            <StatChip icon={Trophy} label="Rank" value={rank ? `#${rank}` : "—"} />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="Total XP" value={xp.toLocaleString()} tone="primary" />
        <StatCard icon={Trophy} label="Level" value={level.toString()} tone="accent" sub={`${Math.round(progressToNext)}% to next`} progress={progressToNext} />
        <StatCard icon={Flame} label="Day streak" value={streak.toString()} tone="destructive" />
        <StatCard icon={Users} label="Cohort" value={(totalUsers ?? 0).toString()} tone="success" sub="members" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Today's missions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {missions.map((m) => (
              <div key={m.label} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <m.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground">+{m.xp} XP</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" /> Your progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Level {level}</span>
                <span className="font-medium">{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
              </div>
              <Progress value={progressToNext} className="h-2" />
            </div>
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">Feed, discussions & challenges land next.</p>
              <p className="text-xs text-muted-foreground mt-1">Your XP is already being tracked.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-primary-foreground/80"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, progress, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; progress?: number; tone: "primary" | "accent" | "success" | "destructive" }) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-accent-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {progress !== undefined && <Progress value={progress} className="h-1.5 mt-3" />}
      </CardContent>
    </Card>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}