import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/pods")({
  component: PodsPage,
});

type Pod = { id: string; name: string; description: string | null; mentor_id: string | null };
type PodMember = { id: string; user_id: string; member_role: string; profiles: { display_name: string; username: string | null; avatar_url: string | null } | null };
type PodMessage = { id: string; author_id: string; content: string; created_at: string; profiles: { display_name: string; username: string | null; avatar_url: string | null } | null };

function PodsPage() {
  const { user } = Route.useRouteContext();
  const [activePodId, setActivePodId] = useState<string | null>(null);

  const { data: pods, isLoading } = useQuery({
    queryKey: ["my-pods", user.id],
    queryFn: async () => {
      // Fetch pod ids I'm a member of, then fetch pods
      const { data: memberships, error: mErr } = await supabase.from("pod_members").select("pod_id").eq("user_id", user.id);
      if (mErr) throw mErr;
      const ids = (memberships ?? []).map((m: { pod_id: string }) => m.pod_id);
      if (ids.length === 0) return [] as Pod[];
      const { data, error } = await supabase.from("pods").select("id, name, description, mentor_id").in("id", ids);
      if (error) throw error;
      return data as Pod[];
    },
  });

  useEffect(() => {
    if (!activePodId && pods && pods.length > 0) setActivePodId(pods[0].id);
  }, [pods, activePodId]);

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!pods || pods.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground mb-4" style={{ background: "var(--gradient-primary)" }}>
            <UsersRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">No pod yet</h1>
          <p className="text-muted-foreground mt-2">Your admin will assign you to a pod with a mentor and up to 7 cohort sisters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Your Pods</h1>
        <p className="text-muted-foreground">Small mentor-led group. Chat is private to your pod.</p>
      </div>
      {pods.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {pods.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePodId(p.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${activePodId === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      {activePodId && <PodView podId={activePodId} pod={pods.find((p) => p.id === activePodId)!} />}
    </div>
  );
}

function PodView({ podId, pod }: { podId: string; pod: Pod }) {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: members } = useQuery({
    queryKey: ["pod-members", podId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_members")
        .select("id, user_id, member_role, profiles!pod_members_user_id_fkey(display_name, username, avatar_url)")
        .eq("pod_id", podId);
      if (error) throw error;
      return data as unknown as PodMember[];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["pod-messages", podId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_messages")
        .select("id, author_id, content, created_at, profiles!pod_messages_author_id_fkey(display_name, username, avatar_url)")
        .eq("pod_id", podId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as unknown as PodMessage[];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`pod-${podId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pod_messages", filter: `pod_id=eq.${podId}` }, () => {
        qc.invalidateQueries({ queryKey: ["pod-messages", podId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [podId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      const t = text.trim();
      if (!t) throw new Error("Empty message");
      const { error } = await supabase.from("pod_messages").insert({ pod_id: podId, author_id: user.id, content: t });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["pod-messages", podId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <Card className="flex flex-col h-[70vh]">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">{pod.name}</CardTitle>
          {pod.description && <p className="text-xs text-muted-foreground">{pod.description}</p>}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
          {(messages ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hi 👋</p>
          ) : (
            (messages ?? []).map((m) => {
              const mine = m.author_id === user.id;
              const ini = (m.profiles?.display_name || "?").slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={m.profiles?.avatar_url ?? undefined} /><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{ini}</AvatarFallback></Avatar>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!mine && (
                      <p className="text-[10px] font-semibold opacity-80">
                        {m.profiles?.display_name ?? "Someone"}
                        {m.profiles?.username && <span className="ml-1 font-normal opacity-70">@{m.profiles.username}</span>}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[9px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
        <div className="border-t p-3 flex gap-2">
          <Textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your pod…" className="min-h-[40px]"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.mutate(); } }} />
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pod members ({(members ?? []).length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(members ?? []).map((m) => {
            const ini = (m.profiles?.display_name || "?").slice(0, 2).toUpperCase();
            const roleLabel = m.member_role === "mentor" ? "Mentor" : m.member_role === "team_member" ? "Team" : "Mentee";
            return (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarImage src={m.profiles?.avatar_url ?? undefined} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{ini}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.profiles?.display_name ?? "Someone"}</p>
                  {m.profiles?.username && <p className="text-[10px] text-muted-foreground truncate">@{m.profiles.username}</p>}
                </div>
                <Badge variant={m.member_role === "mentor" ? "default" : "outline"} className="text-[10px]">{roleLabel}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}