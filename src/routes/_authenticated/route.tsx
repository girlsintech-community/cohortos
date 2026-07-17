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
  Accessibility,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Download,
  CheckSquare,
  Square,
  FileText,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isSunday as isSundayFn, format as formatDate, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [a11yOpen, setA11yOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // New features state
  const [weeklyWrapOpen, setWeeklyWrapOpen] = useState(false);
  const [todosOpen, setTodosOpen] = useState(false);
  const [wrapUnlocked, setWrapUnlocked] = useState(false);
  const [sliderVal, setSliderVal] = useState(0);
  const [activeTab, setActiveTab] = useState<"notes" | "todos">("notes");

  // Notes state & queries
  const { data: dbNotes, refetch: refetchNotes } = useQuery({
    queryKey: ["userNotes", userId],
    enabled: todosOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      if (!noteTitle.trim()) throw new Error("Title cannot be empty");
      if (selectedNote?.id) {
        const { error } = await supabase
          .from("user_notes")
          .update({ title: noteTitle, content: noteContent, updated_at: new Date().toISOString() })
          .eq("id", selectedNote.id);
        if (error) throw error;
        toast.success("Note saved!");
      } else {
        const { data, error } = await supabase
          .from("user_notes")
          .insert({ user_id: userId, title: noteTitle, content: noteContent })
          .select()
          .single();
        if (error) throw error;
        setSelectedNote(data);
        toast.success("Note created!");
      }
    },
    onSuccess: () => {
      refetchNotes();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("user_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      setSelectedNote(null);
      setNoteTitle("");
      setNoteContent("");
      refetchNotes();
    },
    onError: (err: any) => toast.error(err.message)
  });

  // To-Dos state & queries
  const { data: dbPersonalTodos, refetch: refetchPersonalTodos } = useQuery({
    queryKey: ["personalTodos", userId],
    enabled: todosOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_todos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: dbCohortTodos, refetch: refetchCohortTodos } = useQuery({
    queryKey: ["cohortTodos"],
    enabled: todosOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cohort_todos")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: dbCohortCompletions, refetch: refetchCohortCompletions } = useQuery({
    queryKey: ["cohortCompletions", userId],
    enabled: todosOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_todo_completions")
        .select("todo_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map(d => d.todo_id);
    }
  });

  const [newTodoText, setNewTodoText] = useState("");

  const addPersonalTodoMutation = useMutation({
    mutationFn: async () => {
      if (!newTodoText.trim()) return;
      const { error } = await supabase
        .from("personal_todos")
        .insert({ user_id: userId, title: newTodoText.trim(), completed: false });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTodoText("");
      refetchPersonalTodos();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const togglePersonalTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("personal_todos")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchPersonalTodos()
  });

  const deletePersonalTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchPersonalTodos()
  });

  const toggleCohortTodoMutation = useMutation({
    mutationFn: async ({ todoId, completed }: { todoId: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("user_todo_completions")
          .insert({ user_id: userId, todo_id: todoId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_todo_completions")
          .delete()
          .eq("user_id", userId)
          .eq("todo_id", todoId);
        if (error) throw error;
      }
    },
    onSuccess: () => refetchCohortCompletions()
  });

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  // Accessibility settings states loaded from localStorage
  const [lang, setLang] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("a11y-lang") || "en" : "en"));
  const [filter, setFilter] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("a11y-filter") || "none" : "none"));
  const [textSize, setTextSize] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("a11y-text-size") || "normal" : "normal"));
  const [dyslexic, setDyslexic] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("a11y-dyslexic") === "true" : false));
  const [spacing, setSpacing] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("a11y-spacing") || "normal" : "normal"));
  const [highContrast, setHighContrast] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("a11y-contrast-mode") === "true" : false));

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

  // Accessibility dynamic updates
  function handleLangChange(newLang: string) {
    setLang(newLang);
    localStorage.setItem("a11y-lang", newLang);
    const select = document.querySelector("select.goog-te-combo") as HTMLSelectElement;
    if (select) {
      select.value = newLang;
      select.dispatchEvent(new Event("change"));
      toast.success("Translating page...");
    } else {
      toast.error("Translation engine loading. Please try again in a moment.");
    }
  }

  function handleFilterChange(newFilter: string) {
    // Remove old class
    if (filter !== "none") {
      document.documentElement.classList.remove(`a11y-filter-${filter}`);
    }
    setFilter(newFilter);
    localStorage.setItem("a11y-filter", newFilter);
    if (newFilter !== "none") {
      document.documentElement.classList.add(`a11y-filter-${newFilter}`);
    }
    toast.success("Applied visual filter");
  }

  function handleTextSizeChange(newSize: string) {
    if (textSize !== "normal") {
      document.documentElement.classList.remove(`a11y-text-${textSize}`);
    }
    setTextSize(newSize);
    localStorage.setItem("a11y-text-size", newSize);
    if (newSize !== "normal") {
      document.documentElement.classList.add(`a11y-text-${newSize}`);
    }
    toast.success("Adjusted text size");
  }

  function handleDyslexicChange(checked: boolean) {
    setDyslexic(checked);
    localStorage.setItem("a11y-dyslexic", checked ? "true" : "false");
    if (checked) {
      document.documentElement.classList.add("a11y-dyslexic");
    } else {
      document.documentElement.classList.remove("a11y-dyslexic");
    }
    toast.success(checked ? "Dyslexic font enabled" : "Dyslexic font disabled");
  }

  function handleSpacingChange(newSpacing: string) {
    if (spacing !== "normal") {
      document.documentElement.classList.remove(`a11y-spacing-${spacing}`);
    }
    setSpacing(newSpacing);
    localStorage.setItem("a11y-spacing", newSpacing);
    if (newSpacing !== "normal") {
      document.documentElement.classList.add(`a11y-spacing-${newSpacing}`);
    }
    toast.success("Adjusted line spacing");
  }

  function handleContrastChange(checked: boolean) {
    setHighContrast(checked);
    localStorage.setItem("a11y-contrast-mode", checked ? "true" : "false");
    if (checked) {
      document.documentElement.classList.add("a11y-high-contrast-mode");
    } else {
      document.documentElement.classList.remove("a11y-high-contrast-mode");
    }
    toast.success(checked ? "High Contrast mode enabled" : "High Contrast mode disabled");
  }

  // Weekly wrap: is today Sunday?
  const isSunday = isSundayFn(new Date());

  // Weekly wrap stats (last 7 days)
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["weeklyWrap", userId],
    enabled: weeklyWrapOpen && wrapUnlocked,
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const sinceISO = weekStart.toISOString();
      const [postsRes, discRes, xpRes, badgesRes, chalRes, likesRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId).gte("created_at", sinceISO),
        supabase.from("discussions").select("id", { count: "exact", head: true }).eq("author_id", userId).gte("created_at", sinceISO),
        supabase.from("xp_events").select("xp_amount").eq("user_id", userId).gte("created_at", sinceISO),
        supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("awarded_at", sinceISO),
        supabase.from("challenge_submissions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sinceISO),
        supabase.from("post_likes").select("post_id, posts!inner(author_id)").eq("posts.author_id", userId).gte("created_at", sinceISO),
      ]);
      const xpSum = (xpRes.data ?? []).reduce((a: number, r: any) => a + (r.xp_amount ?? 0), 0);
      return {
        weekRangeText: `${formatDate(weekStart, "MMM d")} – ${formatDate(weekEnd, "MMM d, yyyy")}`,
        posts: postsRes.count ?? 0,
        discussions: discRes.count ?? 0,
        xp: xpSum,
        likesReceived: (likesRes.data ?? []).length,
        badges: badgesRes.count ?? 0,
        challenges: chalRes.count ?? 0,
      };
    },
  });

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
          <DropdownMenuItem onClick={() => { setWeeklyWrapOpen(true); setSliderVal(0); setWrapUnlocked(false); }} className="cursor-pointer">
            <Trophy className="h-4 w-4 mr-2 text-amber-500" />
            Weekly Wrap
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTodosOpen(true)} className="cursor-pointer">
            <FileText className="h-4 w-4 mr-2 text-indigo-500" />
            To-Do & Notes
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
          <DropdownMenuItem onClick={() => setA11yOpen(true)} className="cursor-pointer">
            <Accessibility className="h-4 w-4 mr-2" />
            Accessibility
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

      {/* Accessibility settings dialog */}
      <Dialog open={a11yOpen} onOpenChange={setA11yOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-primary" /> Accessibility Settings
            </DialogTitle>
            <DialogDescription>
              Personalize CohortOS to make learning and navigation comfortable for your preference.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4 divide-y divide-border/50">
            {/* Section 1: Languages */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Language (भाषा)
              </Label>
              <div className="space-y-1">
                <Select value={lang} onValueChange={handleLangChange}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Choose Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (default)</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                    <SelectItem value="bn">Bengali (বাংলা)</SelectItem>
                    <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                    <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                    <SelectItem value="mr">Marathi (मराठी)</SelectItem>
                    <SelectItem value="kn">Kannada (ಕನ್ನಡ)</SelectItem>
                    <SelectItem value="gu">Gujarati (ગુજરાતી)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Powered by Google Translate. Automatically localizes all page contents including community discussions and submissions.
                </p>
              </div>
            </div>

            {/* Section 2: Visual Adaptations */}
            <div className="space-y-3 pt-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Visual & Color Adaptations
              </Label>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium">Color Blindness Filter</span>
                  <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="No Filters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default (No filter)</SelectItem>
                      <SelectItem value="deuteranopia">Deuteranopia (Green Weakness)</SelectItem>
                      <SelectItem value="protanopia">Protanopia (Red Weakness)</SelectItem>
                      <SelectItem value="tritanopia">Tritanopia (Blue-Yellow Blindness)</SelectItem>
                      <SelectItem value="grayscale">Monochromacy (Grayscale)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label htmlFor="hc-mode" className="text-xs font-semibold">High Contrast Mode</Label>
                    <p className="text-[10px] text-muted-foreground">Forces pure black/white theme with solid borders.</p>
                  </div>
                  <Switch id="hc-mode" checked={highContrast} onCheckedChange={handleContrastChange} />
                </div>
              </div>
            </div>

            {/* Section 3: Text & Reading Comfort */}
            <div className="space-y-3 pt-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Text & Reading Comfort
              </Label>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium">Text Size Scale</span>
                  <Select value={textSize} onValueChange={handleTextSizeChange}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (100%)</SelectItem>
                      <SelectItem value="lg">Large (+20%)</SelectItem>
                      <SelectItem value="xl">Extra Large (+40%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium">Line Height Spacing</span>
                  <Select value={spacing} onValueChange={handleSpacingChange}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="wide">Wide</SelectItem>
                      <SelectItem value="extrawide">Extra Wide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label htmlFor="dyslexia-font" className="text-xs font-semibold">Dyslexic-Friendly Font</Label>
                    <p className="text-[10px] text-muted-foreground">Changes font styles and letter tracking for easier reading.</p>
                  </div>
                  <Switch id="dyslexia-font" checked={dyslexic} onCheckedChange={handleDyslexicChange} />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* ─── Weekly Wrap Dialog ─── */}
      <Dialog open={weeklyWrapOpen} onOpenChange={setWeeklyWrapOpen}>
        <DialogContent className="max-w-md bg-slate-950 text-slate-50 border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-rose-400">
              <Trophy className="h-5 w-5 text-amber-400" /> Weekly Wrap
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review and download your progress recap for the week.
            </DialogDescription>
          </DialogHeader>

          {!isSunday ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 border border-slate-800 grid place-items-center text-2xl animate-pulse">
                🔒
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base text-slate-200">Weekly Wrap is Locked</h3>
                <p className="text-xs text-slate-400 px-4 leading-relaxed">
                  Weekly wraps compile your posts, discussions, badges, and challenges. They unlock every Sunday!
                </p>
              </div>

              {/* Progress bar to Sunday */}
              <div className="space-y-1.5 px-6 pt-2">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Monday</span>
                  <span>Sunday</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500" 
                    style={{ width: `${Math.round(((new Date().getDay() === 0 ? 7 : new Date().getDay()) / 7) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-center font-medium">
                  Unlocking progress: {Math.round(((new Date().getDay() === 0 ? 7 : new Date().getDay()) / 7) * 100)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {!wrapUnlocked ? (
                <div className="text-center space-y-6 py-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center text-3xl animate-bounce">
                    🎉
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-slate-100">Your Weekly Wrap is Ready!</h3>
                    <p className="text-xs text-slate-400 px-4 leading-relaxed">
                      Slide to 100% to unlock your weekly accomplishments card.
                    </p>
                  </div>

                  {/* Manual slider to unlock */}
                  <div className="px-6 space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSliderVal(val);
                        if (val >= 100) {
                          setWrapUnlocked(true);
                          toast.success("Weekly Wrap Unlocked! 🌟");
                        }
                      }}
                      className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-primary border border-slate-800"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Slide to Unlock</span>
                      <span>{sliderVal}%</span>
                    </div>
                  </div>
                </div>
              ) : isLoadingStats ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-slate-400">Compiling your stats...</p>
                </div>
              ) : !stats ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Could not load your statistics. Please try again.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Visual card mimicking output */}
                  <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-indigo-950/50 border border-slate-800 p-5 space-y-4 shadow-xl">
                    <div className="text-center space-y-1">
                      <p className="text-[10px] tracking-widest text-primary font-bold uppercase">Weekly Recap</p>
                      <h4 className="text-lg font-bold text-white">Your Achievements</h4>
                      <p className="text-[10px] text-slate-400">{stats.weekRangeText}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">Posts Made</span>
                        <p className="text-xl font-extrabold text-white flex items-center gap-1.5">
                          <span>📝</span> {stats.posts}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">Discussions</span>
                        <p className="text-xl font-extrabold text-white flex items-center gap-1.5">
                          <span>💬</span> {stats.discussions}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">XP Earned</span>
                        <p className="text-xl font-extrabold text-amber-400 flex items-center gap-1.5">
                          <span>⚡</span> {stats.xp}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">Likes Received</span>
                        <p className="text-xl font-extrabold text-rose-400 flex items-center gap-1.5">
                          <span>❤️</span> {stats.likesReceived}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">Badges Earned</span>
                        <p className="text-xl font-extrabold text-violet-400 flex items-center gap-1.5">
                          <span>🏆</span> {stats.badges}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">Challenges Met</span>
                        <p className="text-xl font-extrabold text-emerald-400 flex items-center gap-1.5">
                          <span>🎯</span> {stats.challenges}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-slate-300 border-slate-800 hover:bg-slate-900"
                      onClick={() => { setWrapUnlocked(false); setSliderVal(0); }}
                    >
                      Lock again
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-medium flex items-center justify-center gap-1.5"
                      onClick={() => {
                        // HTML5 Canvas generation
                        const canvas = document.createElement("canvas");
                        canvas.width = 800;
                        canvas.height = 1000;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;

                        // Background
                        const grad = ctx.createLinearGradient(0, 0, 0, 1000);
                        grad.addColorStop(0, "#090d16");
                        grad.addColorStop(0.5, "#13132d");
                        grad.addColorStop(1, "#2b072c");
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, 800, 1000);

                        // Glow spots
                        ctx.fillStyle = "rgba(139, 92, 246, 0.12)";
                        ctx.beginPath(); ctx.arc(150, 200, 250, 0, Math.PI*2); ctx.fill();
                        ctx.fillStyle = "rgba(236, 72, 153, 0.12)";
                        ctx.beginPath(); ctx.arc(650, 750, 300, 0, Math.PI*2); ctx.fill();

                        // Sparkles / Confetti
                        const colors = ["#fbbf24", "#ec4899", "#3b82f6", "#10b981", "#8b5cf6"];
                        for (let i = 0; i < 50; i++) {
                          ctx.fillStyle = colors[i % colors.length];
                          const cx = Math.random() * 800;
                          const cy = Math.random() * 1000;
                          const cr = Math.random() * 4 + 1.5;
                          ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI*2); ctx.fill();
                        }

                        // Header
                        ctx.textAlign = "center";
                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
                        ctx.fillText("WEEKLY WRAP", 400, 130);

                        ctx.fillStyle = "#94a3b8";
                        ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
                        ctx.fillText(stats.weekRangeText, 400, 185);

                        // Stats Grid (6 cards: 2 columns, 3 rows)
                        const statsList = [
                          { label: "Posts Made", val: stats.posts, icon: "📝" },
                          { label: "Discussions", val: stats.discussions, icon: "💬" },
                          { label: "XP Earned", val: `${stats.xp} XP`, icon: "⚡" },
                          { label: "Likes Received", val: stats.likesReceived, icon: "❤️" },
                          { label: "Badges Earned", val: stats.badges, icon: "🏆" },
                          { label: "Challenges Met", val: stats.challenges, icon: "🎯" }
                        ];

                        const cardW = 320;
                        const cardH = 150;
                        const startX = 60;
                        const startY = 250;
                        const gapX = 40;
                        const gapY = 35;

                        statsList.forEach((st, idx) => {
                          const col = idx % 2;
                          const row = Math.floor(idx / 2);
                          const x = startX + col * (cardW + gapX);
                          const y = startY + row * (cardH + gapY);

                          // Card background
                          ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
                          ctx.strokeStyle = "rgba(139, 92, 246, 0.2)";
                          ctx.lineWidth = 2;

                          // Draw rounded card
                          ctx.beginPath();
                          const r = 16;
                          if (ctx.roundRect) {
                            ctx.roundRect(x, y, cardW, cardH, r);
                          } else {
                            ctx.rect(x, y, cardW, cardH);
                          }
                          ctx.fill();
                          ctx.stroke();

                          // Draw Icon
                          ctx.font = "40px Arial";
                          ctx.textAlign = "left";
                          ctx.fillText(st.icon, x + 24, y + 85);

                          // Draw Value
                          ctx.fillStyle = "#ffffff";
                          ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
                          ctx.fillText(String(st.val), x + 90, y + 70);

                          // Draw Label
                          ctx.fillStyle = "#64748b";
                          ctx.font = "600 16px system-ui, -apple-system, sans-serif";
                          ctx.fillText(st.label, x + 90, y + 105);
                        });

                        // Footer
                        ctx.textAlign = "center";
                        ctx.fillStyle = "rgba(255,255,255,0.3)";
                        ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
                        ctx.fillText("GIRLS IN TECH · COHORT OS", 400, 900);

                        const botGrad = ctx.createLinearGradient(200, 0, 600, 0);
                        botGrad.addColorStop(0, "rgba(139, 92, 246, 0)");
                        botGrad.addColorStop(0.5, "rgba(236, 72, 153, 0.6)");
                        botGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
                        ctx.fillStyle = botGrad;
                        ctx.fillRect(200, 920, 400, 2);

                        // Trigger download
                        const link = document.createElement("a");
                        link.download = `Weekly_Recap_${stats.weekRangeText.replace(/\s+/g, "_")}.png`;
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                        toast.success("Wrap card downloaded! Share it on socials! 📸");
                      }}
                    >
                      <Download className="h-4 w-4 mr-1.5" /> Download Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── To-Do & Notes Dialog ─── */}
      <Dialog open={todosOpen} onOpenChange={setTodosOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden bg-card border">
          <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-indigo-500" /> Workspace: Notes & Tasks
              </DialogTitle>
              <DialogDescription className="text-xs">
                Take class notes, export to PDF, and complete cohort-wide tasks.
              </DialogDescription>
            </div>
            <div className="flex items-center border rounded-lg p-0.5 bg-muted">
              <button 
                onClick={() => setActiveTab("notes")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === "notes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Notes
              </button>
              <button 
                onClick={() => setActiveTab("todos")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === "todos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                To-Do Lists
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex min-h-0">
            {activeTab === "notes" ? (
              <div className="flex-1 flex overflow-hidden divide-x">
                {/* Notes Sidebar */}
                <div className="w-56 flex-col flex bg-muted/20 shrink-0 overflow-y-auto">
                  <div className="p-3 border-b">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs flex items-center justify-center gap-1 border-dashed hover:bg-muted"
                      onClick={() => {
                        setSelectedNote(null);
                        setNoteTitle("Untitled Note");
                        setNoteContent("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> New Note
                    </Button>
                  </div>
                  <div className="flex-1 divide-y">
                    {(dbNotes ?? []).length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No notes yet. Start a new one!
                      </div>
                    ) : (
                      (dbNotes ?? []).map((n: any) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setSelectedNote(n);
                            setNoteTitle(n.title);
                            setNoteContent(n.content);
                          }}
                          className={`w-full text-left p-3 text-xs transition hover:bg-muted/40 ${selectedNote?.id === n.id ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"}`}
                        >
                          <p className="truncate text-foreground/90 font-medium">{n.title || "Untitled"}</p>
                          <p className="truncate text-[10px] text-muted-foreground mt-0.5">{n.content || "Empty content..."}</p>
                          <p className="text-[9px] text-slate-500 mt-1">
                            {new Date(n.updated_at).toLocaleDateString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Note Editor */}
                <div className="flex-1 flex flex-col p-5 space-y-4 overflow-y-auto">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Note Title</Label>
                    <Input 
                      value={noteTitle} 
                      onChange={(e) => setNoteTitle(e.target.value)} 
                      placeholder="Give your note a title..."
                      className="text-sm font-semibold"
                    />
                  </div>
                  <div className="flex-1 flex flex-col space-y-1">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Content</Label>
                    <textarea 
                      value={noteContent} 
                      onChange={(e) => setNoteContent(e.target.value)} 
                      placeholder="Start writing notes from your cohort masterclass..."
                      className="flex-1 w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background resize-none min-h-[220px]"
                    />
                  </div>
                  <div className="flex items-center justify-between shrink-0 border-t pt-3">
                    {selectedNote ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() => {
                          if (confirm("Delete this note?")) {
                            deleteNoteMutation.mutate(selectedNote.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    ) : (
                      <div />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                        disabled={!noteTitle.trim()}
                        onClick={() => {
                          // Native PDF generation
                          const printWindow = window.open("", "_blank");
                          if (!printWindow) return;
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>${noteTitle}</title>
                                <style>
                                  body { font-family: system-ui, -apple-system, sans-serif; padding: 45px; color: #1e293b; line-height: 1.6; }
                                  h1 { font-size: 28px; margin-bottom: 6px; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
                                  .meta { font-size: 13px; color: #64748b; margin-bottom: 25px; font-weight: 500; }
                                  .body-content { font-size: 15px; white-space: pre-wrap; color: #334155; }
                                  @media print { body { padding: 0; } }
                                </style>
                              </head>
                              <body>
                                <h1>${noteTitle}</h1>
                                <div class="meta">Cohort OS Masterclass Note · Generated on ${new Date().toLocaleString()}</div>
                                <div class="body-content">${noteContent}</div>
                                <script>
                                  window.onload = function() {
                                    window.print();
                                    setTimeout(() => window.close(), 500);
                                  }
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }}
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                      <Button
                        size="sm"
                        disabled={saveNoteMutation.isPending || !noteTitle.trim()}
                        className="text-xs text-white"
                        style={{ background: "var(--gradient-primary)" }}
                        onClick={() => saveNoteMutation.mutate()}
                      >
                        {saveNoteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save note"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // To-Do Lists Layout
              <div className="flex-1 flex overflow-hidden divide-x">
                {/* Cohort To-Dos (Left Column) */}
                <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                  <h3 className="font-bold text-sm text-foreground/90 mb-3 flex items-center gap-1.5">
                    🎯 Cohort Tasks <span className="text-[10px] text-muted-foreground font-normal">Assigned by admin</span>
                  </h3>
                  <div className="space-y-3">
                    {(dbCohortTodos ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No cohort tasks assigned yet.</p>
                    ) : (
                      (dbCohortTodos ?? []).map((todo: any) => {
                        const isCompleted = (dbCohortCompletions ?? []).includes(todo.id);
                        return (
                          <div 
                            key={todo.id} 
                            onClick={() => toggleCohortTodoMutation.mutate({ todoId: todo.id, completed: !isCompleted })}
                            className="flex items-start gap-3 p-3 rounded-xl border border-muted hover:bg-muted/20 transition cursor-pointer select-none"
                          >
                            <button className="mt-0.5 text-primary">
                              {isCompleted ? (
                                <CheckSquare className="h-4.5 w-4.5 text-primary" />
                              ) : (
                                <Square className="h-4.5 w-4.5 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {todo.title}
                              </p>
                              {todo.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                                  {todo.description}
                                </p>
                              )}
                              {todo.due_date && (
                                <span className="inline-block mt-2 text-[9px] font-bold text-rose-500 uppercase tracking-wider bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                                  Due: {new Date(todo.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Personal To-Dos (Right Column) */}
                <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                  <h3 className="font-bold text-sm text-foreground/90 mb-3">
                    📝 My Personal Tasks
                  </h3>

                  {/* Add task bar */}
                  <div className="flex gap-2 mb-4">
                    <Input 
                      placeholder="Add a new task..." 
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      className="text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addPersonalTodoMutation.mutate();
                      }}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => addPersonalTodoMutation.mutate()}
                      disabled={addPersonalTodoMutation.isPending || !newTodoText.trim()}
                      className="text-white shrink-0"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(dbPersonalTodos ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Add personal tasks to track your goals.</p>
                    ) : (
                      (dbPersonalTodos ?? []).map((todo: any) => (
                        <div 
                          key={todo.id} 
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/10 group"
                        >
                          <div 
                            className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                            onClick={() => togglePersonalTodoMutation.mutate({ id: todo.id, completed: !todo.completed })}
                          >
                            <button className="text-primary">
                              {todo.completed ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <p className={`text-xs truncate ${todo.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {todo.title}
                            </p>
                          </div>
                          <button
                            onClick={() => deletePersonalTodoMutation.mutate(todo.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
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

  // Screen time tracking heartbeat
  useEffect(() => {
    if (!user?.id) return;

    let activeStartTime = Date.now();

    const interval = setInterval(async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const elapsed = Math.round((now - activeStartTime) / 1000);
        activeStartTime = now;
        
        if (elapsed > 0) {
          try {
            await supabase.rpc("increment_screen_time", { seconds_to_add: elapsed });
          } catch (err) {
            console.error("Failed to increment screen time:", err);
          }
        }
      } else {
        activeStartTime = Date.now();
      }
    }, 30000);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        const now = Date.now();
        const elapsed = Math.round((now - activeStartTime) / 1000);
        activeStartTime = now;
        if (elapsed > 0) {
          try {
            await supabase.rpc("increment_screen_time", { seconds_to_add: elapsed });
          } catch (err) {
            console.error("Failed to increment screen time on hide:", err);
          }
        }
      } else {
        activeStartTime = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const finalElapsed = Math.round((Date.now() - activeStartTime) / 1000);
      if (finalElapsed > 0) {
        void Promise.resolve(supabase.rpc("increment_screen_time", { seconds_to_add: finalElapsed })).catch(() => {});
      }
    };
  }, [user?.id]);

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
        { to: "/events", label: "Events", icon: Calendar },
        { to: "/resources", label: "Resources", icon: BookOpen },
        { to: "/library", label: "Library", icon: BookOpen },
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
            </nav>
            <div className="flex items-center gap-1 shrink-0">
              <NotificationBell userId={user.id} />
              <SettingsMenu userId={user.id} signOut={signOut} />
            </div>
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