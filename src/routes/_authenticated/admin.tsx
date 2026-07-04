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
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
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
      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>
        <TabsContent value="submissions" className="mt-4"><SubmissionsPanel /></TabsContent>
        <TabsContent value="challenges" className="mt-4"><ChallengesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function SubmissionsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select("id, status, solution_url, notes, created_at, user_id, challenges(title, xp_reward), profiles!challenge_submissions_user_id_fkey(display_name)")
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