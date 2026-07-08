import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  ExternalLink,
  BookOpen,
  Code2,
  Briefcase,
  Wrench,
  GraduationCap,
  Lightbulb,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/resources")({
  component: ResourcesPage,
});

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  General: { icon: BookOpen, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  DSA: { icon: Code2, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  "Interview Prep": {
    icon: Briefcase,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  Tools: { icon: Wrench, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  Career: { icon: GraduationCap, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  Other: { icon: Lightbulb, color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
};

function getCategoryConfig(cat: string) {
  return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.Other;
}

type Resource = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  created_at: string;
};

function ResourcesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("All");
  const [suggestOpen, setSuggestOpen] = useState(false);

  // Form states for resource suggestion
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Resource[];
    },
  });

  const suggest = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !url.trim()) throw new Error("Title and URL are required");
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }
      const { error } = await supabase.from("resources").insert({
        title: title.trim(),
        url: finalUrl,
        category,
        description: description.trim() || null,
        created_by: user.id,
        is_active: false, // suggestion requires admin approval
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resource suggested!", {
        description: "Your suggestion has been submitted and is awaiting admin approval.",
      });
      setTitle("");
      setUrl("");
      setCategory("General");
      setDescription("");
      setSuggestOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = ["All", ...Array.from(new Set((resources ?? []).map((r) => r.category)))];
  const filtered =
    activeCategory === "All"
      ? (resources ?? [])
      : (resources ?? []).filter((r) => r.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-muted-foreground">Curated resources to level up your DSA journey.</p>
        </div>
        
        {/* Suggest Resource Dialog */}
        <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
          <DialogTrigger asChild>
            <Button className="sm:self-center text-white" style={{ background: "var(--gradient-primary)" }}>
              <Plus className="mr-2 h-4 w-4" /> Suggest Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Suggest a Resource</DialogTitle>
              <DialogDescription>
                Share a helpful article, video, tool, or cheat sheet with the community. Suggestions will show up after admin review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-title">Title *</Label>
                <Input
                  id="s-title"
                  placeholder="e.g. Striver's SDE Sheet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-url">URL *</Label>
                <Input
                  id="s-url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="s-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="DSA">DSA</SelectItem>
                    <SelectItem value="Interview Prep">Interview Prep</SelectItem>
                    <SelectItem value="Tools">Tools</SelectItem>
                    <SelectItem value="Career">Career</SelectItem>
                    <SelectItem value="Web Dev">Web Dev</SelectItem>
                    <SelectItem value="System Design">System Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-desc">Description</Label>
                <Textarea
                  id="s-desc"
                  placeholder="Short description of the resource..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>
              <Button
                className="w-full text-white"
                onClick={() => suggest.mutate()}
                disabled={suggest.isPending}
                style={{ background: "var(--gradient-primary)" }}
              >
                {suggest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Suggestion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">
            {activeCategory === "All"
              ? "No resources have been added yet."
              : `No resources in "${activeCategory}" yet.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const config = getCategoryConfig(r.category);
            const Icon = config.icon;
            return (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="group block">
                <Card className="h-full transition hover:-translate-y-1 hover:shadow-lg border-border/60">
                  <CardContent className="pt-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${config.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>
                        {r.category}
                      </Badge>
                    </div>
                    <h3 className="mt-3 font-semibold text-sm group-hover:text-primary transition line-clamp-2">
                      {r.title}
                    </h3>
                    {r.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 flex-1">
                        {r.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open resource
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
