import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Sign in failed", { description: error.message });
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) return toast.error("Sign up failed", { description: error.message });
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      toast.success("Check your email to confirm your account.");
      return;
    }
    toast.success("Account created — welcome to the cohort!");
    navigate({ to: "/dashboard", replace: true });
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        <Link to="/" className="text-lg font-bold">
          Girls Leading Tech · Cohort OS
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">Learn, contribute, compete — together.</h1>
          <p className="text-lg text-primary-foreground/90 max-w-md">
            The home base for the Girls Leading Tech DSA cohort. Earn XP, climb the leaderboard, and ship every day.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { n: "120", l: "Mentees" },
              { n: "25", l: "Mentors" },
              { n: "5wk", l: "Cohort" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <div className="text-2xl font-bold">{s.n}</div>
                <div className="text-sm text-primary-foreground/80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-primary-foreground/70">Girls Leading Tech · DSA Cohort</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader className="space-y-2">
            <div className="lg:hidden text-primary font-bold">Girls Leading Tech · Cohort OS</div>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to join your cohort dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pw">Password</Label>
                    <div className="relative">
                      <Input id="si-pw" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Display name</Label>
                    <Input id="su-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password</Label>
                    <div className="relative">
                      <Input id="su-pw" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}