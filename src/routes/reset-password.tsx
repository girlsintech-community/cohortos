import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Supabase auto-parses the recovery URL fragment and creates a temp session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("Couldn't update password", { description: error.message });
    toast.success("Password updated — signing you in");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Pick something strong — at least 12 characters with a mix of letters, numbers, and
            symbols.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="grid place-items-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary mb-2" />
              Verifying reset link… If nothing happens, request a new link from the{" "}
              <Link to="/auth" className="text-primary underline ml-1">
                sign in page
              </Link>
              .
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="np">New password</Label>
                <div className="relative">
                  <Input
                    id="np"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
