import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Trophy,
  Zap,
  Target,
  Users,
  MessageSquare,
  CheckCircle2,
  Search,
  Heart,
  BarChart3,
  FileText,
  Code2,
  Briefcase,
  Linkedin,
  Network,
  Laptop,
  BookOpen,
  Clock,
  HelpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const XP_PER_LEVEL = 250;
const LEVEL_NAMES = [
  "Explorer",
  "Learner",
  "Problem Solver",
  "Builder",
  "Collaborator",
  "Contributor",
  "Mentor's Pick",
  "Cohort Champion",
];

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [guideOpen, setGuideOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: cohortTasks } = useQuery({
    queryKey: ["cohortTasks", user.id],
    queryFn: async () => {
      const { data: todos, error: todosErr } = await supabase
        .from("cohort_todos")
        .select("*")
        .order("created_at", { ascending: false });
      if (todosErr) throw todosErr;

      const { data: completions, error: compErr } = await supabase
        .from("user_todo_completions")
        .select("todo_id")
        .eq("user_id", user.id);
      if (compErr) throw compErr;

      const completedIds = new Set((completions ?? []).map((c) => c.todo_id));

      return (todos ?? []).map((t) => ({
        ...t,
        completed: completedIds.has(t.id),
      }));
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ todoId, completed }: { todoId: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("user_todo_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("todo_id", todoId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_todo_completions")
          .insert({
            user_id: user.id,
            todo_id: todoId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohortTasks", user.id] });
      toast.success("Task updated!");
    },
    onError: (err: any) => {
      toast.error("Failed to update task", { description: err.message });
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useQuery({
    queryKey: ["dailyLogin", user.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("record_daily_login");
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: rank } = useQuery({
    queryKey: ["rank", user.id, profile?.xp],
    enabled: !!profile,
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("xp", profile?.xp ?? 0);
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

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayIso = startOfDay.toISOString();

  const { data: todayCounts } = useQuery({
    queryKey: ["todayCounts", user.id],
    queryFn: async () => {
      const [posts, comments, replies, subs, xpEvents] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .gte("created_at", dayIso),
        supabase
          .from("post_comments")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .gte("created_at", dayIso),
        supabase
          .from("discussion_replies")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .gte("created_at", dayIso),
        supabase
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", dayIso),
        supabase
          .from("xp_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", dayIso),
      ]);
      return {
        posts: posts.count ?? 0,
        comments: (comments.count ?? 0) + (replies.count ?? 0),
        subs: subs.count ?? 0,
        xpEvents: xpEvents.count ?? 0,
      };
    },
  });

  const { data: streaks } = useQuery({
    queryKey: ["streaks", user.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_streaks")
        .select("streak_type, current_count, best_count")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as Array<{ streak_type: string; current_count: number; best_count: number }>;
    },
  });

  const { data: earnedBadges } = useQuery({
    queryKey: ["earnedBadges", user.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_badges")
        .select("badges(name, icon)")
        .eq("user_id", user.id)
        .order("awarded_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as Array<{ badges: { name: string; icon: string } | null }>;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url, college, primary_role, xp, level, skills, city, state, branch",
        )
        .eq("onboarded", true)
        .order("xp", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data as Array<{
        id: string;
        display_name: string;
        avatar_url: string | null;
        college: string | null;
        primary_role: string | null;
        xp: number;
        level: number;
        skills: string[] | null;
        city: string | null;
        state: string | null;
        branch: string | null;
      }>;
    },
  });

  const { data: platformStats } = useQuery({
    queryKey: ["platformStats"],
    queryFn: async () => {
      const [posts, comments, likes, subs, discussions] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("post_comments").select("id", { count: "exact", head: true }),
        supabase.from("post_likes").select("post_id", { count: "exact", head: true }),
        supabase
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase.from("discussions").select("id", { count: "exact", head: true }),
      ]);
      return {
        posts: posts.count ?? 0,
        comments: comments.count ?? 0,
        likes: likes.count ?? 0,
        subs: subs.count ?? 0,
        discussions: discussions.count ?? 0,
      };
    },
  });

  const [memberQ, setMemberQ] = useState("");
  const filteredMembers = (members ?? []).filter((m) => {
    if (!memberQ.trim()) return true;
    const s = memberQ.toLowerCase();
    return [
      m.display_name,
      m.college,
      m.city,
      m.state,
      m.branch,
      m.primary_role,
      ...(m.skills ?? []),
    ]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(s));
  });

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const levelName = LEVEL_NAMES[Math.min(Math.max(level, 1), 8) - 1];
  const streak = profile?.streak ?? 0;
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Learner";
  const progressToNext = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  const placementReadiness = [
    { label: "Resume", value: Math.min(100, (statsSafe(profile?.bio) + statsSafe(profile?.linkedin_url) + statsSafe(profile?.github_url) + statsSafe(profile?.college)) * 25), icon: FileText },
    { label: "DSA", value: Math.min(100, (todayCounts?.subs ?? 0) * 35 + xp / 30), icon: Code2 },
    { label: "Projects", value: Math.min(100, (profile?.github_url ? 35 : 0) + (todayCounts?.posts ?? 0) * 20 + xp / 40), icon: Laptop },
    { label: "LinkedIn", value: Math.min(100, (profile?.linkedin_url ? 60 : 0) + (todayCounts?.posts ?? 0) * 10), icon: Linkedin },
    { label: "Networking", value: Math.min(100, ((profile?.skills?.length ?? 0) * 8) + (todayCounts?.comments ?? 0) * 12), icon: Network },
    { label: "Mock Interviews", value: Math.min(100, xp / 35), icon: Briefcase },
  ];
  const overallReadiness = Math.round(
    placementReadiness.reduce((sum, item) => sum + item.value, 0) / placementReadiness.length,
  );

  const missions = [
    {
      icon: MessageSquare,
      label: "Post an update in the feed",
      xp: 5,
      done: (todayCounts?.posts ?? 0) > 0,
    },
    {
      icon: Target,
      label: "Reply to a post or discussion",
      xp: 3,
      done: (todayCounts?.comments ?? 0) > 0,
    },
    {
      icon: CheckCircle2,
      label: "Submit today's challenge",
      xp: 100,
      done: (todayCounts?.subs ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-primary-foreground relative overflow-hidden"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-sm text-primary-foreground/80">{greeting()},</p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">{name} 👋</h1>
            <p className="mt-2 text-primary-foreground/85 max-w-lg">
              You're a Level {level} {levelName} with {xp.toLocaleString()} XP. Every point should
              represent employability progress.
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
        <StatCard
          icon={Trophy}
          label="Level"
          value={`${level}`}
          tone="accent"
          sub={levelName}
          progress={progressToNext}
        />
        <StatCard icon={Flame} label="Day streak" value={streak.toString()} tone="destructive" />
        <StatCard
          icon={Users}
          label="Cohort"
          value={(totalUsers ?? 0).toString()}
          tone="success"
          sub="members"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Target className="h-5 w-5 text-primary" /> Today's quest
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missions.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <m.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground">+{m.xp} XP</p>
                    </div>
                  </div>
                  <Badge variant={m.done ? "default" : "outline"} className="text-xs">
                    {m.done ? "Done ✓" : "Pending"}
                  </Badge>
                </div>
              ))}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Quest completion</span>
                  <span className="text-primary font-semibold">
                    {Math.round((missions.filter((m) => m.done).length / missions.length) * 100)}%
                  </span>
                </div>
                <Progress value={(missions.filter((m) => m.done).length / missions.length) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Clock className="h-5 w-5 text-primary" /> Cohort Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(cohortTasks ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tasks assigned to the cohort yet.</p>
              ) : (
                <div className="space-y-3">
                  {(cohortTasks ?? []).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTask.mutate({ todoId: t.id, completed: t.completed })}
                      disabled={toggleTask.isPending}
                      className="flex items-start justify-between w-full rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`grid h-9 w-9 place-items-center rounded-lg shrink-0 ${t.completed ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>
                          {t.completed ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium text-sm truncate ${t.completed ? 'line-through text-muted-foreground' : ''}`}>{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{t.description}</p>}
                          {t.due_date && (
                            <span className="inline-block text-[10px] text-destructive bg-destructive/10 border border-destructive/20 rounded px-1.5 py-0.5 font-bold uppercase mt-1">
                              Due: {new Date(t.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={t.completed ? "default" : "outline"} className={`text-xs ml-3 ${t.completed ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}>
                        {t.completed ? "Completed ✓" : "Mark Complete"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" /> Placement readiness
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                onClick={() => setGuideOpen(true)}
                title="How is this calculated?"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold">Overall readiness</span>
                  <span className="font-bold text-primary">{overallReadiness}%</span>
                </div>
                <Progress value={overallReadiness} className="h-2" />
              </div>
              <div className="space-y-3">
                {placementReadiness.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <item.icon className="h-3.5 w-3.5" /> {item.label}
                      </span>
                      <span className="font-medium">{Math.round(item.value)}%</span>
                    </div>
                    <Progress value={item.value} className="h-1.5" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Level {level} · {levelName}</span>
                  <span className="font-medium">
                    {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
              </div>
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-sm font-medium">Badges</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(earnedBadges ?? []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">Earn badges through helpful, consistent work.</span>
                  ) : (
                    earnedBadges?.map((b, index) => (
                      <Badge key={`${b.badges?.name}-${index}`} variant="secondary">
                        {b.badges?.icon} {b.badges?.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Trophy className="h-5 w-5 text-accent" /> Placement Readiness Guide
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Your scores reflect key employability metrics. Here is how they are calculated and updated:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-primary">1. Resume (up to 100%)</p>
                  <p className="text-xs text-muted-foreground">
                    Completion of your profile details. Adds <strong>25%</strong> each for adding a <strong>Bio</strong>, <strong>LinkedIn URL</strong>, <strong>GitHub URL</strong>, and <strong>College</strong>.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary">2. DSA (up to 100%)</p>
                  <p className="text-xs text-muted-foreground">
                    Coding practice. Adds <strong>35%</strong> for each challenge submission today, plus a gradual increase based on your overall XP (XP / 30).
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary">3. Projects (up to 100%)</p>
                  <p className="text-xs text-muted-foreground">
                    Development work. Adds <strong>35%</strong> if your <strong>GitHub URL</strong> is linked, <strong>20%</strong> for each feed update posted today, and scales with your overall XP (XP / 40).
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary">4. LinkedIn (up to 100%)</p>
                  <p className="text-xs text-muted-foreground">
                    Professional branding. Adds <strong>60%</strong> if your <strong>LinkedIn URL</strong> is linked, plus <strong>10%</strong> for each feed update posted today.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary">5. Networking (up to 100%)</p>
                  <p className="text-xs text-muted-foreground">
                    Community interaction. Adds <strong>8%</strong> per listed skill (up to 12 skills), plus <strong>12%</strong> for each reply or comment posted today.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary">6. Mock Interviews (up to 100%)</p>
                  <p className="text-xs text-muted-foreground">
                    Preparation depth. Scales directly with your total XP (XP / 35). Gain XP by attending masterclasses, submitting challenges, and helping others!
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Habit streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["dsa", "DSA"],
              ["assignment", "Assignment"],
              ["learning", "Learning"],
              ["community_help", "Community help"],
              ["build", "Build"],
            ].map(([key, label]) => {
              const row = streaks?.find((s) => s.streak_type === key);
              return (
                <div key={key} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="text-lg">🔥</div>
                  <div className="mt-1 text-2xl font-bold">{row?.current_count ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{label} streak</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Cohort members
          </CardTitle>
          <Link to="/leaderboard" className="text-xs text-primary hover:underline">
            See leaderboard →
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={memberQ}
              onChange={(e) => setMemberQ(e.target.value)}
              placeholder="Search by name, college, city, skill…"
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full text-center py-6">
                No members match your search.
              </p>
            ) : (
              filteredMembers.map((m) => {
                const ini = (m.display_name || "?").slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={m.id}
                    to="/u/$id"
                    params={{ id: m.id }}
                    className="flex gap-3 rounded-lg border p-3 hover:bg-muted/40 transition"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {ini}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{m.display_name}</p>
                        {m.primary_role && (
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {m.primary_role.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      {m.college && (
                        <p className="text-xs text-muted-foreground truncate">{m.college}</p>
                      )}
                      {(m.city || m.state) && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[m.city, m.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Lvl {m.level} · {m.xp} XP
                      </p>
                      {m.skills && m.skills.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.skills.slice(0, 3).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Platform pulse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <PulseStat icon={MessageSquare} label="Posts" value={platformStats?.posts ?? 0} />
            <PulseStat icon={FileText} label="Replies" value={platformStats?.comments ?? 0} />
            <PulseStat icon={Heart} label="Likes" value={platformStats?.likes ?? 0} />
            <PulseStat icon={CheckCircle2} label="Challenges" value={platformStats?.subs ?? 0} />
            <PulseStat icon={Target} label="Discussions" value={platformStats?.discussions ?? 0} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function statsSafe(value: unknown) {
  return typeof value === "string" && value.trim() ? 1 : 0;
}

function PulseStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className="flex justify-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 text-xl font-bold">{value.toLocaleString()}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  tone: "primary" | "accent" | "success" | "destructive";
}) {
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
