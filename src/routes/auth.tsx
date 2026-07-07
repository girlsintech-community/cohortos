import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Wand2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

async function isEmailAllowed(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("allowed_emails")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    // If the table doesn't exist yet (migration not applied), allow all
    console.warn("Could not check allowed_emails:", error.message);
    return true;
  }
  return !!data;
}

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const strength = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Check allowlist
    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      setBusy(false);
      return toast.error("Access denied", {
        description:
          "This email is not on the approved list. This platform is exclusively for Girls Leading Tech program members.",
      });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Sign in failed", { description: error.message });
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Check allowlist
    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      setBusy(false);
      return toast.error("Access denied", {
        description:
          "This email is not on the approved list. This platform is exclusively for Girls Leading Tech program mentees. Contact the admin if you believe this is an error.",
      });
    }
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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error("Couldn't send reset email", { description: error.message });
    toast.success("Check your inbox for the reset link.");
    setForgotOpen(false);
  }

  function generatePassword() {
    const pw = makeStrongPassword();
    setPassword(pw);
    setShowPassword(true);
    toast.success("Generated a strong password", {
      description: "Copy it somewhere safe before signing up.",
    });
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
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Link to="/" className="text-lg font-bold">
          Girls Leading Tech · Cohort OS
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Learn, contribute, compete — together.
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-md">
            The home base for the Girls Leading Tech DSA cohort. Earn XP, climb the leaderboard, and
            ship every day.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { n: "140", l: "Mentees" },
              { n: "25", l: "Mentors" },
              { n: "4 weeks", l: "Cohort" },
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
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              🔒 This platform is exclusively for Girls Leading Tech program members. Only
              pre-approved emails can sign in or sign up.
            </div>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input
                      id="si-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pw">Password</Label>
                    <div className="relative">
                      <Input
                        id="si-pw"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotOpen(true);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                  </Button>
                </form>
                {forgotOpen && (
                  <form
                    onSubmit={handleForgot}
                    className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3"
                  >
                    <Label htmlFor="fp-email" className="text-xs">
                      Send reset link to
                    </Label>
                    <Input
                      id="fp-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" type="submit" disabled={busy}>
                        {busy && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Send link
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => setForgotOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Display name</Label>
                    <Input
                      id="su-name"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password</Label>
                    <div className="relative">
                      <Input
                        id="su-pw"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <PasswordStrength score={strength.score} label={strength.label} />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Wand2 className="h-3 w-3" /> Generate strong password
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Use 12+ characters with uppercase, lowercase, a number, and a symbol (e.g.{" "}
                      <code className="rounded bg-muted px-1">!@#$%</code>).
                    </p>
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

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[Math.min(score, 5)] };
}

function makeStrongPassword(len = 16) {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const syms = "!@#$%^&*?-_+=";
  const all = lower + upper + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(lower), pick(upper), pick(nums), pick(syms)];
  for (let i = chars.length; i < len; i++) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

function PasswordStrength({ score, label }: { score: number; label: string }) {
  const tone =
    score <= 1
      ? "bg-destructive"
      : score <= 2
        ? "bg-amber-500"
        : score <= 3
          ? "bg-yellow-500"
          : "bg-green-500";
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 w-6 rounded ${i < score ? tone : "bg-muted"}`} />
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
