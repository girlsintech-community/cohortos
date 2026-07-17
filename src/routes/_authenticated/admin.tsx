import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Users,
  Rss,
  MessagesSquare,
  Target,
  Trophy,
  Flame,
  Heart,
  Mail,
  BookOpen,
  Search,
  UsersRound,
  Shield,
  Plus,
  Clock,
  Video,
  Calendar,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">
          Manage challenges, submissions, allowlist, and resources.
        </p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="allowlist">Allowlist</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="feedback">Feedback & Bugs</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="masterclasses">Masterclasses</TabsTrigger>
          <TabsTrigger value="cohort_todos">Cohort Tasks</TabsTrigger>
          <TabsTrigger value="screentime">Screen Time</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewPanel />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersPanel />
        </TabsContent>
        <TabsContent value="pods" className="mt-4">
          <PodsPanel />
        </TabsContent>
        <TabsContent value="submissions" className="mt-4">
          <SubmissionsPanel />
        </TabsContent>
        <TabsContent value="challenges" className="mt-4">
          <ChallengesPanel />
        </TabsContent>
        <TabsContent value="allowlist" className="mt-4">
          <AllowlistPanel />
        </TabsContent>
        <TabsContent value="resources" className="mt-4">
          <ResourcesPanel />
        </TabsContent>
        <TabsContent value="feedback" className="mt-4">
          <FeedbackPanel />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <EventsPanel />
        </TabsContent>
        <TabsContent value="masterclasses" className="mt-4">
          <MasterclassesPanel />
        </TabsContent>
        <TabsContent value="cohort_todos" className="mt-4">
          <CohortTodosPanel />
        </TabsContent>
        <TabsContent value="screentime" className="mt-4">
          <ScreenTimePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "detailed-overview"],
    queryFn: async () => {
      const heads = { count: "exact" as const, head: true };
      const [
        members,
        onboarded,
        postsCount,
        likesCount,
        discussionsCount,
        repliesCount,
        challengesCount,
        subsCount,
        subsPending,
        subsApproved,
        xpEvents,
        reactions,
        topMembers,
        popularPosts
      ] = await Promise.all([
        supabase.from("profiles").select("*", heads),
        supabase.from("profiles").select("*", heads).eq("onboarded", true),
        supabase.from("posts").select("*", heads),
        supabase.from("post_likes").select("*", heads),
        supabase.from("discussions").select("*", heads),
        supabase.from("discussion_replies").select("*", heads),
        supabase.from("challenges").select("*", heads),
        supabase.from("challenge_submissions").select("*", heads),
        supabase.from("challenge_submissions").select("*", heads).eq("status", "submitted"),
        supabase.from("challenge_submissions").select("*", heads).eq("status", "approved"),
        supabase.from("xp_events").select("event_type, xp_amount"),
        supabase.from("community_reactions").select("reaction_type, target_type"),
        supabase.from("profiles").select("display_name, username, xp, level, streak").order("xp", { ascending: false }).limit(10),
        supabase.from("posts").select("id, content, category, created_at, profiles!posts_author_profile_fkey(display_name, username), post_likes(user_id), post_comments(id)")
      ]);

      const totalXp = (topMembers.data ?? []).reduce((s: number, r: any) => s + (r.xp ?? 0), 0); // fallback or sum
      
      // Calculate daily logins count
      const dailyLoginsCount = (xpEvents.data ?? []).filter((e: any) => e.event_type === "daily_login").length;

      // Group reactions by type
      const reactionCounts = (reactions.data ?? []).reduce((acc: Record<string, number>, r: any) => {
        acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
        return acc;
      }, {});

      // Sort posts by popularity (likes + comments)
      const sortedPosts = (popularPosts.data ?? []).map((p: any) => ({
        ...p,
        likesCount: p.post_likes?.length ?? 0,
        commentsCount: p.post_comments?.length ?? 0,
        score: (p.post_likes?.length ?? 0) + (p.post_comments?.length ?? 0)
      })).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

      return {
        members: members.count ?? 0,
        onboarded: onboarded.count ?? 0,
        posts: postsCount.count ?? 0,
        likes: likesCount.count ?? 0,
        discussions: discussionsCount.count ?? 0,
        replies: repliesCount.count ?? 0,
        challenges: challengesCount.count ?? 0,
        subs: subsCount.count ?? 0,
        subsPending: subsPending.count ?? 0,
        subsApproved: subsApproved.count ?? 0,
        dailyLogins: dailyLoginsCount,
        reactionCounts,
        topMembers: topMembers.data ?? [],
        sortedPosts
      };
    },
  });

  if (isLoading || !data)
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const stats = [
    { icon: Users, label: "Members", value: data.members, sub: `${data.onboarded} onboarded` },
    { icon: Rss, label: "Posts", value: data.posts, sub: `${data.likes} likes` },
    { icon: MessagesSquare, label: "Discussions", value: data.discussions, sub: `${data.replies} replies` },
    { icon: Target, label: "Challenges", value: data.challenges, sub: `${data.subs} submissions` },
    { icon: CheckCircle2, label: "Pending Approvals", value: data.subsPending, sub: `${data.subsApproved} approved` },
    { icon: Flame, label: "Daily Logins Triggered", value: data.dailyLogins, sub: "Total login events tracked" },
  ];

  // Activity breakdown for Bar Chart
  const activityData = [
    { name: "Posts", count: data.posts },
    { name: "Comments", count: data.replies }, // comments in discussions
    { name: "Replies", count: data.replies }, // post comments
    { name: "Discussions", count: data.discussions },
    { name: "Daily Logins", count: data.dailyLogins },
    { name: "Likes Given", count: data.likes },
  ];

  // Reactions breakdown for Pie Chart
  const reactionColors = {
    helpful: "#3b82f6",          // blue
    great_explanation: "#10b981",// emerald
    motivated_me: "#f59e0b",     // amber
    clever_solution: "#8b5cf6",  // purple
    upvote: "#ec4899",           // pink
    mentor_helpful: "#ef4444"    // red
  };

  const reactionData = Object.keys(data.reactionCounts).map(key => ({
    name: key.replace("_", " ").toUpperCase(),
    value: data.reactionCounts[key],
    color: (reactionColors as any)[key] || "#6b7280"
  }));

  return (
    <div className="space-y-6">
      {/* Cards summary grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart analytics grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">User Engagement & Activity Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Community Reactions Share</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col justify-between">
            {reactionData.length === 0 ? (
              <div className="flex-1 grid place-items-center text-xs text-muted-foreground">
                No reaction events registered yet.
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={reactionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reactionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] border-t pt-3">
                  {reactionData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="truncate text-muted-foreground">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard and Popular posts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Most Active Members (XP Points) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Most Active Members (XP Points)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Member</th>
                  <th className="p-3 text-right">Streak</th>
                  <th className="p-3 text-right">Lvl</th>
                  <th className="p-3 text-right font-bold">XP</th>
                </tr>
              </thead>
              <tbody>
                {data.topMembers.map((m: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground font-medium">#{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-semibold">{m.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{m.username}</p>
                    </td>
                    <td className="p-3 text-right text-orange-500 font-medium">🔥 {m.streak ?? 0}d</td>
                    <td className="p-3 text-right">{m.level ?? 1}</td>
                    <td className="p-3 text-right font-bold text-primary">{(m.xp ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Most Liked Feed Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Trending Feed Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.sortedPosts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No feed updates posted yet.</p>
            ) : (
              data.sortedPosts.map((p: any, index: number) => (
                <div key={p.id} className="flex items-start gap-3 rounded border p-3 bg-muted/20 hover:bg-muted/30 transition text-xs">
                  <span className="font-bold text-muted-foreground text-sm shrink-0 mt-0.5">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{p.profiles?.display_name ?? "Someone"}</p>
                    <p className="mt-1 text-muted-foreground line-clamp-2 italic">"{p.content}"</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge className="capitalize text-[10px]" variant="outline">{p.category}</Badge>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3 fill-destructive/15 text-destructive" /> {p.likesCount}</span>
                        <span className="flex items-center gap-1"><MessagesSquare className="h-3 w-3" /> {p.commentsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MembersPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, username, avatar_url, college, branch, graduation_year, city, state, xp, level, streak, onboarded, created_at, linkedin_url, github_url, primary_role",
        )
        .order("xp", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.rpc("set_user_primary_role", {
        _target: userId,
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!data?.length) return <p className="text-sm text-muted-foreground">No members yet.</p>;

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">Member</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">College</th>
              <th className="p-3 font-medium">Location</th>
              <th className="p-3 font-medium">Year</th>
              <th className="p-3 font-medium text-right">XP</th>
              <th className="p-3 font-medium text-right">Lvl</th>
              <th className="p-3 font-medium text-right">🔥</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Links</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <p className="font-medium">{m.display_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {(m as any).username ? `@${(m as any).username} · ` : ""}Joined{" "}
                    {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td className="p-3">
                  <Select
                    value={(m as any).primary_role ?? "mentee"}
                    onValueChange={(v) => setRole.mutate({ userId: m.id, role: v })}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentee">Mentee</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="team_member">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  {m.college ?? "—"}
                  <div className="text-xs text-muted-foreground">{m.branch ?? ""}</div>
                </td>
                <td className="p-3">{[m.city, m.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="p-3">{m.graduation_year ?? "—"}</td>
                <td className="p-3 text-right font-semibold">{(m.xp ?? 0).toLocaleString()}</td>
                <td className="p-3 text-right">{m.level ?? 1}</td>
                <td className="p-3 text-right">{m.streak ?? 0}</td>
                <td className="p-3">
                  <Badge
                    variant={m.onboarded ? "default" : "outline"}
                    className={m.onboarded ? "bg-success text-success-foreground" : ""}
                  >
                    {m.onboarded ? "Active" : "Pending"}
                  </Badge>
                </td>
                <td className="p-3 text-xs space-x-2">
                  {m.linkedin_url && (
                    <a
                      className="text-primary hover:underline"
                      href={m.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LI
                    </a>
                  )}
                  {m.github_url && (
                    <a
                      className="text-primary hover:underline"
                      href={m.github_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      GH
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SubmissionsPanel() {
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select(
          "id, status, solution_url, notes, created_at, user_id, screenshot_url, feedback, challenges(title, xp_reward), profiles!challenge_submissions_user_profile_fkey(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_submission", { _submission_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approved & XP awarded");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, feedback }: { id: string; feedback: string }) => {
      const { error } = await supabase
        .from("challenge_submissions")
        .update({ status: "rejected", feedback: feedback.trim() || null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rejected");
      setRejectingId(null);
      setFeedbackText("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!data?.length) return <p className="text-muted-foreground text-sm">No submissions yet.</p>;

  return (
    <div className="space-y-3">
      {data.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold">{s.profiles?.display_name ?? "Someone"}</span> →{" "}
                <span className="font-medium">{s.challenges?.title}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  (+{s.challenges?.xp_reward} XP)
                </span>
              </p>
              {s.solution_url && (
                <a
                  href={s.solution_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline block"
                >
                  {s.solution_url}
                </a>
              )}
              {s.screenshot_url && (
                <div className="mt-2">
                  <a
                    href={s.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block border rounded hover:opacity-90 transition max-w-[200px]"
                  >
                    <img
                      src={s.screenshot_url}
                      alt="Challenge screenshot"
                      className="max-h-24 object-contain rounded"
                    />
                    <span className="text-[10px] text-muted-foreground block text-center py-0.5 border-t bg-muted/20">
                      View full screenshot
                    </span>
                  </a>
                </div>
              )}
              {s.notes && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{s.notes}</p>
              )}
            </div>
            {s.status === "submitted" ? (
              <div className="flex flex-col gap-2">
                {rejectingId === s.id ? (
                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <Textarea
                      placeholder="Add feedback/reason..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="text-xs min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => reject.mutate({ id: s.id, feedback: feedbackText })}
                        disabled={reject.isPending}
                        className="text-xs flex-1"
                      >
                        Confirm Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectingId(null);
                          setFeedbackText("");
                        }}
                        className="text-xs flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approve.mutate(s.id)}
                      disabled={approve.isPending}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectingId(s.id);
                        setFeedbackText("");
                      }}
                      disabled={reject.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-right">
                <Badge
                  variant={s.status === "approved" ? "default" : "outline"}
                  className={
                    s.status === "approved"
                      ? "bg-success text-success-foreground"
                      : "text-destructive"
                  }
                >
                  {s.status}
                </Badge>
                {s.status === "rejected" && s.feedback && (
                  <p className="text-[11px] text-destructive mt-1 max-w-[250px] break-words text-left sm:text-right">
                    <strong>Feedback:</strong> {s.feedback}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChallengesPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [xp, setXp] = useState("50");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: challenges } = useQuery({
    queryKey: ["admin", "challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function startEdit(c: any) {
    setEditingId(c.id);
    setTitle(c.title);
    setDescription(c.description ?? "");
    setLink(c.link ?? "");
    setDifficulty(c.difficulty ?? "easy");
    setXp(String(c.xp_reward ?? 50));
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLink("");
    setDifficulty("easy");
    setXp("50");
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !description.trim()) throw new Error("Title and description required");
      const { error } = await supabase.from("challenges").insert({
        title: title.trim(),
        description: description.trim(),
        link: link.trim() || null,
        difficulty,
        xp_reward: Number(xp) || 50,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      cancelEdit();
      toast.success("Challenge created");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("No challenge selected");
      if (!title.trim() || !description.trim()) throw new Error("Title and description required");
      const { error } = await supabase
        .from("challenges")
        .update({
          title: title.trim(),
          description: description.trim(),
          link: link.trim() || null,
          difficulty,
          xp_reward: Number(xp) || 50,
        })
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      cancelEdit();
      toast.success("Challenge updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("challenges")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit challenge" : "New challenge"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Problem link</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://leetcode.com/…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>XP reward</Label>
              <Input type="number" value={xp} onChange={(e) => setXp(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button
                  onClick={() => update.mutate()}
                  disabled={update.isPending}
                  className="flex-1"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                  changes
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="flex-1">
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="w-full"
                style={{ background: "var(--gradient-primary)" }}
              >
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All challenges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {challenges?.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {challenges?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.difficulty} · +{c.xp_reward} XP {c.is_active ? "" : "· inactive"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit(c)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggle.mutate({ id: c.id, active: !c.is_active })}
              >
                {c.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                if (confirm("Delete this challenge?")) remove.mutate(c.id);
              }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pods Panel ───
function PodsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"mentee" | "mentor" | "team_member">("mentee");

  const { data: pods } = useQuery({
    queryKey: ["admin", "pods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("id, name, description, mentor_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        name: string;
        description: string | null;
        mentor_id: string | null;
        created_at: string;
      }>;
    },
  });

  const { data: podMembers } = useQuery({
    queryKey: ["admin", "pod-members", selectedPodId],
    enabled: !!selectedPodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_members")
        .select(
          "id, user_id, member_role, profiles!pod_members_user_id_fkey(display_name, username, avatar_url)",
        )
        .eq("pod_id", selectedPodId!);
      if (error) throw error;
      return data as any[];
    },
  });

  async function findProfileByEmail(email: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("find_profile_by_email" as any, {
      _email: email.trim().toLowerCase(),
    });
    if (error) {
      toast.error("Lookup failed", { description: error.message });
      return null;
    }
    return (data as string | null) ?? null;
  }

  const createPod = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Pod name required");
      let mentorId: string | null = null;
      if (mentorEmail.trim()) {
        mentorId = await findProfileByEmail(mentorEmail);
        if (!mentorId) throw new Error("Mentor email not found in profiles");
      }
      const { data, error } = await supabase
        .from("pods")
        .insert({ name: name.trim(), description: description.trim() || null, mentor_id: mentorId })
        .select("id")
        .single();
      if (error) throw error;
      if (mentorId) {
        await supabase
          .from("pod_members")
          .insert({ pod_id: data.id, user_id: mentorId, member_role: "mentor" });
      }
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setMentorEmail("");
      toast.success("Pod created");
      qc.invalidateQueries({ queryKey: ["admin", "pods"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!selectedPodId) throw new Error("Select a pod first");
      if (!addEmail.trim()) throw new Error("Enter an email");
      const uid = await findProfileByEmail(addEmail);
      if (!uid) throw new Error("No profile found for that email");
      const { error } = await supabase
        .from("pod_members")
        .insert({ pod_id: selectedPodId, user_id: uid, member_role: addRole });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddEmail("");
      toast.success("Member added");
      qc.invalidateQueries({ queryKey: ["admin", "pod-members", selectedPodId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pod_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pod-members", selectedPodId] }),
  });

  const deletePod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pod deleted");
      setSelectedPodId(null);
      qc.invalidateQueries({ queryKey: ["admin", "pods"] });
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" /> Create pod
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pod name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mentor email (optional)</Label>
              <Input
                value={mentorEmail}
                onChange={(e) => setMentorEmail(e.target.value)}
                placeholder="mentor@example.com"
              />
            </div>
            <Button
              onClick={() => createPod.mutate()}
              disabled={createPod.isPending}
              className="w-full"
              style={{ background: "var(--gradient-primary)" }}
            >
              {createPod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" /> Create pod
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All pods ({(pods ?? []).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {(pods ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">None yet.</p>
            )}
            {(pods ?? []).map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded border p-2 cursor-pointer ${selectedPodId === p.id ? "bg-primary/5 border-primary/40" : ""}`}
                onClick={() => setSelectedPodId(p.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete pod "${p.name}"?`)) deletePod.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedPodId ? "Manage members" : "Select a pod to manage members"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedPodId ? (
            <p className="text-sm text-muted-foreground">Click a pod on the left to add members.</p>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="member@example.com"
                />
                <Select value={addRole} onValueChange={(v) => setAddRole(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentee">Mentee</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="team_member">Team</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => addMember.mutate()} disabled={addMember.isPending}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Suggested: 1 mentor + up to 7 mentees. Team members can assist.
              </p>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {(podMembers ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
                ) : (
                  (podMembers ?? []).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 rounded border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.profiles?.display_name ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.profiles?.username ? `@${m.profiles.username}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={m.member_role === "mentor" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {m.member_role}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Allowlist Panel ───
function AllowlistPanel() {
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const { data: emails, isLoading } = useQuery({
    queryKey: ["admin", "allowlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Array<{ id: string; email: string; created_at: string }>;
    },
  });

  const addOne = useMutation({
    mutationFn: async () => {
      const e = newEmail.trim().toLowerCase();
      if (!e || !e.includes("@")) throw new Error("Invalid email");
      const { error } = await supabase.from("allowed_emails").insert({ email: e });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewEmail("");
      toast.success("Email added");
      qc.invalidateQueries({ queryKey: ["admin", "allowlist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBulk = useMutation({
    mutationFn: async () => {
      const lines = bulkEmails
        .split(/[,\n;]+/)
        .map((l) => l.trim().toLowerCase())
        .filter((l) => l && l.includes("@"));
      if (lines.length === 0) throw new Error("No valid emails found");
      const rows = lines.map((email) => ({ email }));
      const { error } = await supabase
        .from("allowed_emails")
        .upsert(rows, { onConflict: "email", ignoreDuplicates: true });
      if (error) throw error;
      return lines.length;
    },
    onSuccess: (count) => {
      setBulkEmails("");
      toast.success(`Added ${count} emails`);
      qc.invalidateQueries({ queryKey: ["admin", "allowlist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email removed");
      qc.invalidateQueries({ queryKey: ["admin", "allowlist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (emails ?? []).filter(
    (e) => !searchQ.trim() || e.email.toLowerCase().includes(searchQ.toLowerCase()),
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Add email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@gmail.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOne.mutate();
                  }
                }}
              />
              <Button onClick={() => addOne.mutate()} disabled={addOne.isPending}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={6}
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="Paste emails — one per line, comma-separated, or semicolon-separated"
            />
            <Button
              onClick={() => addBulk.mutate()}
              disabled={addBulk.isPending}
              className="w-full"
            >
              {addBulk.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import emails
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allowed emails ({(emails ?? []).length})</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto space-y-1">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No emails found.</p>
          ) : (
            filtered.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/40 text-sm group"
              >
                <span className="truncate">{e.email}</span>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${e.email}?`)) remove.mutate(e.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Resources Panel ───
function ResourcesPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("General");
  const [customCategory, setCustomCategory] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const PRESET_CATEGORIES = ["General", "DSA", "DSA Sheets", "Interview Prep", "Tools", "Career", "Web Dev", "System Design"];

  const { data: resources } = useQuery({
    queryKey: ["admin", "resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        title: string;
        description: string | null;
        url: string;
        category: string;
        is_active: boolean;
        created_at: string;
      }>;
    },
  });

  const existingCategories = [...new Set([...PRESET_CATEGORIES, ...(resources ?? []).map((r) => r.category)])];

  function getEffectiveCategory() {
    return useCustomCategory ? customCategory.trim() : category;
  }

  function startEdit(r: any) {
    setEditingId(r.id);
    setTitle(r.title);
    setDescription(r.description ?? "");
    setUrl(r.url);
    const isPreset = PRESET_CATEGORIES.includes(r.category);
    if (isPreset) {
      setCategory(r.category);
      setUseCustomCategory(false);
      setCustomCategory("");
    } else {
      setUseCustomCategory(true);
      setCustomCategory(r.category);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setCategory("General");
    setCustomCategory("");
    setUseCustomCategory(false);
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !url.trim()) throw new Error("Title and URL are required");
      const effectiveCat = getEffectiveCategory();
      if (!effectiveCat) throw new Error("Category is required");
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
      const { error } = await supabase.from("resources").insert({
        title: title.trim(),
        description: description.trim() || null,
        url: finalUrl,
        category: effectiveCat,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      cancelEdit();
      toast.success("Resource added");
      qc.invalidateQueries({ queryKey: ["admin", "resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateResource = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("No resource selected");
      if (!title.trim() || !url.trim()) throw new Error("Title and URL are required");
      const effectiveCat = getEffectiveCategory();
      if (!effectiveCat) throw new Error("Category is required");
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
      const { error } = await supabase
        .from("resources")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          url: finalUrl,
          category: effectiveCat,
        })
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      cancelEdit();
      toast.success("Resource updated");
      qc.invalidateQueries({ queryKey: ["admin", "resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("resources").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> {editingId ? "Edit resource" : "New resource"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <button
                type="button"
                onClick={() => setUseCustomCategory((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {useCustomCategory ? "Use preset" : "+ Custom category"}
              </button>
            </div>
            {useCustomCategory ? (
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Type a custom category name…"
                maxLength={60}
              />
            ) : (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button
                  onClick={() => updateResource.mutate()}
                  disabled={updateResource.isPending}
                  className="flex-1"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {updateResource.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="flex-1">
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="w-full"
                style={{ background: "var(--gradient-primary)" }}
              >
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add resource
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All resources ({(resources ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {(resources ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )}
          {(resources ?? []).map((r) => (
            <div key={r.id} className="flex items-start gap-2 rounded border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.category} {r.is_active ? "" : "· hidden"}
                </p>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline truncate block"
                >
                  {r.url}
                </a>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit(r)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggle.mutate({ id: r.id, active: !r.is_active })}
              >
                {r.is_active ? "Hide" : "Show"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Delete?")) remove.mutate(r.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Feedback & Bugs Panel ───
function FeedbackPanel() {
  const qc = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin", "feedback-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_reports")
        .select("id, type, message, created_at, profiles(display_name, username)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      qc.invalidateQueries({ queryKey: ["admin", "feedback-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Feedback & Bug Reports ({(reports ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(reports ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No reports received yet! Everything is running smoothly. ✨
            </p>
          )}
          {(reports ?? []).map((r) => {
            const isBug = r.type === "bug_report";
            return (
              <div key={r.id} className="flex gap-4 items-start rounded-lg border p-4 bg-card hover:bg-muted/10 transition">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={isBug ? "destructive" : "default"} className="capitalize">
                      {isBug ? "Bug Report" : "Suggestion"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-all">{r.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted by: <strong>{r.profiles?.display_name ?? "Unknown"}</strong> (@{r.profiles?.username ?? "unknown"})
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Mark as resolved and delete this report?")) remove.mutate(r.id);
                  }}
                  className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Masterclasses Management Panel ───
// ─── Events & Masterclasses Management Panel ───
function EventsPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<"masterclass" | "event" | "workshop" | "deadline">("masterclass");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !scheduledAt) {
        throw new Error("Title and Date & Time are required.");
      }
      setBusy(true);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
        meeting_link: meetingLink.trim() || null,
        banner_image_url: bannerImageUrl.trim() || null,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event scheduled! All mentees have been notified.");
      setTitle("");
      setDescription("");
      setEventType("masterclass");
      setScheduledAt("");
      setDurationMinutes("");
      setMeetingLink("");
      setBannerImageUrl("");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule a New Event / Masterclass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Resume Building Masterclass" />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={eventType} onValueChange={(v: any) => setEventType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masterclass">Masterclass</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="60" />
            </div>
            <div className="space-y-1.5">
              <Label>Meeting / Join Link</Label>
              <Input type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Banner Image URL (Optional)</Label>
              <Input type="url" value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this event about?" />
          </div>
          <Button disabled={busy} onClick={() => create.mutate()} className="w-full text-white" style={{ background: "var(--gradient-primary)" }}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule Event & Notify Mentees
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Events ({(events ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (events ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No events scheduled yet.</p>
          ) : (
            <div className="divide-y space-y-3">
              {(events ?? []).map((ev: any) => (
                <div key={ev.id} className="flex justify-between items-start gap-4 pt-3 first:pt-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{ev.title}</p>
                      <Badge variant="outline" className="text-[10px]">{ev.event_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.scheduled_at).toLocaleString(undefined, {
                        weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this event?")) remove.mutate(ev.id); }} className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Masterclass Recordings Management Panel ───
function MasterclassesPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [watchLink, setWatchLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [speakerLinkedin, setSpeakerLinkedin] = useState("");
  const [speakerDesignation, setSpeakerDesignation] = useState("");
  const [speakerBio, setSpeakerBio] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: masterclasses, isLoading } = useQuery({
    queryKey: ["admin", "masterclasses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("masterclasses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !watchLink.trim() || !speakerName.trim()) {
        throw new Error("Title, Watch Link, and Speaker Name are required.");
      }
      setBusy(true);
      const { error } = await supabase.from("masterclasses").insert({
        title: title.trim(),
        description: description.trim() || null,
        watch_link: watchLink.trim(),
        image_url: imageUrl.trim() || null,
        speaker_name: speakerName.trim(),
        speaker_linkedin: speakerLinkedin.trim() || null,
        speaker_designation: speakerDesignation.trim() || null,
        speaker_bio: speakerBio.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Masterclass created successfully!");
      setTitle("");
      setDescription("");
      setWatchLink("");
      setImageUrl("");
      setSpeakerName("");
      setSpeakerLinkedin("");
      setSpeakerDesignation("");
      setSpeakerBio("");
      qc.invalidateQueries({ queryKey: ["admin", "masterclasses"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("masterclasses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Masterclass deleted");
      qc.invalidateQueries({ queryKey: ["admin", "masterclasses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Masterclass recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Session Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. System Design Basics" />
            </div>
            <div className="space-y-1.5">
              <Label>Watch Link *</Label>
              <Input type="url" value={watchLink} onChange={(e) => setWatchLink(e.target.value)} placeholder="https://youtube.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail Image URL (Optional)</Label>
              <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Speaker Name *</Label>
              <Input value={speakerName} onChange={(e) => setSpeakerName(e.target.value)} placeholder="E.g. Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Speaker Designation</Label>
              <Input value={speakerDesignation} onChange={(e) => setSpeakerDesignation(e.target.value)} placeholder="E.g. Staff Engineer at Google" />
            </div>
            <div className="space-y-1.5">
              <Label>Speaker LinkedIn URL</Label>
              <Input type="url" value={speakerLinkedin} onChange={(e) => setSpeakerLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Session Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was covered in this masterclass?" />
          </div>
          <div className="space-y-1.5">
            <Label>Speaker Bio</Label>
            <Textarea rows={3} value={speakerBio} onChange={(e) => setSpeakerBio(e.target.value)} placeholder="Brief speaker introduction..." />
          </div>
          <Button disabled={busy} onClick={() => create.mutate()} className="w-full text-white" style={{ background: "var(--gradient-primary)" }}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Masterclass
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Masterclasses ({(masterclasses ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (masterclasses ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No masterclass recordings uploaded yet.</p>
          ) : (
            <div className="divide-y space-y-3">
              {(masterclasses ?? []).map((mc: any) => (
                <div key={mc.id} className="flex justify-between items-start gap-4 pt-3 first:pt-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-sm">{mc.title}</p>
                    <p className="text-xs text-muted-foreground">Speaker: <strong>{mc.speaker_name}</strong> {mc.speaker_designation ? `(${mc.speaker_designation})` : ""}</p>
                    <a href={mc.watch_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <Play className="h-3 w-3" /> Watch Link
                    </a>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm("Delete this masterclass?")) remove.mutate(mc.id); }} className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Cohort To-Dos Management Panel ───
function CohortTodosPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: todos, isLoading } = useQuery({
    queryKey: ["admin", "cohort-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cohort_todos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Task Title is required.");
      setBusy(true);
      const { error } = await supabase.from("cohort_todos").insert({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cohort To-Do created!");
      setTitle("");
      setDescription("");
      setDueDate("");
      qc.invalidateQueries({ queryKey: ["admin", "cohort-todos"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cohort_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["admin", "cohort-todos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Cohort Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Task Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Attend Masterclass & Take Notes" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (Optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What details should mentees know about this task?" />
          </div>
          <Button disabled={busy} onClick={() => create.mutate()} className="w-full text-white" style={{ background: "var(--gradient-primary)" }}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Task
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Cohort Tasks ({(todos ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (todos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No active cohort tasks.</p>
          ) : (
            <div className="divide-y space-y-3">
              {(todos ?? []).map((t: any) => (
                <div key={t.id} className="flex justify-between items-start gap-4 pt-3 first:pt-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-sm">{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    {t.due_date && (
                      <span className="inline-block text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 font-bold uppercase mt-1">
                        Due: {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm("Delete this cohort task?")) remove.mutate(t.id); }} className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Screen Time Analytics Panel ───
function ScreenTimePanel() {
  const { data: times, isLoading } = useQuery({
    queryKey: ["admin", "screentime"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_screen_time")
        .select(`
          seconds_spent,
          date,
          user_id,
          profiles:user_id(display_name, username)
        `);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Process data
  const userMap: Record<string, { display_name: string; username: string; today: number; lifetime: number }> = {};
  const todayStr = new Date().toISOString().split("T")[0];
  let totalCohortSeconds = 0;
  let todayCohortSeconds = 0;

  (times ?? []).forEach((row: any) => {
    const uid = row.user_id;
    const name = row.profiles?.display_name || "Unknown User";
    const username = row.profiles?.username || "unknown";
    const sec = row.seconds_spent || 0;

    totalCohortSeconds += sec;
    if (row.date === todayStr) {
      todayCohortSeconds += sec;
    }

    if (!userMap[uid]) {
      userMap[uid] = { display_name: name, username: username, today: 0, lifetime: 0 };
    }
    userMap[uid].lifetime += sec;
    if (row.date === todayStr) {
      userMap[uid].today += sec;
    }
  });

  const usersList = Object.values(userMap)
    .map(u => ({
      ...u,
      todayMinutes: Math.round(u.today / 60),
      lifetimeMinutes: Math.round(u.lifetime / 60),
      lifetimeHours: parseFloat((u.lifetime / 3600).toFixed(1))
    }))
    .sort((a, b) => b.lifetimeMinutes - a.lifetimeMinutes);

  // Group by date for line/area chart of last 7 days
  const dateMap: Record<string, number> = {};
  (times ?? []).forEach((row: any) => {
    const d = row.date;
    dateMap[d] = (dateMap[d] || 0) + (row.seconds_spent || 0);
  });

  const chartData = Object.entries(dateMap)
    .map(([date, sec]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      minutes: Math.round(sec / 60)
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7); // Last 7 active days

  const barData = usersList.slice(0, 8).map(u => ({
    name: u.display_name,
    minutes: u.lifetimeMinutes
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Cohort Time</span>
            <p className="text-3xl font-extrabold text-foreground mt-1">
              {Math.round(totalCohortSeconds / 3600)} hrs
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Accumulated app-open time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Active Time Today</span>
            <p className="text-3xl font-extrabold text-primary mt-1">
              {Math.round(todayCohortSeconds / 60)} mins
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Across all logged-in members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Active Members Today</span>
            <p className="text-3xl font-extrabold text-foreground mt-1">
              {Object.values(userMap).filter(u => u.today > 0).length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Members with session heartbeat pings</p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cohort Engagement (Past 7 Active Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-20">Not enough activity data to plot.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="minutes" stroke="var(--color-primary, #6366f1)" strokeWidth={2} fillOpacity={1} fill="url(#colorMinutes)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Active Members (Lifetime Minutes)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {barData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-20">No user session logs found.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="minutes" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Screen Time Table */}
      <Card>
        <CardHeader>
          <CardTitle>Member Session Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground font-semibold">
                  <th className="py-2.5">Member</th>
                  <th className="py-2.5">Username</th>
                  <th className="py-2.5 text-right">Time Spent Today</th>
                  <th className="py-2.5 text-right">Lifetime Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usersList.map((u, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="py-2.5 font-medium">{u.display_name}</td>
                    <td className="py-2.5 text-muted-foreground">@{u.username}</td>
                    <td className="py-2.5 text-right font-medium text-primary">
                      {u.todayMinutes > 0 ? `${u.todayMinutes}m` : "—"}
                    </td>
                    <td className="py-2.5 text-right font-medium text-foreground">
                      {u.lifetimeMinutes > 60 ? `${u.lifetimeHours}h` : `${u.lifetimeMinutes}m`}
                    </td>
                  </tr>
                ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No user screen time recorded yet. Heartbeats will update automatically as users browse.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}