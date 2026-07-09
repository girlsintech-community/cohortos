import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Play, Linkedin, ExternalLink, Loader2, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

type Masterclass = {
  id: string;
  title: string;
  description: string | null;
  watch_link: string;
  image_url: string | null;
  speaker_name: string;
  speaker_linkedin: string | null;
  speaker_designation: string | null;
  speaker_bio: string | null;
  created_at: string;
};

function LibraryPage() {
  const [search, setSearch] = useState("");

  const { data: masterclasses, isLoading } = useQuery({
    queryKey: ["masterclasses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("masterclasses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Masterclass[];
    },
  });

  const filtered = (masterclasses ?? []).filter((mc) => {
    const term = search.toLowerCase();
    return (
      mc.title.toLowerCase().includes(term) ||
      (mc.description && mc.description.toLowerCase().includes(term)) ||
      mc.speaker_name.toLowerCase().includes(term) ||
      (mc.speaker_designation && mc.speaker_designation.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Masterclass Library</h1>
          <p className="text-muted-foreground">
            Watch recorded masterclasses from industry experts and connect with speakers.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search masterclasses or speakers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <Video className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="font-semibold text-base">No masterclasses found</p>
            <p className="text-sm">We'll be adding recorded masterclasses soon. Check back later!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((mc) => {
            const speakerInitials = mc.speaker_name.slice(0, 2).toUpperCase();
            return (
              <Card key={mc.id} className="overflow-hidden flex flex-col group border hover:border-primary/20 transition duration-300 bg-card">
                {/* Thumbnail */}
                <div className="aspect-video w-full bg-slate-950 relative overflow-hidden shrink-0 border-b">
                  {mc.image_url ? (
                    <img
                      src={mc.image_url}
                      alt={mc.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/45 space-y-1.5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-rose-950/20">
                      <Video className="h-10 w-10 text-muted-foreground/30" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Masterclass Recording</span>
                    </div>
                  )}
                  {/* Play Button Overlay */}
                  <a
                    href={mc.watch_link}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <div className="h-14 w-14 rounded-full bg-white/90 text-slate-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition duration-300">
                      <Play className="h-6 w-6 fill-current pl-0.5" />
                    </div>
                  </a>
                </div>

                {/* Content */}
                <CardContent className="flex-1 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition">
                      {mc.title}
                    </h3>
                    {mc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {mc.description}
                      </p>
                    )}
                  </div>

                  {/* Speaker Details */}
                  <div className="border-t pt-4 flex items-start gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {speakerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate">
                          {mc.speaker_name}
                        </p>
                        {mc.speaker_linkedin && (
                          <a
                            href={mc.speaker_linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:text-primary/80 transition p-0.5 shrink-0"
                            aria-label={`${mc.speaker_name}'s LinkedIn`}
                          >
                            <Linkedin className="h-3.5 w-3.5 fill-current" />
                          </a>
                        )}
                      </div>
                      {mc.speaker_designation && (
                        <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                          {mc.speaker_designation}
                        </p>
                      )}
                      {mc.speaker_bio && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {mc.speaker_bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button
                      asChild
                      className="w-full text-xs font-semibold text-white"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <a href={mc.watch_link} target="_blank" rel="noreferrer">
                        Watch Recording <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
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
