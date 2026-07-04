import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Flame, MessageSquare, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Cohort OS</span>
        </div>
        <Link to="/auth"><Button size="sm">Sign in</Button></Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="h-2 w-2 rounded-full bg-success" /> Girls Leading Tech · DSA Cohort
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Learn, contribute, compete — <span className="text-primary">together</span>.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
          The home base for our 5-week DSA cohort. Earn XP, climb leaderboards, and ship every day alongside 120+ mentees and 25 mentors.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="text-base px-6">Get started</Button></Link>
          <a href="#features"><Button size="lg" variant="outline" className="text-base px-6">Learn more</Button></a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Zap, title: "XP & Levels", desc: "Every post, comment, and challenge earns XP toward your next level." },
            { icon: Flame, title: "Daily streaks", desc: "Show up every day and watch your streak — and status — grow." },
            { icon: Trophy, title: "Leaderboards", desc: "Weekly, overall, helpful, challenge, and streak boards to compete on." },
            { icon: MessageSquare, title: "Discussions", desc: "Threaded discussions by topic. Best answers get accepted and rewarded." },
            { icon: Target, title: "Challenges", desc: "Mentors post them, you solve them, XP + badges land in your profile." },
            { icon: Sparkles, title: "Badges", desc: "Unlock badges from First Post to Weekly Champion as you contribute." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
