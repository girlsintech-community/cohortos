import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Linkedin, Github, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/speed-networking")({
  beforeLoad: ({ context }) => {
    const c = context as { primaryRole?: string | null };
    if (c.primaryRole !== "mentee") throw redirect({ to: "/dashboard" });
  },
  component: SpeedNetworking,
});

type Partner = { id: string; display_name: string; avatar_url: string | null; college: string | null; linkedin_url: string | null; github_url: string | null; skills: string[] | null };
type Match = { id: string; user_a: string; user_b: string; created_at: string };

function SpeedNetworking() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["speedMatches", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_networking_matches")
        .select("id, user_a, user_b, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Match[];
    },
  });

  const partnerIds = (matches ?? []).map((m) => (m.user_a === user.id ? m.user_b : m.user_a));

  const { data: partners } = useQuery({
    queryKey: ["speedPartners", partnerIds.join(",")],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, college, linkedin_url, github_url, skills")
        .in("id", partnerIds);
      if (error) throw error;
      return data as Partner[];
    },
  });

  const { data: inQueue } = useQuery({
    queryKey: ["speedQueue", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("speed_networking_queue").select("user_id").eq("user_id", user.id).maybeSingle();
      return !!data;
    },
  });

  const request = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_speed_match");
      if (error) throw error;
      return data as unknown as Array<{ match_id: string | null; partner_id: string | null; status: string }>;
    },
    onSuccess: (rows) => {
      const r = rows?.[0];
      if (r?.status === "matched") toast.success("You've been matched! 🎉");
      else toast("You're in the queue — we'll pair you as soon as someone else joins.");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("speed_networking_queue").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Left the queue"); qc.invalidateQueries({ queryKey: ["speedQueue", user.id] }); },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <Users className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold">Speed Networking</h1>
        <p className="text-muted-foreground">Get randomly paired with another mentee and hop on a short intro chat.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Find a partner</CardTitle>
          <CardDescription>Tap the button below — if someone else is waiting you'll be paired instantly, otherwise we'll queue you.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => request.mutate()} disabled={request.isPending} style={{ background: "var(--gradient-primary)" }} className="text-primary-foreground">
            {request.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {inQueue ? "Refresh — try to match now" : "Find me a match"}
          </Button>
          {inQueue && (
            <Button variant="outline" onClick={() => leave.mutate()} disabled={leave.isPending}>Leave queue</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your matches</CardTitle>
          <CardDescription>Reach out over LinkedIn or share contact to schedule a 15-minute intro.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (matches ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches yet. Hit the button above to find your first cohort sister to chat with. 💫</p>
          ) : (
            <div className="space-y-3">
              {(matches ?? []).map((m) => {
                const pid = m.user_a === user.id ? m.user_b : m.user_a;
                const p = partners?.find((x) => x.id === pid);
                if (!p) return null;
                const ini = (p.display_name || "?").slice(0, 2).toUpperCase();
                return (
                  <div key={m.id} className="flex gap-3 rounded-lg border p-3">
                    <Avatar className="h-12 w-12"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback className="bg-primary/10 text-primary">{ini}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.display_name}</p>
                      {p.college && <p className="text-xs text-muted-foreground">{p.college}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs">
                        {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</a>}
                        {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Github className="h-3.5 w-3.5" /> GitHub</a>}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">💬 Say hi and set up a 15-min intro this week!</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}