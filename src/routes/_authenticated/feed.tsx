import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Loader2,
  Trash2,
  Pencil,
  X,
  Check,
  MessageCircle,
  Send,
  ImagePlus,
  LinkIcon,
  ExternalLink,
  ThumbsUp,
  Lightbulb,
  Rocket,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "query", label: "Query" },
  { value: "resource", label: "Resource" },
] as const;

const CATEGORY_BADGE: Record<string, string> = {
  general: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  query: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resource: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

function renderMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_]{2,30})/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-primary font-medium">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function CommentsThread({
  postId,
  currentUserId,
  draft,
  onDraft,
  onSubmit,
  submitting,
}: {
  postId: string;
  currentUserId: string;
  draft: string;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select(
          "id, post_id, author_id, content, created_at, profiles!post_comments_author_profile_fkey(display_name, username, avatar_url)",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Comment[];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error("Couldn't delete", { description: e.message }),
  });
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Be the first to reply.</p>
      ) : (
        (data ?? []).map((c) => {
          const ini = (c.profiles?.display_name || "?").slice(0, 2).toUpperCase();
          return (
            <div key={c.id} className="flex gap-2">
              <Link to="/u/$id" params={{ id: c.author_id }}>
                <Avatar className="h-7 w-7 hover:opacity-85 transition">
                  <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {ini}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xs font-semibold flex items-center gap-1">
                    <Link
                      to="/u/$id"
                      params={{ id: c.author_id }}
                      className="hover:underline font-semibold text-foreground/90"
                    >
                      {c.profiles?.display_name ?? "Someone"}
                    </Link>
                    {c.profiles?.username && (
                      <Link
                        to="/u/$id"
                        params={{ id: c.author_id }}
                        className="hover:underline text-[10px] font-normal text-muted-foreground"
                      >
                        @{c.profiles.username}
                      </Link>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {renderMentions(c.content)}
                </p>
                <ReactionBar
                  targetType="post_comment"
                  targetId={c.id}
                  receiverId={c.author_id}
                  currentUserId={currentUserId}
                />
                {c.author_id === currentUserId && (
                  <button
                    onClick={() => del.mutate(c.id)}
                    className="mt-1 text-[10px] text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
      <div className="flex gap-2">
        <Textarea
          rows={1}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          maxLength={1000}
          placeholder="Write a reply… tag with @username"
          className="min-h-[40px]"
        />
        <Button size="sm" onClick={onSubmit} disabled={submitting || !draft.trim()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

const QUALITY_REACTIONS = [
  { type: "helpful", label: "Helpful", icon: ThumbsUp },
  { type: "great_explanation", label: "Great", icon: BadgeCheck },
  { type: "motivated_me", label: "Motivated", icon: Rocket },
  { type: "clever_solution", label: "Clever", icon: Lightbulb },
] as const;

function ReactionBar({
  targetType,
  targetId,
  receiverId,
  currentUserId,
}: {
  targetType: "post_comment" | "discussion_reply" | "discussion";
  targetId: string;
  receiverId: string;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const disabled = receiverId === currentUserId;
  const { data } = useQuery({
    queryKey: ["qualityReactions", targetType, targetId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_reactions")
        .select("reaction_type, giver_id")
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      if (error) throw error;
      return data as Array<{ reaction_type: string; giver_id: string }>;
    },
  });

  const react = useMutation({
    mutationFn: async (reactionType: string) => {
      if (disabled) return;
      const existing = (data ?? []).some(
        (r) => r.reaction_type === reactionType && r.giver_id === currentUserId,
      );
      if (existing) {
        const { error } = await (supabase as any)
          .from("community_reactions")
          .delete()
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("giver_id", currentUserId)
          .eq("reaction_type", reactionType);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("community_reactions").insert({
          target_type: targetType,
          target_id: targetId,
          receiver_id: receiverId,
          giver_id: currentUserId,
          reaction_type: reactionType,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualityReactions", targetType, targetId] }),
    onError: (e: Error) => toast.error("Reaction failed", { description: e.message }),
  });

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {QUALITY_REACTIONS.map((r) => {
        const count = (data ?? []).filter((x) => x.reaction_type === r.type).length;
        const mine = (data ?? []).some(
          (x) => x.reaction_type === r.type && x.giver_id === currentUserId,
        );
        return (
          <button
            key={r.type}
            type="button"
            disabled={disabled || react.isPending}
            onClick={() => react.mutate(r.type)}
            className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] transition disabled:opacity-50 ${
              mine ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <r.icon className="h-3 w-3" /> {r.label} {count > 0 ? count : ""}
          </button>
        );
      })}
    </div>
  );
}

type Post = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  link_url: string | null;
  category: string;
  profiles: { display_name: string; username: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string; username: string | null; avatar_url: string | null } | null;
};

function FeedPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postCategory, setPostCategory] = useState("general");
  const [filterCategory, setFilterCategory] = useState("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, author_id, content, created_at, image_url, link_url, category, profiles!posts_author_profile_fkey(display_name, username, avatar_url), post_likes(user_id), post_comments(id)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Post[];
    },
  });

  const filteredPosts =
    filterCategory === "all"
      ? (posts ?? [])
      : (posts ?? []).filter((p) => p.category === filterCategory);

  async function handleImage(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/post-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("post-images").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("post-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setImageUrl(signed.data.signedUrl);
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const text = content.trim();
      if (!text) throw new Error("Write something");
      if (text.length > 1000) throw new Error("Max 1000 chars");
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: user.id, content: text });
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
      if (!text && !imageUrl && !linkUrl) throw new Error("Add some text, an image, or a link");
      if (text.length > 2000) throw new Error("Too long (max 2000)");
      let link: string | null = linkUrl.trim() || null;
      if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        content: text,
        image_url: imageUrl,
        link_url: link,
        category: postCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      setImageUrl(null);
      setLinkUrl("");
      setShowLinkInput(false);
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
      const { error, count } = await supabase.from("posts").delete({ count: "exact" }).eq("id", id);
      if (error) throw error;
      if (!count) throw new Error("Post could not be deleted (permission).");
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error("Couldn't delete", { description: e.message }),
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
        <p className="text-muted-foreground">
          Share wins, badges, questions, or what you're building today.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share an update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            placeholder="What are you working on? Share a LeetCode/GfG badge, a win, or a question…"
          />
          {imageUrl && (
            <div className="relative w-full">
              <img
                src={imageUrl}
                alt="preview"
                className="rounded-lg max-h-72 object-contain border"
              />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {showLinkInput && (
            <Input
              placeholder="Paste a link (LeetCode profile, badge, article…)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          )}
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowLinkInput((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              >
                <LinkIcon className="h-4 w-4" /> Link
              </button>
              <Select value={postCategory} onValueChange={setPostCategory}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="query">Query</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || uploading}
              style={{ background: "var(--gradient-primary)" }}
              className="text-primary-foreground"
            >
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              filterCategory === cat.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat.label}
            {cat.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {(posts ?? []).filter((p) => p.category === cat.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {filterCategory === "all"
            ? "No posts yet. Be the first! 💫"
            : `No ${filterCategory} posts yet.`}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((p) => {
            const liked = p.post_likes.some((l) => l.user_id === user.id);
            const initials = (p.profiles?.display_name || "?").slice(0, 2).toUpperCase();
            const catStyle = CATEGORY_BADGE[p.category] || CATEGORY_BADGE.general;
            return (
              <Card key={p.id}>
                <CardContent className="pt-5">
                  <div className="flex gap-3">
                    <Link to="/u/$id" params={{ id: p.author_id }}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/u/$id"
                          params={{ id: p.author_id }}
                          className="font-semibold text-sm hover:underline"
                        >
                          {p.profiles?.display_name ?? "Someone"}
                        </Link>
                        {p.profiles?.username && (
                          <span className="text-xs text-muted-foreground">
                            @{p.profiles.username}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                        </p>
                        <Badge variant="outline" className={`text-[10px] capitalize ${catStyle}`}>
                          {p.category}
                        </Badge>
                      </div>
                      {editingId === p.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            maxLength={2000}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => update.mutate({ id: p.id, content: editContent })}
                              disabled={update.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {p.content && (
                            <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                              {renderMentions(p.content)}
                            </p>
                          )}
                          {p.image_url && (
                            <img
                              src={p.image_url}
                              alt=""
                              className="mt-2 rounded-lg max-h-96 object-contain border"
                            />
                          )}
                          {p.link_url && (
                            <a
                              href={p.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {p.link_url}
                            </a>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <button
                          onClick={() => toggleLike.mutate({ postId: p.id, liked })}
                          className={`inline-flex items-center gap-1.5 text-xs ${liked ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
                        >
                          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />{" "}
                          {p.post_likes.length}
                        </button>
                        <button
                          onClick={() => setOpenComments((s) => ({ ...s, [p.id]: !s[p.id] }))}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                        >
                          <MessageCircle className="h-4 w-4" /> {p.post_comments?.length ?? 0}
                        </button>
                        {p.author_id === user.id && editingId !== p.id && (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(p.id);
                                setEditContent(p.content);
                              }}
                              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Delete this post?")) remove.mutate(p.id);
                              }}
                              disabled={remove.isPending}
                              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                      {openComments[p.id] && (
                        <CommentsThread
                          postId={p.id}
                          currentUserId={user.id}
                          draft={commentDrafts[p.id] ?? ""}
                          onDraft={(v) => setCommentDrafts((s) => ({ ...s, [p.id]: v }))}
                          onSubmit={() =>
                            addComment.mutate({ postId: p.id, content: commentDrafts[p.id] ?? "" })
                          }
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
