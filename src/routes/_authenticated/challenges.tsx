import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Target, ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/challenges")({
  component: ChallengesPage,
});

function ChallengesPage() {
  const { user } = Route.useRouteContext();

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: mySubs } = useQuery({
    queryKey: ["mysubs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenge_submissions").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const subByChallenge = new Map((mySubs ?? []).map((s) => [s.challenge_id, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Challenges</h1>
        <p className="text-muted-foreground">Solve, submit, earn XP. Admins verify submissions.</p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : challenges?.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No challenges yet. Check back soon! 🎯</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges?.map((c) => (
            <ChallengeCard key={c.id} c={c} submission={subByChallenge.get(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

const diffColor: Record<string, string> = {
  easy: "bg-success/15 text-success border-success/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  hard: "bg-destructive/10 text-destructive border-destructive/30",
};

function ChallengeCard({ c, submission }: { c: any; submission: any }) {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("challenge_submissions").insert({
        challenge_id: c.id, user_id: user.id, solution_url: url.trim() || null, notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submitted! Awaiting review.");
      setOpen(false); setUrl(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["mysubs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = submission?.status;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-4 w-4 text-primary" />{c.title}</CardTitle>
          <Badge variant="outline" className={diffColor[c.difficulty]}>{c.difficulty}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-primary">+{c.xp_reward} XP</span>
          {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><ExternalLink className="h-3 w-3" /> Problem</a>}
        </div>
        <div className="pt-2">
          {status === "approved" ? (
            <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3 w-3" /> Approved · +{c.xp_reward} XP</Badge>
          ) : status === "submitted" ? (
            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Awaiting review</Badge>
          ) : status === "rejected" ? (
            <Badge variant="outline" className="text-destructive gap-1"><XCircle className="h-3 w-3" /> Rejected — try again below</Badge>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" style={{ background: "var(--gradient-primary)" }}>Submit solution</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit: {c.title}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Solution link (GitHub, LeetCode, etc.)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
                  <div className="space-y-2"><Label>Notes (optional)</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Approach, complexity, learnings…" /></div>
                  <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
                    {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit for review
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}