import { createFileRoute, useRouter } from "@tanstack/react-router";
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
import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_OPTIONS } from "@/lib/skills";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
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
    if (!profile) return;
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
  }, [profile]);

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
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
      setAvatarUrl(data?.signedUrl ?? null);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!displayName.trim()) throw new Error("Name is required");
      if (!avatarUrl) throw new Error("Please upload a profile photo");
      if (!primaryRole) throw new Error("Please select your role");
      if (!college.trim()) throw new Error("College is required");
      if (!branch.trim() || !course.trim()) throw new Error("Course & branch are required");
      if (!gradYear || isNaN(Number(gradYear))) throw new Error("Graduation year is required");
      const { error } = await supabase.from("profiles").update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        college: college.trim(),
        city: city.trim() || null,
        state: stateVal.trim() || null,
        branch: branch.trim(),
        course: course.trim(),
        graduation_year: Number(gradYear),
        linkedin_url: linkedin.trim() || null,
        github_url: github.trim() || null,
        skills,
        avatar_url: avatarUrl,
        onboarded: true,
        primary_role: primaryRole,
      }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Welcome to Cohort OS! 🎉");
      await qc.invalidateQueries();
      router.navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  const initials = (displayName || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold">Welcome to Cohort OS ✨</h1>
        <p className="text-muted-foreground">A few quick details so your cohort sisters can find & recognize you.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Your photo</CardTitle><CardDescription>A friendly face helps the community connect.</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <label className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:bg-primary/90">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {avatarUrl ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">PNG or JPG, up to 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name*"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} /></Field>
          <Field label="I am joining as*">
            <Select value={primaryRole} onValueChange={(v) => setPrimaryRole(v as typeof primaryRole)}>
              <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mentee">Mentee</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="team_member">Team</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Short bio" className="sm:col-span-2"><Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Education</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="College / University*" className="sm:col-span-2"><Input value={college} onChange={(e) => setCollege(e.target.value)} maxLength={120} /></Field>
          <Field label="Course*"><Input value={course} onChange={(e) => setCourse(e.target.value)} maxLength={60} /></Field>
          <Field label="Branch*"><Input value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={60} /></Field>
          <Field label="Graduation year*"><Input type="number" min={2020} max={2035} value={gradYear} onChange={(e) => setGradYear(e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} /></Field>
          <Field label="State"><Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} maxLength={60} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Links & Skills</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="LinkedIn URL"><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></Field>
          <Field label="GitHub URL"><Input value={github} onChange={(e) => setGithub(e.target.value)} /></Field>
          <Field label="Skills" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input list="skills-list" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
              <datalist id="skills-list">
                {SKILL_OPTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
              <Button type="button" variant="secondary" onClick={addSkill}>Add</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pick from the list or type your own.</p>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    {s}
                    <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending} style={{ background: "var(--gradient-primary)" }} className="text-primary-foreground">
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Complete profile & enter Cohort OS
        </Button>
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}