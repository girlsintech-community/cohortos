import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Loader2, Trash2, Pencil, X, Check, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

type Post = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

function FeedPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, created_at, profiles!posts_author_profile_fkey(display_name, avatar_url), post_likes(user_id), post_comments(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Post[];
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const text = content.trim();
      if (!text) throw new Error("Write something");
      if (text.length > 1000) throw new Error("Max 1000 chars");
      const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: user.id, content: text });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setCommentDrafts((s) => ({ ...s, [vars.postId]: "" }));
      qc.invalidateQueries({ queryKey: ["comments", vars.postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const text = content.trim();
      if (!text) throw new Error("Say something");
      if (text.length > 2000) throw new Error("Too long (max 2000)");
      const { error } = await supabase.from("posts").insert({ author_id: user.id, content: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      toast.success("Posted!");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const text = content.trim();
      if (!text) throw new Error("Post can't be empty");
      if (text.length > 2000) throw new Error("Too long (max 2000)");
      const { error } = await supabase.from("posts").update({ content: text }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cohort Feed</h1>
        <p className="text-muted-foreground">Share wins, questions, or what you're building today.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Share an update</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} placeholder="What are you working on?" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !content.trim()} style={{ background: "var(--gradient-primary)" }} className="text-primary-foreground">
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : posts?.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No posts yet. Be the first! 💫</p>
      ) : (
        <div className="space-y-4">
          {posts?.map((p) => {
            const liked = p.post_likes.some((l) => l.user_id === user.id);
            const initials = (p.profiles?.display_name || "?").slice(0, 2).toUpperCase();
            return (
              <Card key={p.id}>
                <CardContent className="pt-5">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-sm">{p.profiles?.display_name ?? "Someone"}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                      </div>
                      {editingId === p.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea rows={3} value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={2000} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => update.mutate({ id: p.id, content: editContent })} disabled={update.isPending}>
                              <Check className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm whitespace-pre-wrap break-words">{p.content}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <button onClick={() => toggleLike.mutate({ postId: p.id, liked })} className={`inline-flex items-center gap-1.5 text-xs ${liked ? "text-primary" : "text-muted-foreground"} hover:text-primary`}>
                          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {p.post_likes.length}
                        </button>
                        <button onClick={() => setOpenComments((s) => ({ ...s, [p.id]: !s[p.id] }))} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                          <MessageCircle className="h-4 w-4" /> {p.post_comments?.length ?? 0}
                        </button>
                        {p.author_id === user.id && editingId !== p.id && (
                          <>
                            <button onClick={() => { setEditingId(p.id); setEditContent(p.content); }} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                            <button onClick={() => remove.mutate(p.id)} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                          </>
                        )}
                      </div>
                      {openComments[p.id] && (
                        <CommentsThread
                          postId={p.id}
                          currentUserId={user.id}
                          draft={commentDrafts[p.id] ?? ""}
                          onDraft={(v) => setCommentDrafts((s) => ({ ...s, [p.id]: v }))}
                          onSubmit={() => addComment.mutate({ postId: p.id, content: commentDrafts[p.id] ?? "" })}
                          submitting={addComment.isPending}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}