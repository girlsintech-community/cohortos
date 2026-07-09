import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, UsersRound, ImagePlus, LinkIcon, ExternalLink, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/pods")({
  component: PodsPage,
});

type Pod = { id: string; name: string; description: string | null; mentor_id: string | null };
type PodMember = {
  id: string;
  user_id: string;
  member_role: string;
  profiles: { display_name: string; username: string | null; avatar_url: string | null } | null;
};
type PodMessage = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  link_url: string | null;
  profiles: { display_name: string; username: string | null; avatar_url: string | null } | null;
};

function PodsPage() {
  const { user } = Route.useRouteContext();
  const [activePodId, setActivePodId] = useState<string | null>(null);

  const { data: pods, isLoading } = useQuery({
    queryKey: ["my-pods", user.id],
    queryFn: async () => {
      // Fetch pod ids I'm a member of, then fetch pods
      const { data: memberships, error: mErr } = await supabase
        .from("pod_members")
        .select("pod_id")
        .eq("user_id", user.id);
      if (mErr) throw mErr;
      const ids = (memberships ?? []).map((m: { pod_id: string }) => m.pod_id);
      if (ids.length === 0) return [] as Pod[];
      const { data, error } = await supabase
        .from("pods")
        .select("id, name, description, mentor_id")
        .in("id", ids);
      if (error) throw error;
      return data as Pod[];
    },
  });

  useEffect(() => {
    if (!activePodId && pods && pods.length > 0) setActivePodId(pods[0].id);
  }, [pods, activePodId]);

  if (isLoading)
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  if (!pods || pods.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground mb-4"
            style={{ background: "var(--gradient-primary)" }}
          >
            <UsersRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">No pod yet</h1>
          <p className="text-muted-foreground mt-2">
            Your admin will assign you to a pod with a mentor and up to 7 cohort sisters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Your Pods</h1>
        <p className="text-muted-foreground">
          Small mentor-led group. Chat is private to your pod.
        </p>
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: members } = useQuery({
    queryKey: ["pod-members", podId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_members")
        .select(
          "id, user_id, member_role, profiles!pod_members_user_id_fkey(display_name, username, avatar_url)",
        )
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
        .select(
          "id, author_id, content, created_at, image_url, link_url, profiles!pod_messages_author_id_fkey(display_name, username, avatar_url)",
        )
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pod_messages", filter: `pod_id=eq.${podId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["pod-messages", podId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [podId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      const t = text.trim();
      if (!t && !imageUrl && !linkUrl.trim()) throw new Error("Empty message");
      let finalLink = linkUrl.trim();
      if (finalLink && !/^https?:\/\//i.test(finalLink)) {
        finalLink = `https://${finalLink}`;
      }
      const { error } = await supabase
        .from("pod_messages")
        .insert({
          pod_id: podId,
          author_id: user.id,
          content: t,
          image_url: imageUrl,
          link_url: finalLink || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      setImageUrl(null);
      setLinkUrl("");
      setShowLinkInput(false);
      qc.invalidateQueries({ queryKey: ["pod-messages", podId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMessage = useMutation({
    mutationFn: async ({ messageId, newContent }: { messageId: string; newContent: string }) => {
      if (!newContent.trim()) throw new Error("Message cannot be empty");
      const { error } = await supabase
        .from("pod_messages")
        .update({ content: newContent.trim() })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditText("");
      toast.success("Message updated");
      qc.invalidateQueries({ queryKey: ["pod-messages", podId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from("pod_messages").delete().eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted");
      qc.invalidateQueries({ queryKey: ["pod-messages", podId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleImage(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/pod-${podId}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("pod-images").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("pod-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setImageUrl(signed.data.signedUrl);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  function renderTextWithLinks(content: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="underline font-semibold hover:opacity-85 break-all inline-flex items-center gap-0.5"
            style={{ color: "var(--primary)" }}
          >
            {part} <ExternalLink className="h-3 w-3 inline" />
          </a>
        );
      }
      return part;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <Card className="flex flex-col h-[70vh]">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">{pod.name}</CardTitle>
          {pod.description && <p className="text-xs text-muted-foreground">{pod.description}</p>}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
          {(messages ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Say hi 👋
            </p>
          ) : (
            (messages ?? []).map((m) => {
              const mine = m.author_id === user.id;
              const ini = (m.profiles?.display_name || "?").slice(0, 2).toUpperCase();
              const isEditingThis = editingId === m.id;

              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <Link to="/u/$id" params={{ id: m.author_id }}>
                    <Avatar className="h-7 w-7 shrink-0 hover:opacity-85 transition">
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {ini}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {!mine && (
                      <p className="text-[10px] font-semibold opacity-80">
                        <Link to="/u/$id" params={{ id: m.author_id }} className="hover:underline">
                          {m.profiles?.display_name ?? "Someone"}
                        </Link>
                        {m.profiles?.username && (
                          <Link
                            to="/u/$id"
                            params={{ id: m.author_id }}
                            className="ml-1 font-normal opacity-70 hover:underline"
                          >
                            @{m.profiles.username}
                          </Link>
                        )}
                      </p>
                    )}

                    {isEditingThis ? (
                      <div className="space-y-2 mt-1 min-w-[200px]">
                        <Textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="text-xs bg-background text-foreground"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            size="sm"
                            onClick={() => updateMessage.mutate({ messageId: m.id, newContent: editText })}
                            disabled={updateMessage.isPending}
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            className="h-7 px-2 text-xs bg-transparent text-current"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {mine ? m.content : renderTextWithLinks(m.content)}
                        </p>
                        {m.image_url && (
                          <img
                            src={m.image_url}
                            alt="Attachment"
                            className="mt-2 rounded-lg max-h-48 object-contain border bg-background"
                          />
                        )}
                        {m.link_url && (
                          <a
                            href={m.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-2 inline-flex items-center gap-1 text-xs font-medium break-all underline ${mine ? "text-primary-foreground/90 hover:text-white" : "text-primary"}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {m.link_url}
                          </a>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-between gap-4 mt-1">
                      <p className={`text-[9px] ${mine ? "opacity-75" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </p>
                      {mine && !isEditingThis && (
                        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setEditText(m.content);
                            }}
                            className="text-[9px] hover:underline"
                            title="Edit message"
                          >
                            Edit
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => {
                              if (confirm("Delete this message?")) deleteMessage.mutate(m.id);
                            }}
                            className="text-[9px] hover:underline text-destructive dark:text-red-400"
                            title="Delete message"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        <div className="border-t p-3 space-y-2 bg-card">
          {imageUrl && (
            <div className="relative inline-block">
              <img src={imageUrl} alt="Upload preview" className="h-16 w-16 object-cover rounded border" />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {showLinkInput && (
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Paste link here (e.g. GitHub repo, LeetCode profile…)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-8 text-xs"
              />
              <button onClick={() => setShowLinkInput(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message your pod…"
                className="min-h-[40px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send.mutate();
                  }
                }}
              />
              <div className="flex items-center gap-3 px-1">
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer transition">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  <span>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
                    disabled={uploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowLinkInput((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>Link</span>
                </button>
              </div>
            </div>
            <Button onClick={() => send.mutate()} disabled={send.isPending || uploading} className="h-10">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pod members ({(members ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(members ?? []).map((m) => {
            const ini = (m.profiles?.display_name || "?").slice(0, 2).toUpperCase();
            const roleLabel =
              m.member_role === "mentor"
                ? "Mentor"
                : m.member_role === "team_member"
                  ? "Team"
                  : "Mentee";
            return (
              <div key={m.id} className="flex items-center gap-2">
                <Link
                  to="/u/$id"
                  params={{ id: m.user_id }}
                  className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-85 transition"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {ini}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate hover:underline">
                      {m.profiles?.display_name ?? "Someone"}
                    </p>
                    {m.profiles?.username && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        @{m.profiles.username}
                      </p>
                    )}
                  </div>
                </Link>
                <Badge
                  variant={m.member_role === "mentor" ? "default" : "outline"}
                  className="text-[10px] shrink-0"
                >
                  {roleLabel}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
