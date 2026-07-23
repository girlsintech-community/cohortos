import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Target,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/challenges")({
  component: ChallengesPage,
});

function ChallengesPage() {
  const { user } = Route.useRouteContext();

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: mySubs } = useQuery({
    queryKey: ["mysubs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const subByChallenge = new Map((mySubs ?? []).map((s) => [s.challenge_id, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Challenges</h1>
        <p className="text-muted-foreground">Solve, submit, earn XP. Admins verify submissions.</p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : challenges?.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No challenges yet. Check back soon! 🎯
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges?.map((c) => (
            <ChallengeCard key={c.id} c={c} submission={subByChallenge.get(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

const diffColor: Record<string, string> = {
  easy: "bg-success/15 text-success border-success/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  hard: "bg-destructive/10 text-destructive border-destructive/30",
};

function ChallengeCard({ c, submission }: { c: any; submission: any }) {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(submission?.solution_url ?? "");
  const [notes, setNotes] = useState(submission?.notes ?? "");
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>(submission?.screenshot_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const MAX_SCREENSHOTS = 4;

  useEffect(() => {
    if (submission) {
      setUrl(submission.solution_url ?? "");
      setNotes(submission.notes ?? "");
      setScreenshotUrls(submission.screenshot_urls ?? (submission.screenshot_url ? [submission.screenshot_url] : []));
    } else {
      setUrl("");
      setNotes("");
      setScreenshotUrls([]);
    }
  }, [submission]);

  async function handleScreenshots(files: FileList) {
    const remaining = MAX_SCREENSHOTS - screenshotUrls.length;
    if (remaining <= 0) return toast.error(`You can upload up to ${MAX_SCREENSHOTS} screenshots`);
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      for (const file of toUpload) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is over 5MB, skipped`);
          continue;
        }
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/challenge-${c.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const up = await supabase.storage.from("challenge-screenshots").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        const signed = await supabase.storage
          .from("challenge-screenshots")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed.error) throw signed.error;
        setScreenshotUrls((prev) => [...prev, signed.data.signedUrl]);
      }
      toast.success("Screenshot(s) uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  function removeScreenshot(urlToRemove: string) {
    setScreenshotUrls((prev) => prev.filter((u) => u !== urlToRemove));
  }

  const submit = useMutation({
    mutationFn: async () => {
      const trimmedUrl = url.trim();
      if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
        throw new Error("Solution link must be a valid URL starting with http:// or https://");
      }

      if (submission) {
        const { error } = await supabase
          .from("challenge_submissions")
          .update({
            solution_url: trimmedUrl || null,
            notes: notes.trim() || null,
            screenshot_urls: screenshotUrls,
            screenshot_url: screenshotUrls[0] || null,
            status: "submitted",
          })
          .eq("id", submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("challenge_submissions").insert({
          challenge_id: c.id,
          user_id: user.id,
          solution_url: trimmedUrl || null,
          notes: notes.trim() || null,
          screenshot_urls: screenshotUrls,
          screenshot_url: screenshotUrls[0] || null,
          status: "submitted",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Submitted! Awaiting review.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["mysubs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = submission?.status;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-4 w-4 text-primary" />
            {c.title}
          </CardTitle>
          <Badge variant="outline" className={diffColor[c.difficulty]}>
            {c.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-primary">+{c.xp_reward} XP</span>
          {c.link && (
            <a
              href={c.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" /> Problem
            </a>
          )}
        </div>
        <div className="pt-2">
          {status === "approved" ? (
            <Badge className="bg-success text-success-foreground gap-1">
              <CheckCircle2 className="h-3 w-3" /> Approved · +{c.xp_reward} XP
            </Badge>
          ) : status === "submitted" ? (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> Pending Review
            </Badge>
          ) : status === "rejected" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-destructive gap-1 bg-destructive/5 border-destructive/25"
                >
                  <XCircle className="h-3 w-3" /> Rejected
                </Badge>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs">
                      Edit & Resubmit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit submission: {c.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Solution link (GitHub, LeetCode, etc.)</Label>
                        <Input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://…"
                        />
                        <p className="text-xs text-muted-foreground">Must start with http:// or https://</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Screenshots (up to {MAX_SCREENSHOTS}, e.g. LeetCode confirmation)</Label>
                        <div className="flex items-center gap-2">
                          <label
                            className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer border rounded-md px-3 py-2 bg-muted/20 ${
                              screenshotUrls.length >= MAX_SCREENSHOTS ? "opacity-50 pointer-events-none" : ""
                            }`}
                          >
                            {uploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImagePlus className="h-4 w-4" />
                            )}
                            Add Screenshot{screenshotUrls.length > 0 ? "s" : ""}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => e.target.files && handleScreenshots(e.target.files)}
                              disabled={uploading || screenshotUrls.length >= MAX_SCREENSHOTS}
                            />
                          </label>
                          {screenshotUrls.length > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              {screenshotUrls.length}/{MAX_SCREENSHOTS} uploaded ✓
                            </span>
                          )}
                        </div>
                        {screenshotUrls.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {screenshotUrls.map((shot) => (
                              <div key={shot} className="relative w-full h-24 overflow-hidden rounded-md border">
                                <img src={shot} alt="Screenshot preview" className="object-cover w-full h-full" />
                                <button
                                  onClick={() => removeScreenshot(shot)}
                                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Approach, complexity, learnings…"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => submit.mutate()}
                        disabled={submit.isPending || uploading}
                      >
                        {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
                        Submit for review
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {submission.feedback && (
                <div className="text-xs text-destructive rounded-lg border border-destructive/20 bg-destructive/5 p-3 leading-relaxed whitespace-pre-wrap">
                  <span className="font-semibold block mb-0.5">Admin Feedback:</span>
                  {submission.feedback}
                </div>
              )}
            </div>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" style={{ background: "var(--gradient-primary)" }}>
                  Submit solution
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit: {c.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Solution link (GitHub, LeetCode, etc.)</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Screenshots (up to {MAX_SCREENSHOTS}, e.g. LeetCode confirmation)</Label>
                    <div className="flex items-center gap-2">
                      <label
                        className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer border rounded-md px-3 py-2 bg-muted/20 ${
                          screenshotUrls.length >= MAX_SCREENSHOTS ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        Add Screenshot{screenshotUrls.length > 0 ? "s" : ""}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => e.target.files && handleScreenshots(e.target.files)}
                          disabled={uploading || screenshotUrls.length >= MAX_SCREENSHOTS}
                        />
                      </label>
                      {screenshotUrls.length > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          {screenshotUrls.length}/{MAX_SCREENSHOTS} uploaded ✓
                        </span>
                      )}
                    </div>
                    {screenshotUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {screenshotUrls.map((shot) => (
                          <div key={shot} className="relative w-full h-24 overflow-hidden rounded-md border">
                            <img src={shot} alt="Screenshot preview" className="object-cover w-full h-full" />
                            <button
                              onClick={() => removeScreenshot(shot)}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Approach, complexity, learnings…"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => submit.mutate()}
                    disabled={submit.isPending || uploading}
                  >
                    {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit
                    for review
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}