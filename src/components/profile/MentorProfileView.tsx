import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Briefcase,
  Award,
  Calendar,
  Clock,
  Users,
  Globe,
  Linkedin,
  Github,
  Twitter,
  ExternalLink,
  Edit3,
  X,
  Sparkles,
  MapPin,
  ShieldCheck,
  BookOpen,
  Zap,
  Upload,
  CheckCircle2,
  Loader2,
  Building2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface MentorExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface MentorSessionType {
  id: string;
  title: string;
  duration: string;
  description: string;
}

export interface MentorReview {
  id: string;
  menteeName: string;
  menteeAvatar?: string;
  rating: number;
  date: string;
  comment: string;
  tags: string[];
}

export interface MentorCertification {
  id: string;
  title: string;
  issuer: string;
  year: string;
}

export interface MentorProfileData {
  displayName: string;
  title: string;
  company: string;
  roleSpecialization: string;
  bio: string;
  city: string;
  state: string;
  domains: string[];
  skills: string[];
  experiences: MentorExperienceItem[];
  topics: string[];
  sessionTypes: MentorSessionType[];
  availability: string;
  certifications: MentorCertification[];
  reviews: MentorReview[];
  socials: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
    bookingUrl?: string;
  };
  rating: number;
  totalMentees: number;
  sessionsCompleted: number;
  responseTime: string;
}

interface MentorProfileProps {
  userId: string;
  userEmail: string;
  profile: {
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    skills?: string[] | null;
    xp?: number;
    level?: number;
  };
  onAvatarUpload?: (file: File) => void;
  uploadingAvatar?: boolean;
  onProfileUpdated?: () => void;
}

export function MentorProfileView({
  userId,
  userEmail,
  profile,
  onAvatarUpload,
  uploadingAvatar = false,
  onProfileUpdated,
}: MentorProfileProps) {
  const storageKey = `cohortos_mentor_profile_${userId}`;

  // Default mentor data populated with professional defaults
  const getDefaultData = (): MentorProfileData => {
    return {
      displayName: profile.display_name || userEmail.split("@")[0] || "Mentor",
      title: "Senior Software Engineer & Tech Lead",
      company: "TechCorp",
      roleSpecialization: "System Architecture & Frontend Lead",
      bio:
        profile.bio ||
        "Dedicated mentor guiding engineers in system design, full-stack web development, and tech career growth.",
      city: profile.city || "San Francisco",
      state: profile.state || "CA",
      domains: [
        "Frontend Systems",
        "Distributed Systems",
        "Full-Stack Development",
        "Career Transition",
      ],
      skills:
        profile.skills && profile.skills.length > 0
          ? profile.skills
          : ["React", "TypeScript", "Node.js", "System Design", "PostgreSQL", "Tailwind CSS"],
      experiences: [
        {
          id: "exp-1",
          role: "Senior Software Engineer",
          company: "TechCorp",
          period: "2023 - Present",
          description:
            "Leading core web architecture team, mentoring junior engineers, and driving performance optimizations.",
        },
        {
          id: "exp-2",
          role: "Frontend Developer",
          company: "CloudScale",
          period: "2021 - 2023",
          description:
            "Architected scalable UI design systems and mentored 10+ mentees through code reviews and career coaching.",
        },
      ],
      topics: [
        "System Design & Architecture",
        "React & Next.js Best Practices",
        "Resume & Portfolio Review",
        "Mock Technical Interviews",
        "Career Strategy & Salary Negotiation",
      ],
      sessionTypes: [
        {
          id: "st-1",
          title: "1-on-1 Career Mentorship",
          duration: "45 mins",
          description: "Personalized guidance on career roadmap, skill development, and tech goals.",
        },
        {
          id: "st-2",
          title: "Code & Portfolio Review",
          duration: "30 mins",
          description: "In-depth code walkthrough and actionable feedback to polish project showcases.",
        },
        {
          id: "st-3",
          title: "Mock Technical Interview",
          duration: "60 mins",
          description: "Simulated coding & architecture interview with actionable feedback.",
        },
      ],
      availability: "Mon, Wed & Fri (6:00 PM – 8:30 PM EST) · Sat (10:00 AM – 1:00 PM EST)",
      certifications: [
        {
          id: "cert-1",
          title: "AWS Certified Solutions Architect - Professional",
          issuer: "Amazon Web Services",
          year: "2024",
        },
        {
          id: "cert-2",
          title: "CohortOS Verified Top Mentor",
          issuer: "GirlsInTech Community",
          year: "2025",
        },
        {
          id: "cert-3",
          title: "Meta Certified Senior Frontend Developer",
          issuer: "Meta",
          year: "2023",
        },
      ],
      reviews: [
        {
          id: "rev-1",
          menteeName: "Priya Sharma",
          rating: 5,
          date: "2 days ago",
          comment:
            "Extremely insightful session! The system design tips and resume feedback helped me land my tech offer.",
          tags: ["Actionable Advice", "Encouraging", "Deep Tech Knowledge"],
        },
        {
          id: "rev-2",
          menteeName: "Ananya Verma",
          rating: 5,
          date: "1 week ago",
          comment:
            "Super clear explanations on React concurrency and state management. Left the session with complete clarity!",
          tags: ["Great Listener", "Code Review Master"],
        },
        {
          id: "rev-3",
          menteeName: "Sophia Lee",
          rating: 5,
          date: "2 weeks ago",
          comment:
            "Mock interview felt so realistic and the constructive feedback gave me exact points to focus on.",
          tags: ["Mock Interview Pro", "Detail-Oriented"],
        },
      ],
      socials: {
        linkedin: profile.linkedin_url || "https://linkedin.com",
        github: profile.github_url || "https://github.com",
        twitter: "https://twitter.com",
        website: "https://example.com",
        bookingUrl: "https://calendly.com",
      },
      rating: 4.9,
      totalMentees: 38,
      sessionsCompleted: 74,
      responseTime: "< 2 hours",
    };
  };

  const [mentorData, setMentorData] = useState<MentorProfileData>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading mentor profile", e);
    }
    return getDefaultData();
  });

  // State for Edit Form
  const [formData, setFormData] = useState<MentorProfileData>(mentorData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(mentorData);
  }, [mentorData]);

  // Skill, Domain, Topic inputs for edit form
  const [skillInput, setSkillInput] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  const handleSaveProfile = async () => {
    if (!formData.displayName.trim()) {
      return toast.error("Display name is required");
    }
    if (!formData.title.trim()) {
      return toast.error("Position / Title is required");
    }
    if (!formData.company.trim()) {
      return toast.error("Company is required");
    }

    setIsSaving(true);
    try {
      // 1. Save to local storage
      localStorage.setItem(storageKey, JSON.stringify(formData));
      setMentorData(formData);

      // 2. Sync core fields to Supabase profile
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.displayName.trim(),
          bio: formData.bio.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          linkedin_url: formData.socials.linkedin?.trim() || null,
          github_url: formData.socials.github?.trim() || null,
          skills: formData.skills,
          primary_role: "mentor",
        })
        .eq("id", userId);

      if (error) {
        console.warn("Supabase profile sync warning:", error.message);
      }

      toast.success("Mentor profile updated successfully!");
      if (onProfileUpdated) onProfileUpdated();
    } catch (e) {
      toast.error("Failed to save profile", { description: (e as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || formData.skills.includes(s)) return;
    setFormData((prev) => ({ ...prev, skills: [...prev.skills, s] }));
    setSkillInput("");
  };

  const removeSkill = (s: string) => {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((x) => x !== s) }));
  };

  const addDomain = () => {
    const d = domainInput.trim();
    if (!d || formData.domains.includes(d)) return;
    setFormData((prev) => ({ ...prev, domains: [...prev.domains, d] }));
    setDomainInput("");
  };

  const removeDomain = (d: string) => {
    setFormData((prev) => ({ ...prev, domains: prev.domains.filter((x) => x !== d) }));
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (!t || formData.topics.includes(t)) return;
    setFormData((prev) => ({ ...prev, topics: [...prev.topics, t] }));
    setTopicInput("");
  };

  const removeTopic = (t: string) => {
    setFormData((prev) => ({ ...prev, topics: prev.topics.filter((x) => x !== t) }));
  };

  const displayName = mentorData.displayName || profile.display_name || userEmail.split("@")[0] || "Mentor";
  const initials = displayName.slice(0, 2).toUpperCase();
  const locationText = [mentorData.city, mentorData.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Mentor Profile Header Summary (NO Education / College fields!) */}
      <Card className="overflow-hidden border-border/70 shadow-card">
        <div className="h-32 relative" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-6 -mt-14">
            <div className="relative">
              <Avatar className="h-28 w-28 border-4 border-card shadow-lg">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {onAvatarUpload && (
                <label className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow cursor-pointer hover:bg-primary/90 transition-transform active:scale-95">
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onAvatarUpload(e.target.files[0])}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 sm:pt-14">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{displayName}</h1>
                <Badge className="bg-accent/15 text-accent border-accent/30 gap-1 font-semibold px-2.5 py-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Mentor
                </Badge>
              </div>

              {/* Mentor Position, Company, and Role Specialization */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-foreground">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Briefcase className="h-4 w-4" /> {mentorData.title}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1.5 text-foreground/90 font-semibold">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> {mentorData.company}
                </span>
                {mentorData.roleSpecialization && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground font-normal">
                      {mentorData.roleSpecialization}
                    </span>
                  </>
                )}
              </div>

              {mentorData.bio && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-3xl">
                  {mentorData.bio}
                </p>
              )}

              {/* Location & Social Links (Professional Focus) */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground items-center">
                {locationText && (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {locationText}
                  </span>
                )}
                {mentorData.socials.linkedin && (
                  <a
                    href={mentorData.socials.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {mentorData.socials.github && (
                  <a
                    href={mentorData.socials.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors"
                  >
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                )}
                {mentorData.socials.twitter && (
                  <a
                    href={mentorData.socials.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors"
                  >
                    <Twitter className="h-3.5 w-3.5" /> Twitter
                  </a>
                )}
                {mentorData.socials.bookingUrl && (
                  <a
                    href={mentorData.socials.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Book Session
                  </a>
                )}
              </div>

              {/* Mentor Skills Badges */}
              {mentorData.skills && mentorData.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {mentorData.skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t">
            <MentorMetricCard
              icon={Star}
              label="Rating"
              value={`${mentorData.rating} / 5`}
              subtext={`${mentorData.reviews.length} reviews`}
              iconColor="text-amber-500"
            />
            <MentorMetricCard
              icon={Users}
              label="Active Mentees"
              value={String(mentorData.totalMentees)}
              subtext="Guided & mentored"
              iconColor="text-primary"
            />
            <MentorMetricCard
              icon={CheckCircle2}
              label="Sessions Done"
              value={String(mentorData.sessionsCompleted)}
              subtext="1-on-1 & reviews"
              iconColor="text-emerald-500"
            />
            <MentorMetricCard
              icon={Clock}
              label="Response Time"
              value={mentorData.responseTime}
              subtext="Avg turnaround"
              iconColor="text-indigo-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Main Grid: Edit Mentor Profile Form + Mentor Content Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Edit Mentor Profile Form (Asking Mentor Questions: Company, Position, Role, Bio, Availability, Expertise) */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Edit Mentor Profile
            </CardTitle>
            <CardDescription>
              Update your professional details, company, role, expertise, and availability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Display Name */}
              <F label="Display Name" className="col-span-2">
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  maxLength={60}
                  placeholder="Your full name"
                />
              </F>

              {/* Position / Title */}
              <F label="Position / Job Title">
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  maxLength={70}
                />
              </F>

              {/* Company */}
              <F label="Company / Organization">
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Google, TechCorp"
                  maxLength={70}
                />
              </F>

              {/* Role Specialization */}
              <F label="Role / Specialization" className="col-span-2">
                <Input
                  value={formData.roleSpecialization}
                  onChange={(e) => setFormData({ ...formData, roleSpecialization: e.target.value })}
                  placeholder="e.g. System Architecture & Frontend Lead"
                  maxLength={100}
                />
              </F>

              {/* Mentor Bio */}
              <F label="Mentor Bio" className="col-span-2">
                <Textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share your technical background, mentoring philosophy, and how you assist mentees."
                  maxLength={350}
                />
              </F>

              {/* City & State */}
              <F label="City">
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. San Francisco"
                />
              </F>
              <F label="State">
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. CA"
                />
              </F>

              {/* Availability */}
              <F label="Weekly Availability" className="col-span-2">
                <Input
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder="e.g. Mon, Wed & Fri (6:00 PM – 8:30 PM EST)"
                />
              </F>

              {/* Technical Skills */}
              <F label="Technical Skills" className="col-span-2">
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Add skill (e.g. React, Node.js)"
                  />
                  <Button type="button" variant="secondary" onClick={addSkill}>
                    Add
                  </Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1 text-xs">
                        {s}
                        <button type="button" onClick={() => removeSkill(s)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </F>

              {/* Domain Expertise */}
              <F label="Domain Expertise" className="col-span-2">
                <div className="flex gap-2">
                  <Input
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDomain();
                      }
                    }}
                    placeholder="Add domain (e.g. Distributed Systems)"
                  />
                  <Button type="button" variant="secondary" onClick={addDomain}>
                    Add
                  </Button>
                </div>
                {formData.domains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.domains.map((d) => (
                      <Badge key={d} variant="outline" className="gap-1 text-xs">
                        {d}
                        <button type="button" onClick={() => removeDomain(d)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </F>

              {/* Mentoring Topics */}
              <F label="Mentoring Topics" className="col-span-2">
                <div className="flex gap-2">
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopic();
                      }
                    }}
                    placeholder="Add topic (e.g. Resume & Portfolio Review)"
                  />
                  <Button type="button" variant="secondary" onClick={addTopic}>
                    Add
                  </Button>
                </div>
                {formData.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.topics.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 text-xs">
                        {t}
                        <button type="button" onClick={() => removeTopic(t)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </F>

              {/* Social URLs */}
              <F label="LinkedIn URL" className="col-span-2">
                <Input
                  value={formData.socials.linkedin ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, linkedin: e.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </F>

              <F label="GitHub URL" className="col-span-2">
                <Input
                  value={formData.socials.github ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, github: e.target.value },
                    })
                  }
                  placeholder="https://github.com/..."
                />
              </F>

              <F label="Calendly / Booking Link" className="col-span-2">
                <Input
                  value={formData.socials.bookingUrl ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, bookingUrl: e.target.value },
                    })
                  }
                  placeholder="https://calendly.com/your-handle"
                />
              </F>
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full mt-4">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
              Save Mentor Profile
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Expertise, Mentoring Offerings, Experience & Reviews */}
        <div className="space-y-6">
          {/* Expertise Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Specialized Domains & Tech Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">
                  Specialized Domains
                </Label>
                <div className="flex flex-wrap gap-2">
                  {mentorData.domains.map((d) => (
                    <Badge key={d} variant="secondary" className="px-3 py-1 text-xs font-medium">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">
                  Technical Stack
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {mentorData.skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mentoring Offerings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Mentoring Session Offerings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-semibold">Availability Schedule</h5>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{mentorData.availability}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {mentorData.sessionTypes.map((st) => (
                  <div key={st.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-xs">{st.title}</h5>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" /> {st.duration}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{st.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Professional Work History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-5 border-l border-border/80 space-y-4">
                {mentorData.experiences.map((exp) => (
                  <div key={exp.id} className="relative">
                    <div className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div>
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-xs">{exp.role}</h5>
                        <span className="text-[10px] font-mono text-muted-foreground">{exp.period}</span>
                      </div>
                      <p className="text-xs font-medium text-primary mt-0.5">{exp.company}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" /> Achievements & Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {mentorData.certifications.map((cert) => (
                <div key={cert.id} className="p-2.5 rounded-lg border bg-muted/20 flex items-start gap-2.5">
                  <Award className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold">{cert.title}</h5>
                    <p className="text-[10px] text-muted-foreground">
                      {cert.issuer} · {cert.year}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mentee Reviews */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Mentee Reviews
                </CardTitle>
                <span className="text-sm font-bold">{mentorData.rating} / 5</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mentorData.reviews.map((rev) => (
                <div key={rev.id} className="p-3 rounded-lg border bg-card space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{rev.menteeName}</span>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3 w-3 fill-amber-500" />
                      <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic text-[11px]">"{rev.comment}"</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
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
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function MentorMetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className={`flex justify-center ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 text-lg font-bold tracking-tight">{value}</div>
      <div className="text-[11px] font-medium text-foreground uppercase tracking-wide">{label}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>
    </div>
  );
}
