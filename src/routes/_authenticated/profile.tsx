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
import {
  Trophy,
  Flame,
  Zap,
  Loader2,
  Award,
  Upload,
  X,
  Linkedin,
  Github,
  MapPin,
  GraduationCap,
  Target,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKILL_OPTIONS } from "@/lib/skills";
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [branch, setBranch] = useState("");
  const [course, setCourse] = useState("");
  const [gradYear, setGradYear] = useState<string>("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [primaryRole, setPrimaryRole] = useState<"mentee" | "mentor" | "team_member" | "">("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setCollege(profile.college ?? "");
      setCity(profile.city ?? "");
      setStateVal(profile.state ?? "");
      setBranch(profile.branch ?? "");
      setCourse(profile.course ?? "");
      setGradYear(profile.graduation_year ? String(profile.graduation_year) : "");
      setLinkedin(profile.linkedin_url ?? "");
      setGithub(profile.github_url ?? "");
      setSkills(profile.skills ?? []);
      setAvatarUrl(profile.avatar_url ?? null);
      const pr = (profile as { primary_role?: string | null }).primary_role;
      if (pr === "mentee" || pr === "mentor" || pr === "team_member") setPrimaryRole(pr);
    }
  }, [profile]);

  const { data: stats } = useQuery({
    queryKey: ["profileStats", user.id],
    queryFn: async () => {
      const postIdsRes = await supabase.from("posts").select("id").eq("author_id", user.id);
      const postIds = (postIdsRes.data ?? []).map((p) => p.id);
      const [postsCount, commentsCount, likesGiven, likesReceived, challengesCount] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id),
        supabase
          .from("post_comments")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id),
        supabase
          .from("post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("user_id", user.id),
        postIds.length
          ? supabase
              .from("post_likes")
              .select("post_id", { count: "exact", head: true })
              .in("post_id", postIds)
          : Promise.resolve({ count: 0 } as { count: number | null }),
        supabase
          .from("challenge_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      return {
        posts: postsCount.count ?? 0,
        comments: commentsCount.count ?? 0,
        likesGiven: likesGiven.count ?? 0,
        likesReceived: likesReceived.count ?? 0,
        challenges: challengesCount.count ?? 0,
      };
    },
  });

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.includes(s) || skills.length >= 12) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  async function handleAvatar(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setAvatarUrl(data?.signedUrl ?? null);
      toast.success("Photo uploaded — remember to save");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!displayName.trim()) throw new Error("Display name is required");
      if (!linkedin.trim()) throw new Error("LinkedIn URL is required");
      if (!/^https?:\/\/(www\.)?linkedin\.com\//i.test(linkedin.trim()))
        throw new Error("Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/yourname)");
      if (!github.trim()) throw new Error("GitHub URL is required");
      if (!/^https?:\/\/(www\.)?github\.com\//i.test(github.trim()))
        throw new Error("Please enter a valid GitHub URL (e.g. https://github.com/yourusername)");
      if (!city.trim()) throw new Error("City is required");
      if (!stateVal.trim()) throw new Error("State is required");
      if (!bio.trim()) throw new Error("Short bio is required");
      if (skills.length === 0) throw new Error("At least one skill is required");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          college: college || null,
          city: city.trim(),
          state: stateVal.trim(),
          branch: branch || null,
          course: course || null,
          graduation_year: gradYear ? Number(gradYear) : null,
          linkedin_url: linkedin.trim(),
          github_url: github.trim(),
          skills,
          avatar_url: avatarUrl,
          primary_role: primaryRole || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  if (isLoading || !profile) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (profile.display_name || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <Card className="overflow-hidden">
        <div className="h-28" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-6 -mt-12">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                <AvatarImage src={avatarUrl ?? profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow cursor-pointer hover:bg-primary/90">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
                />
              </label>
            </div>
            <div className="flex-1 sm:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                {roles?.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize">
                    {r.replace("_", " ")}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
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
          <div className="grid grid-cols-3 gap-4 mt-6">
            <MiniStat icon={Zap} label="XP" value={profile.xp.toLocaleString()} />
            <MiniStat icon={Trophy} label="Level" value={profile.level.toString()} />
            <MiniStat icon={Flame} label="Streak" value={`${profile.streak}d`} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            <MiniStat icon={Target} label="Challenges Submitted" value={String(stats?.challenges ?? 0)} />
            <MiniStat icon={Zap} label="Posts" value={String(stats?.posts ?? 0)} />
            <MiniStat icon={Zap} label="Comments" value={String(stats?.comments ?? 0)} />
            <MiniStat icon={Zap} label="Likes given" value={String(stats?.likesGiven ?? 0)} />
            <MiniStat icon={Zap} label="Likes received" value={String(stats?.likesReceived ?? 0)} />
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
            <div className="grid grid-cols-2 gap-3">
              <F label="Display name" className="col-span-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                />
              </F>
              <F label="Role" className="col-span-2">
                <Select
                  value={primaryRole}
                  onValueChange={(v) => setPrimaryRole(v as typeof primaryRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentee">Mentee</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="team_member">Team</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Bio" className="col-span-2">
                <Textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={280}
                />
              </F>
              <F label="College" className="col-span-2">
                <Input
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  maxLength={120}
                />
              </F>
              <F label="Course">
                <Input value={course} onChange={(e) => setCourse(e.target.value)} maxLength={60} />
              </F>
              <F label="Branch">
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={60} />
              </F>
              <F label="Grad year">
                <Input
                  type="number"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                />
              </F>
              <F label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
              </F>
              <F label="State" className="col-span-2">
                <Input
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value)}
                  maxLength={60}
                />
              </F>
              <F label="LinkedIn URL" className="col-span-2">
                <Input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                />
                <p className="text-xs text-muted-foreground mt-1">Must be a linkedin.com URL</p>
              </F>
              <F label="GitHub URL" className="col-span-2">
                <Input
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/…"
                />
                <p className="text-xs text-muted-foreground mt-1">Must be a github.com URL</p>
              </F>
              <F label="Skills" className="col-span-2">
                <div className="flex gap-2">
                  <Input
                    list="profile-skills-list"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Pick or type a skill…"
                  />
                  <datalist id="profile-skills-list">
                    {SKILL_OPTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <Button type="button" variant="secondary" onClick={addSkill}>
                    Add
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1">
                        {s}
                        <button
                          type="button"
                          onClick={() => setSkills(skills.filter((x) => x !== s))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </F>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
            </Button>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" /> Badges
            </CardTitle>
            <CardDescription>Earn badges by contributing to the cohort.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-lg border p-3 ${b.earned ? "bg-accent/10 border-accent/30" : "bg-muted/30 opacity-60"}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-lg ${b.earned ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                    >
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

function F({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function MiniStat({
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
