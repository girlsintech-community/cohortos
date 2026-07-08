import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouter,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  User,
  LogOut,
  Rss,
  MessagesSquare,
  Target,
  Trophy,
  Shield,
  Users,
  BookOpen,
  Bell,
  MoreHorizontal,
  X,
  UsersRound,
  Settings,
  ShieldAlert,
  HeartHandshake,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const user = data.user;

    // Fetch profile with all required fields
    const { data: p } = await supabase
      .from("profiles")
      .select("onboarded, linkedin_url, github_url, city, state, bio, skills")
      .eq("id", user.id)
      .maybeSingle();

    const hasAllRequired =
      p?.onboarded === true &&
      !!p?.linkedin_url?.trim() &&
      !!p?.github_url?.trim() &&
      !!p?.city?.trim() &&
      !!p?.state?.trim() &&
      !!p?.bio?.trim() &&
      Array.isArray(p?.skills) &&
      p.skills.length > 0;

    const { data: guideConfirmation } = await (supabase as any)
      .from("user_guide_confirmations")
      .select("id")
      .eq("user_id", user.id)
      .eq("guide_version", "2026-07-08")
      .maybeSingle();

    const hasCompletedEntry = hasAllRequired && !!guideConfirmation;

    // If any required field or guide confirmation is missing, send to onboarding
    if (!hasCompletedEntry && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (hasCompletedEntry && location.pathname === "/onboarding") {
      throw redirect({ to: "/dashboard" });
    }

    // Load role for admin nav
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const { data: pr } = await supabase
      .from("profiles")
      .select("primary_role")
      .eq("id", user.id)
      .maybeSingle();
    const primaryRole = ((pr as { primary_role?: string | null } | null)?.primary_role ?? null) as
      "mentee" | "mentor" | "team_member" | null;
    return { user, isAdmin, onboarded: hasCompletedEntry, primaryRole };
  },
  component: AuthedLayout,
});

// ─── Notification Bell ───
function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Array<{
        id: string;
        type: string;
        title: string;
        body: string | null;
        link: string | null;
        is_read: boolean;
        created_at: string;
      }>;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          const newNotif = payload.new as any;
          if (newNotif && newNotif.title) {
            toast(newNotif.title, {
              description: newNotif.body,
              action: newNotif.link ? {
                label: "View",
                onClick: () => {
                  window.location.href = newNotif.link;
                }
              } : undefined
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async () => {
      const ids = (notifications ?? []).filter((n) => !n.is_read).map((n) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) markRead.mutate();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border bg-card shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {(notifications ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet 🔔
            </div>
          ) : (
            <div className="divide-y">
              {(notifications ?? []).map((n) => (
                <Link
                  key={n.id}
                  to={n.link ?? "/dashboard"}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 hover:bg-muted/50 transition ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsMenu({ userId, signOut }: { userId: string; signOut: () => void }) {
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", nextTheme);
    toast.success(`Switched to ${nextTheme} mode`);
  }

  async function submitReport(type: "bug_report" | "feedback") {
    if (!message.trim()) return toast.error("Please enter a message");
    setBusy(true);
    try {
      const { error } = await supabase.from("feedback_reports").insert({
        user_id: userId,
        type,
        message: message.trim(),
      });
      if (error) throw error;
      toast.success(
        type === "bug_report"
          ? "Bug report submitted successfully! The admin has been notified."
          : "Thank you for your feedback! The admin has been notified."
      );
      setMessage("");
      setReportOpen(false);
      setFeedbackOpen(false);
    } catch (err: any) {
      toast.error("Failed to submit", { description: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => navigate({ to: "/profile" })} className="cursor-pointer">
            <User className="h-4 w-4 mr-2" />
            Your Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
            {theme === "light" ? (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Light Mode
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReportOpen(true)} className="cursor-pointer">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Report a Bug
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFeedbackOpen(true)} className="cursor-pointer">
            <HeartHandshake className="h-4 w-4 mr-2" />
            Give Feedback
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bug report dialog */}
      <Dialog open={reportOpen} onOpenChange={(open) => { setReportOpen(open); if(!open) setMessage(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report a Bug</DialogTitle>
            <DialogDescription>
              Encountered an issue? Tell us about it and we'll fix it as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Describe the issue *</Label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What went wrong? Please include as many details as possible."
                maxLength={1000}
              />
            </div>
            <Button
              className="w-full text-white"
              disabled={busy}
              onClick={() => submitReport("bug_report")}
              style={{ background: "var(--gradient-primary)" }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send to Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={(open) => { setFeedbackOpen(open); if(!open) setMessage(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Platform Feedback</DialogTitle>
            <DialogDescription>
              We'd love to hear your suggestions on how we can improve CohortOS!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Your suggestions *</Label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your ideas or feature suggestions here..."
                maxLength={1000}
              />
            </div>
            <Button
              className="w-full text-white"
              disabled={busy}
              onClick={() => submitReport("feedback")}
              style={{ background: "var(--gradient-primary)" }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send to Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Layout ───
function AuthedLayout() {
  const router = useRouter();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, onboarded, primaryRole } = Route.useRouteContext();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const allNav = onboarded
    ? [
        { to: "/dashboard", label: "Dashboard", icon: Home },
        { to: "/feed", label: "Feed", icon: Rss },
        { to: "/discussions", label: "Discussions", icon: MessagesSquare },
        { to: "/pods", label: "Pods", icon: UsersRound },
        { to: "/challenges", label: "Challenges", icon: Target },
        { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
        { to: "/resources", label: "Resources", icon: BookOpen },
        ...(primaryRole === "mentee"
          ? [{ to: "/speed-networking", label: "Networking", icon: Users }]
          : []),
        ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
      ]
    : [];

  // Mobile: bottom bar shows first 4 + "More"
  const mobileMainNav = allNav.slice(0, 4);
  const mobileOverflowNav = allNav.slice(4);

  // ── Desktop layout ──
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <Link
              to="/dashboard"
              className="min-w-0 shrink truncate text-base sm:text-lg font-bold tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              GLT · Cohort OS
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {allNav.map((n) => {
                const active = path === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`inline-flex items-center gap-2 rounded-lg px-2.5 sm:px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <n.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{n.label}</span>
                  </Link>
                );
              })}
              <NotificationBell userId={user.id} />
              <SettingsMenu userId={user.id} signOut={signOut} />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Simplified mobile header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link
            to="/dashboard"
            className="text-base font-bold tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            GLT · Cohort OS
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <SettingsMenu userId={user.id} signOut={signOut} />
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/90 backdrop-blur-xl safe-area-pb">
        <div className="flex items-stretch justify-around h-16">
          {mobileMainNav.map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                {n.label}
              </Link>
            );
          })}
          {/* More button */}
          {mobileOverflowNav.length > 0 && (
            <div className="relative flex flex-col items-center justify-center flex-1">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                  moreOpen ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                More
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                  <div className="absolute bottom-full mb-2 right-0 w-48 rounded-xl border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {mobileOverflowNav.map((n) => {
                      const active = path === n.to;
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                            active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <n.icon className="h-4 w-4" />
                          {n.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
