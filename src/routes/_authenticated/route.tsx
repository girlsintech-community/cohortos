import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, User, LogOut, Rss, MessagesSquare, Target, Trophy, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const user = data.user;
    // Onboarding gate: force new users to fill their profile
    const { data: p } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
    const onboarded = p?.onboarded === true;
    if (!onboarded && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (onboarded && location.pathname === "/onboarding") {
      throw redirect({ to: "/dashboard" });
    }
    // Load role for admin nav
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const { data: pr } = await supabase.from("profiles").select("primary_role").eq("id", user.id).maybeSingle();
    const primaryRole = ((pr as { primary_role?: string | null } | null)?.primary_role ?? null) as "mentee" | "mentor" | "team_member" | null;
    return { user, isAdmin, onboarded, primaryRole };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, onboarded, primaryRole } = Route.useRouteContext();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const nav = onboarded ? [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/feed", label: "Feed", icon: Rss },
    { to: "/discussions", label: "Discussions", icon: MessagesSquare },
    { to: "/challenges", label: "Challenges", icon: Target },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ...(primaryRole === "mentee" ? [{ to: "/speed-networking", label: "Speed Networking", icon: Users }] : []),
    { to: "/profile", label: "Profile", icon: User },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/dashboard" className="min-w-0 shrink truncate text-base sm:text-lg font-bold tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            GLT · Cohort OS
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {nav.map((n) => {
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
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-1 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Sign out</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}