import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, BookOpen, Code2, Briefcase, Wrench, GraduationCap, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/resources")({
  component: ResourcesPage,
});

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  General: { icon: BookOpen, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  DSA: { icon: Code2, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  "Interview Prep": { icon: Briefcase, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  Tools: { icon: Wrench, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  "Career": { icon: GraduationCap, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
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
  const [activeCategory, setActiveCategory] = useState("All");

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

  const categories = ["All", ...Array.from(new Set((resources ?? []).map((r) => r.category)))];
  const filtered = activeCategory === "All" ? (resources ?? []) : (resources ?? []).filter((r) => r.category === activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resources</h1>
        <p className="text-muted-foreground">Curated resources to level up your DSA journey.</p>
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
            {activeCategory === "All" ? "No resources have been added yet." : `No resources in "${activeCategory}" yet.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const config = getCategoryConfig(r.category);
            const Icon = config.icon;
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <Card className="h-full transition hover:-translate-y-1 hover:shadow-lg border-border/60">
                  <CardContent className="pt-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>
                        {r.category}
                      </Badge>
                    </div>
                    <h3 className="mt-3 font-semibold text-sm group-hover:text-primary transition line-clamp-2">{r.title}</h3>
                    {r.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 flex-1">{r.description}</p>
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
