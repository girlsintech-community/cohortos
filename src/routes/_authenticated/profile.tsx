import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Zap, Loader2, Award } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const BADGES = [
  { id: "first-login", name: "First Login", desc: "Signed in for the first time", earned: true },
  { id: "early-adopter", name: "Early Adopter", desc: "Joined during launch week", earned: true },
  { id: "first-post", name: "First Post", desc: "Share your first update", earned: false },
  { id: "helper", name: "Community Helper", desc: "Answer 5 discussions", earned: false },
  { id: "solver", name: "Problem Solver", desc: "Complete your first challenge", earned: false },
  { id: "streak-7", name: "7-Day Streak", desc: "Show up 7 days in a row", earned: false },
];

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  if (isLoading || !profile) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const initials = (profile.display_name || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <Card className="overflow-hidden">
        <div className="h-28" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-6 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 sm:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                {roles?.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize">{r.replace("_", " ")}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <MiniStat icon={Zap} label="XP" value={profile.xp.toLocaleString()} />
            <MiniStat icon={Trophy} label="Level" value={profile.level.toString()} />
            <MiniStat icon={Flame} label="Streak" value={`${profile.streak}d`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit */}
        <Card>
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>Update how you appear to the cohort.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dn">Display name</Label>
              <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you working on this cohort?" />
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
            </Button>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-accent" /> Badges</CardTitle>
            <CardDescription>Earn badges by contributing to the cohort.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((b) => (
                <div key={b.id} className={`rounded-lg border p-3 ${b.earned ? "bg-accent/10 border-accent/30" : "bg-muted/30 opacity-60"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`grid h-8 w-8 place-items-center rounded-lg ${b.earned ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Award className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{b.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{b.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className="flex justify-center text-primary"><Icon className="h-4 w-4" /></div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}