import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Linkedin,
  Github,
  MapPin,
  GraduationCap,
  Trophy,
  Flame,
  Zap,
  ArrowLeft,
  Award,
  Target,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/u/$id")({
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { id } = Route.useParams();
  const { user, primaryRole, isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [cardType, setCardType] = useState("outstanding_improvement");
  const [message, setMessage] = useState("");
  const { data: profile, isLoading } = useQuery({
    queryKey: ["publicProfile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["publicStats", id],
    enabled: !!id,
    queryFn: async () => {
      const postIdsRes = await supabase.from("posts").select("id").eq("author_id", id);
      const postIds = (postIdsRes.data ?? []).map((p) => p.id);
      const [posts, comments, likesReceived, challenges] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", id),
        supabase
          .from("post_comments")
          .select("id", { count: "exact", head: true })
          .eq("author_id", id),
        postIds.length
          ? supabase
              .from("post_likes")
              .select("post_id", { count: "exact", head: true })
              .in("post_id", postIds)
          : Promise.resolve({ count: 0 } as { count: number | null }),
        supabase
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", id),
      ]);
      return {
        posts: posts.count ?? 0,
        comments: comments.count ?? 0,
        likesReceived: likesReceived.count ?? 0,
        challenges: challenges.count ?? 0,
      };
    },
  });

  const { data: badges } = useQuery({
    queryKey: ["memberBadges", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_badges")
        .select("reason, awarded_at, badges(name, icon, description)")
        .eq("user_id", id)
        .order("awarded_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        reason: string | null;
        awarded_at: string;
        badges: { name: string; icon: string; description: string } | null;
      }>;
    },
  });

  const { data: streaks } = useQuery({
    queryKey: ["memberStreaks", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_streaks")
        .select("streak_type, current_count")
        .eq("user_id", id);
      if (error) throw error;
      return data as Array<{ streak_type: string; current_count: number }>;
    },
  });

  const appreciate = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("mentor_appreciations").insert({
        mentor_id: user.id,
        student_id: id,
        card_type: cardType,
        message: message.trim() || null,
        xp_bonus: 15,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appreciation sent");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["memberBadges", id] });
      qc.invalidateQueries({ queryKey: ["publicProfile", id] });
    },
    onError: (e: Error) => toast.error("Couldn't send appreciation", { description: e.message }),
  });

  if (isLoading)
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!profile) return <p className="text-center text-muted-foreground py-10">Member not found.</p>;

  const initials = (profile.display_name || "?").slice(0, 2).toUpperCase();
  const canAppreciate = id !== user.id && (isAdmin || primaryRole === "mentor" || primaryRole === "team_member");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <Card className="overflow-hidden">
        <div className="h-24" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-6 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 sm:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                {profile.primary_role && (
                  <Badge variant="secondary" className="capitalize">
                    {profile.primary_role.replace("_", " ")}
                  </Badge>
                )}
              </div>
              {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {profile.college && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> {profile.college}
                    {profile.branch ? ` · ${profile.branch}` : ""}
                    {profile.graduation_year ? ` · ${profile.graduation_year}` : ""}
                  </span>
                )}
                {(profile.city || profile.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{" "}
                    {[profile.city, profile.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                )}
              </div>
              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.skills.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Mini icon={Zap} label="XP" value={profile.xp.toLocaleString()} />
            <Mini icon={Trophy} label="Level" value={String(profile.level)} />
            <Mini icon={Flame} label="Streak" value={`${profile.streak}d`} />
          </div>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <Mini icon={Target} label="Challenges Submitted" value={String(stats.challenges)} />
              <Mini icon={Zap} label="Posts" value={String(stats.posts)} />
              <Mini icon={Zap} label="Comments" value={String(stats.comments)} />
              <Mini icon={Zap} label="Likes received" value={String(stats.likesReceived)} />
            </div>
          )}
          {streaks && streaks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
              {streaks.map((s) => (
                <Mini
                  key={s.streak_type}
                  icon={Flame}
                  label={s.streak_type.replace("_", " ")}
                  value={`${s.current_count}d`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Achievement badges</h2>
          </div>
          {badges?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {badges.map((b, index) => (
                <div key={`${b.badges?.name}-${index}`} className="rounded-lg border bg-muted/30 p-3">
                  <p className="font-semibold text-sm">
                    {b.badges?.icon} {b.badges?.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{b.reason || b.badges?.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No badges yet.</p>
          )}
        </CardContent>
      </Card>

      {canAppreciate && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div>
              <h2 className="font-semibold">Mentor appreciation</h2>
              <p className="text-sm text-muted-foreground">Send one of your 5 weekly recognition cards.</p>
            </div>
            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outstanding_improvement">Outstanding Improvement</SelectItem>
                <SelectItem value="great_team_player">Great Team Player</SelectItem>
                <SelectItem value="excellent_explanation">Excellent Explanation</SelectItem>
                <SelectItem value="consistency">Consistency</SelectItem>
                <SelectItem value="leadership">Leadership</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={240}
              rows={3}
            />
            <Button onClick={() => appreciate.mutate()} disabled={appreciate.isPending}>
              Send appreciation · +15 XP
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className="flex justify-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
