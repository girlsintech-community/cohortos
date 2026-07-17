import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ExternalLink, Loader2, Video, PartyPopper } from "lucide-react";

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
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_type, scheduled_at, duration_minutes, meeting_link, banner_image_url")
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
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((ev) => {
                  const { date, time } = formatWhen(ev.scheduled_at);
                  return (
                    <Card key={ev.id} className="overflow-hidden border hover:border-primary/30 transition">
                      {ev.banner_image_url && (
                        <div className="aspect-[3/1] w-full overflow-hidden border-b">
                          <img src={ev.banner_image_url} alt={ev.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className={typeColor[ev.event_type]}>
                            {typeLabel[ev.event_type]}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-lg leading-snug">{ev.title}</h3>
                        {ev.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" /> {date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" /> {time}
                            {ev.duration_minutes ? ` · ${ev.duration_minutes} min` : ""}
                          </span>
                        </div>
                        {ev.meeting_link && (
                          <Button
                            asChild
                            className="w-full mt-2 text-white"
                            style={{ background: "var(--gradient-primary)" }}
                          >
                            <a href={ev.meeting_link} target="_blank" rel="noreferrer">
                              Join Link <ExternalLink className="ml-1.5 h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-muted-foreground">Past</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {past.map((ev) => {
                  const { date } = formatWhen(ev.scheduled_at);
                  return (
                    <Card key={ev.id} className="border-dashed opacity-70">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Video className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </div>
                      </CardContent>
                    </Card>
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