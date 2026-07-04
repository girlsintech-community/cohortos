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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Trash2, Users, Rss, MessagesSquare, Target, Trophy, Flame, Heart } from "lucide-react";
import { toast } from "sonner";

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
        <p className="text-muted-foreground">Manage challenges and approve submissions.</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewPanel /></TabsContent>
        <TabsContent value="members" className="mt-4"><MembersPanel /></TabsContent>
        <TabsContent value="submissions" className="mt-4"><SubmissionsPanel /></TabsContent>
        <TabsContent value="challenges" className="mt-4"><ChallengesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const heads = { count: "exact" as const, head: true };
      const [members, onboarded, posts, likes, discussions, replies, challenges, subs, subsPending, subsApproved, xpRow] = await Promise.all([
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
        supabase.from("profiles").select("xp"),
      ]);
      const totalXp = (xpRow.data ?? []).reduce((s: number, r: any) => s + (r.xp ?? 0), 0);
      return {
        members: members.count ?? 0,
        onboarded: onboarded.count ?? 0,
        posts: posts.count ?? 0,
        likes: likes.count ?? 0,
        discussions: discussions.count ?? 0,
        replies: replies.count ?? 0,
        challenges: challenges.count ?? 0,
        subs: subs.count ?? 0,
        subsPending: subsPending.count ?? 0,
        subsApproved: subsApproved.count ?? 0,
        totalXp,
      };
    },
  });

  if (isLoading || !data) return <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const stats = [
    { icon: Users, label: "Members", value: data.members, sub: `${data.onboarded} onboarded` },
    { icon: Rss, label: "Posts", value: data.posts, sub: `${data.likes} likes` },
    { icon: MessagesSquare, label: "Discussions", value: data.discussions, sub: `${data.replies} replies` },
    { icon: Target, label: "Challenges", value: data.challenges, sub: `${data.subs} submissions` },
    { icon: CheckCircle2, label: "Approved", value: data.subsApproved, sub: `${data.subsPending} pending` },
    { icon: Flame, label: "Total XP", value: data.totalXp, sub: "awarded across cohort" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-bold">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MembersPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, college, branch, graduation_year, city, state, xp, level, streak, onboarded, created_at, linkedin, github")
        .order("xp", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No members yet.</p>;

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3 font-medium">Member</th>
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
                  <p className="text-xs text-muted-foreground">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                </td>
                <td className="p-3">{m.college ?? "—"}<div className="text-xs text-muted-foreground">{m.branch ?? ""}</div></td>
                <td className="p-3">{[m.city, m.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="p-3">{m.graduation_year ?? "—"}</td>
                <td className="p-3 text-right font-semibold">{(m.xp ?? 0).toLocaleString()}</td>
                <td className="p-3 text-right">{m.level ?? 1}</td>
                <td className="p-3 text-right">{m.streak ?? 0}</td>
                <td className="p-3">
                  <Badge variant={m.onboarded ? "default" : "outline"} className={m.onboarded ? "bg-success text-success-foreground" : ""}>
                    {m.onboarded ? "Active" : "Pending"}
                  </Badge>
                </td>
                <td className="p-3 text-xs space-x-2">
                  {m.linkedin && <a className="text-primary hover:underline" href={m.linkedin} target="_blank" rel="noreferrer">LI</a>}
                  {m.github && <a className="text-primary hover:underline" href={m.github} target="_blank" rel="noreferrer">GH</a>}
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select("id, status, solution_url, notes, created_at, user_id, challenges(title, xp_reward), profiles!challenge_submissions_user_profile_fkey(display_name)")
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
    onSuccess: () => { toast.success("Approved & XP awarded"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("challenge_submissions").update({ status: "rejected" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rejected"); qc.invalidateQueries(); },
  });

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data?.length) return <p className="text-muted-foreground text-sm">No submissions yet.</p>;

  return (
    <div className="space-y-3">
      {data.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm"><span className="font-semibold">{s.profiles?.display_name ?? "Someone"}</span> → <span className="font-medium">{s.challenges?.title}</span> <span className="text-xs text-muted-foreground">(+{s.challenges?.xp_reward} XP)</span></p>
              {s.solution_url && <a href={s.solution_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block">{s.solution_url}</a>}
              {s.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{s.notes}</p>}
            </div>
            {s.status === "submitted" ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve.mutate(s.id)} disabled={approve.isPending} className="bg-success text-success-foreground hover:bg-success/90"><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                <Button size="sm" variant="outline" onClick={() => reject.mutate(s.id)} disabled={reject.isPending}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              </div>
            ) : (
              <Badge variant={s.status === "approved" ? "default" : "outline"} className={s.status === "approved" ? "bg-success text-success-foreground" : "text-destructive"}>{s.status}</Badge>
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

  const { data: challenges } = useQuery({
    queryKey: ["admin", "challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !description.trim()) throw new Error("Title and description required");
      const { error } = await supabase.from("challenges").insert({
        title: title.trim(), description: description.trim(), link: link.trim() || null,
        difficulty, xp_reward: Number(xp) || 50,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(""); setDescription(""); setLink(""); setXp("50");
      toast.success("Challenge created");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("challenges").update({ is_active: active }).eq("id", id);
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
        <CardHeader><CardTitle>New challenge</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Problem link</Label><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://leetcode.com/…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>XP reward</Label><Input type="number" value={xp} onChange={(e) => setXp(e.target.value)} /></div>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full" style={{ background: "var(--gradient-primary)" }}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All challenges</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {challenges?.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {challenges?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.difficulty} · +{c.xp_reward} XP {c.is_active ? "" : "· inactive"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: c.id, active: !c.is_active })}>{c.is_active ? "Hide" : "Show"}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}