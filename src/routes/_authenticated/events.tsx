import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, ExternalLink, Loader2, Video, PartyPopper, ChevronRight, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  component: EventsPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: "masterclass" | "event" | "workshop" | "deadline";
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_link: string | null;
  banner_image_url: string | null;
  speaker_name: string | null;
  speaker_designation: string | null;
  speaker_linkedin: string | null;
  speaker_bio: string | null;
  speaker_avatar_url: string | null;
};

const typeLabel: Record<EventRow["event_type"], string> = {
  masterclass: "Masterclass",
  event: "Event",
  workshop: "Workshop",
  deadline: "Deadline",
};

const typeColor: Record<EventRow["event_type"], string> = {
  masterclass: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
  event: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  workshop: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  deadline: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const now = Date.now();
  const upcoming = (events ?? []).filter((e) => new Date(e.scheduled_at).getTime() >= now);
  const past = (events ?? [])
    .filter((e) => new Date(e.scheduled_at).getTime() < now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" /> Events & Masterclasses
        </h1>
        <p className="text-muted-foreground">
          Everything scheduled for the cohort — masterclasses, workshops, and important dates.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-bold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground space-y-2">
                  <PartyPopper className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="font-semibold">Nothing scheduled yet</p>
                  <p className="text-sm">New masterclasses and events will show up here — we'll notify you too!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {upcoming.map((ev) => {
                  const { date, time } = formatWhen(ev.scheduled_at);
                  const speakerInitials = (ev.speaker_name || "Speaker").slice(0, 2).toUpperCase();

                  return (
                    <Card key={ev.id} className="overflow-hidden border hover:border-primary/40 hover:shadow-md transition group">
                      {ev.banner_image_url && (
                        <Link to="/events/$id" params={{ id: ev.id }} className="block aspect-[16/9] w-full overflow-hidden border-b relative">
                          <img src={ev.banner_image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="shadow">
                              {typeLabel[ev.event_type]}
                            </Badge>
                          </div>
                        </Link>
                      )}
                      <CardContent className="p-5 space-y-4">
                        {!ev.banner_image_url && (
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className={typeColor[ev.event_type]}>
                              {typeLabel[ev.event_type]}
                            </Badge>
                          </div>
                        )}

                        <div>
                          <Link to="/events/$id" params={{ id: ev.id }} className="group-hover:text-primary transition">
                            <h3 className="font-bold text-xl leading-snug flex items-center justify-between">
                              <span>{ev.title}</span>
                              <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2" />
                            </h3>
                          </Link>
                          {ev.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1.5">{ev.description}</p>
                          )}
                        </div>

                        {/* Speaker info preview */}
                        {ev.speaker_name && (
                          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5">
                            <Avatar className="h-9 w-9 border border-primary/20 shrink-0">
                              <AvatarImage src={ev.speaker_avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                                {speakerInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate text-foreground">{ev.speaker_name}</p>
                              {ev.speaker_designation && (
                                <p className="text-[11px] text-muted-foreground truncate">{ev.speaker_designation}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> {date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {time}
                            </span>
                          </div>
                          <Link to="/events/$id" params={{ id: ev.id }} className="font-semibold text-primary hover:underline flex items-center gap-0.5 text-xs">
                            Details <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-muted-foreground">Past Sessions</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {past.map((ev) => {
                  const { date } = formatWhen(ev.scheduled_at);
                  return (
                    <Link key={ev.id} to="/events/$id" params={{ id: ev.id }}>
                      <Card className="border-dashed opacity-80 hover:opacity-100 hover:border-primary/40 transition">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Video className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{ev.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {date} {ev.speaker_name ? `· Speaker: ${ev.speaker_name}` : ""}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}