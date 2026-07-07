import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/discussions")({
  component: DiscussionsPage,
});

type Discussion = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  tag: string | null;
  created_at: string;
  profiles: { display_name: string; username: string | null; avatar_url: string | null } | null;
  discussion_replies: { count: number }[];
};

function DiscussionsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: discussions, isLoading } = useQuery({
    queryKey: ["discussions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussions")
        .select("id, author_id, title, body, tag, created_at, profiles!discussions_author_profile_fkey(display_name, username, avatar_url), discussion_replies(count)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Discussion[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 3) throw new Error("Title too short");
      if (!body.trim()) throw new Error("Add some detail");
      const { error } = await supabase.from("discussions").insert({
        author_id: user.id, title: title.trim(), body: body.trim(), tag: tag.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(""); setBody(""); setTag("");
      toast.success("Discussion posted");
      qc.invalidateQueries({ queryKey: ["discussions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discussions</h1>
        <p className="text-muted-foreground">Ask questions, share resources, help each other out.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Start a discussion</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Title" />
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder="What's on your mind?" />
          <div className="flex gap-2">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={30} placeholder="Optional tag (e.g. DP, Graphs, Interview)" className="max-w-xs" />
            <Button onClick={() => create.mutate()} disabled={create.isPending} style={{ background: "var(--gradient-primary)" }} className="text-primary-foreground ml-auto">
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : discussions?.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No discussions yet.</p>
      ) : (
        <div className="space-y-3">
          {discussions?.map((d) => (
            <DiscussionCard key={d.id} d={d} open={openId === d.id} onToggle={() => setOpenId(openId === d.id ? null : d.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscussionCard({ d, open, onToggle }: { d: Discussion; open: boolean; onToggle: () => void }) {
  const initials = (d.profiles?.display_name || "?").slice(0, 2).toUpperCase();
  const replyCount = d.discussion_replies[0]?.count ?? 0;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={d.profiles?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{d.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {d.profiles?.display_name ?? "Someone"}
                  {d.profiles?.username && <span className="ml-1">@{d.profiles.username}</span>}
                  {" · "}{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                </p>
              </div>
              {d.tag && <Badge variant="secondary">{d.tag}</Badge>}
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap break-words">{d.body}</p>
            <button onClick={onToggle} className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <MessageSquare className="h-3.5 w-3.5" /> {replyCount} {replyCount === 1 ? "reply" : "replies"}
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {open && <RepliesPanel discussionId={d.id} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RepliesPanel({ discussionId }: { discussionId: string }) {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: replies, isLoading } = useQuery({
    queryKey: ["replies", discussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_replies")
        .select("id, author_id, body, created_at, profiles!discussion_replies_author_profile_fkey(display_name, username, avatar_url)")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Array<{ id: string; author_id: string; body: string; created_at: string; profiles: { display_name: string; username: string | null; avatar_url: string | null } | null }>;
    },
  });

  const reply = useMutation({
    mutationFn: async () => {
      if (!text.trim()) throw new Error("Empty reply");
      const { error } = await supabase.from("discussion_replies").insert({ discussion_id: discussionId, author_id: user.id, body: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["replies", discussionId] });
      qc.invalidateQueries({ queryKey: ["discussions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 space-y-3 border-t pt-3">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : replies?.map((r) => {
        const ini = (r.profiles?.display_name || "?").slice(0, 2).toUpperCase();
        return (
          <div key={r.id} className="flex gap-2">
            <Avatar className="h-7 w-7"><AvatarImage src={r.profiles?.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{ini}</AvatarFallback></Avatar>
            <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium">
                {r.profiles?.display_name ?? "Someone"}
                {r.profiles?.username && <span className="ml-1 text-muted-foreground font-normal">@{r.profiles.username}</span>}
                <span className="text-muted-foreground font-normal"> · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
              </p>
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{renderMentions(r.body)}</p>
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a reply… tag with @username" />
        <Button size="sm" onClick={() => reply.mutate()} disabled={reply.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function renderMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_]{2,30})/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? <span key={i} className="text-primary font-medium">{p}</span> : <span key={i}>{p}</span>
  );
}