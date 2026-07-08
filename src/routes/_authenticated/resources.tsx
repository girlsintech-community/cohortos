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
  Search,
  Youtube,
  Github,
  Globe,
  FileText,
  Bookmark,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/resources")({
  component: ResourcesPage,
});

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; gradient: string }
> = {
  General: {
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    gradient: "from-blue-500/5 to-cyan-500/5",
  },
  DSA: {
    icon: Code2,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    gradient: "from-violet-500/5 to-fuchsia-500/5",
  },
  "Interview Prep": {
    icon: Briefcase,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    gradient: "from-amber-500/5 to-orange-500/5",
  },
  Tools: {
    icon: Wrench,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    gradient: "from-emerald-500/5 to-teal-500/5",
  },
  Career: {
    icon: GraduationCap,
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    gradient: "from-pink-500/5 to-rose-500/5",
  },
  "Web Dev": {
    icon: Code2,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    gradient: "from-indigo-500/5 to-blue-500/5",
  },
  "System Design": {
    icon: Sparkles,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    gradient: "from-cyan-500/5 to-sky-500/5",
  },
  Other: {
    icon: Lightbulb,
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    gradient: "from-slate-500/5 to-neutral-500/5",
  },
};

function getCategoryConfig(cat: string) {
  return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.Other;
}

// Helper to get domain-specific icon and styling
function getDomainMeta(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return { label: "YouTube", icon: Youtube, color: "text-red-500 bg-red-500/5" };
    }
    if (host.includes("github.com")) {
      return { label: "GitHub", icon: Github, color: "text-slate-800 dark:text-slate-200 bg-slate-500/10" };
    }
    if (host.includes("medium.com") || host.includes("substack.com") || host.includes("dev.to")) {
      return { label: "Blog", icon: FileText, color: "text-emerald-600 bg-emerald-500/5" };
    }
    if (host.includes("takeuforward.org")) {
      return { label: "Striver DSA", icon: Bookmark, color: "text-amber-500 bg-amber-500/5 border border-amber-500/20" };
    }
    return { label: url.hostname.replace("www.", ""), icon: Globe, color: "text-blue-500 bg-blue-500/5" };
  } catch (e) {
    return { label: "Link", icon: Globe, color: "text-slate-500 bg-slate-500/5" };
  }
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Unique categories list with counts
  const categoryCounts = (resources ?? []).reduce(
    (acc, cur) => {
      acc[cur.category] = (acc[cur.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const categories = ["All", ...Array.from(new Set((resources ?? []).map((r) => r.category)))];

  // Filtering logic
  const filtered = (resources ?? []).filter((r) => {
    const matchesCategory = activeCategory === "All" || r.category === activeCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Redesigned Hero Banner Section */}
      <div 
        className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8 md:p-10 shadow-lg text-card-foreground"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-violet-500/5 to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground">
              DSA & Career Library
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Curated by the Girls Leading Tech community. Accelerate your interview prep, master algorithms, and level up with top developer resources.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Suggest Resource Dialog */}
            <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
              <DialogTrigger asChild>
                <Button className="text-white shadow-md hover:shadow-lg transition cursor-pointer" style={{ background: "var(--gradient-primary)" }}>
                  <Plus className="mr-2 h-4.5 w-4.5" /> Suggest Resource
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
        </div>
      </div>

      {/* Redesigned Search & Filters Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
          {categories.map((cat) => {
            const count = cat === "All" ? (resources ?? []).length : (categoryCounts[cat] || 0);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tracking-wide border transition cursor-pointer ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                {cat}
                <span className={`inline-grid h-4 min-w-[16px] place-items-center rounded-full text-[9px] px-1 font-bold ${
                  activeCategory === cat ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/15 text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-time Search Box */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs rounded-full border-border bg-card/60 backdrop-blur focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border rounded-2xl bg-card/40 backdrop-blur">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/35" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No resources found</h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery 
              ? `No resources match your search query "${searchQuery}". Try using different keywords.`
              : `There are currently no active resources listed in this category.`}
          </p>
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-4 text-xs">
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        /* Dynamic visually-stunning Grid with micro-interactions */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const catConfig = getCategoryConfig(r.category);
            const domainMeta = getDomainMeta(r.url);
            const CategoryIcon = catConfig.icon;
            const DomainIcon = domainMeta.icon;
            
            return (
              <a 
                key={r.id} 
                href={r.url} 
                target="_blank" 
                rel="noreferrer" 
                className="group block focus:outline-none"
              >
                <Card 
                  className="h-full border border-border/60 hover:border-primary/30 dark:hover:border-primary/20 bg-card hover:bg-card/75 dark:hover:bg-accent/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.4)] relative flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top decorative category gradient band */}
                  <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${catConfig.gradient}`} />
                  
                  <CardContent className="pt-6 flex flex-col h-full flex-1">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      {/* Left: Category Icon with clean colored circle */}
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${catConfig.color}`}>
                        <CategoryIcon className="h-4.5 w-4.5" />
                      </div>
                      
                      {/* Right: Domain pill */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 border border-transparent capitalize ${domainMeta.color}`}>
                        <DomainIcon className="h-3 w-3" />
                        {domainMeta.label}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
                      {r.title}
                    </h3>
                    
                    {/* Description */}
                    {r.description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                        {r.description}
                      </p>
                    )}
                    
                    {/* Footer border and Link */}
                    <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-muted-foreground/75 font-medium">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform duration-200">
                        <span>Open Resource</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
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
