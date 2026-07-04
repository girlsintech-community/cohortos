import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Loader2, Trash2 } from "lucide-react";
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
};

function FeedPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, created_at, profiles!posts_author_id_fkey(display_name, avatar_url), post_likes(user_id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Post[];
    },
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
                      <p className="mt-1 text-sm whitespace-pre-wrap break-words">{p.content}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <button onClick={() => toggleLike.mutate({ postId: p.id, liked })} className={`inline-flex items-center gap-1.5 text-xs ${liked ? "text-primary" : "text-muted-foreground"} hover:text-primary`}>
                          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {p.post_likes.length}
                        </button>
                        {p.author_id === user.id && (
                          <button onClick={() => remove.mutate(p.id)} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                        )}
                      </div>
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