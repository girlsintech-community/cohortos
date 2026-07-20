import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Linkedin,
  User,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$id")({
  component: EventDetailPage,
});

type EventDetail = {
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

const typeLabel: Record<EventDetail["event_type"], string> = {
  masterclass: "Masterclass",
  event: "Event",
  workshop: "Workshop",
  deadline: "Deadline",
};

const typeColor: Record<EventDetail["event_type"], string> = {
  masterclass: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
  event: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  workshop: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  deadline: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function EventDetailPage() {
  const { id } = Route.useParams();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["eventDetail", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as EventDetail | null;
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Event not found</h2>
        <p className="text-muted-foreground text-sm">
          The event or masterclass you are looking for does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link to="/events">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
          </Link>
        </Button>
      </div>
    );
  }

  const { date, time } = formatWhen(event.scheduled_at);
  const initials = (event.speaker_name || "Speaker").slice(0, 2).toUpperCase();

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and Share */}
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all events
        </Link>
        <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 text-xs">
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </div>

      {/* Main Event Details Card */}
      <Card className="overflow-hidden border shadow-lg">
        {/* Poster / Banner Header */}
        {event.banner_image_url ? (
          <div className="aspect-[21/9] w-full overflow-hidden bg-muted border-b">
            <img
              src={event.banner_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="h-40 w-full p-6 flex flex-col justify-end text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Badge variant="secondary" className="w-fit text-xs mb-2">
              {typeLabel[event.event_type]}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{event.title}</h1>
          </div>
        )}

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header metadata */}
          <div className="space-y-3">
            {event.banner_image_url && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={typeColor[event.event_type]}>
                  {typeLabel[event.event_type]}
                </Badge>
              </div>
            )}
            {event.banner_image_url && (
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{event.title}</h1>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4 text-primary" /> {date}
              </span>
              <span className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-primary" /> {time}
                {event.duration_minutes ? ` (${event.duration_minutes} mins)` : ""}
              </span>
            </div>
          </div>

          {/* Join Link Button */}
          {event.meeting_link && (
            <div className="rounded-xl border bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Ready to attend?</p>
                <p className="text-xs text-muted-foreground">
                  Join the live session using the link below.
                </p>
              </div>
              <Button
                asChild
                className="w-full sm:w-auto text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <a href={event.meeting_link} target="_blank" rel="noreferrer">
                  Join Live Masterclass <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          {/* Event Description */}
          {event.description && (
            <div className="space-y-2 border-t pt-6">
              <h3 className="font-bold text-base">About this Masterclass</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Speaker Info Section */}
          {event.speaker_name && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Meet the Speaker
              </h3>
              <div className="rounded-xl border bg-muted/30 p-5 flex flex-col sm:flex-row gap-5 items-start">
                <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0">
                  <AvatarImage src={event.speaker_avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  <div>
                    <h4 className="font-bold text-lg">{event.speaker_name}</h4>
                    {event.speaker_designation && (
                      <p className="text-xs text-primary font-medium">
                        {event.speaker_designation}
                      </p>
                    )}
                  </div>
                  {event.speaker_bio && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {event.speaker_bio}
                    </p>
                  )}
                  {event.speaker_linkedin && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    >
                      <a href={event.speaker_linkedin} target="_blank" rel="noreferrer">
                        <Linkedin className="mr-1.5 h-3.5 w-3.5 fill-current" /> Connect on LinkedIn
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
