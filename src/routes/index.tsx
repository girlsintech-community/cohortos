import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, MessageSquare, Target, Zap, Heart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-5">
        <span
          className="min-w-0 truncate text-base sm:text-lg font-extrabold tracking-tight bg-clip-text text-transparent"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          Girls Leading Tech
        </span>
        <Link to="/auth">
          <Button size="sm">Sign in</Button>
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-20 text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(closest-side,black,transparent)]"
          style={{
            background: "radial-gradient(60% 50% at 50% 20%, var(--primary) 0%, transparent 60%)",
          }}
        />
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Heart className="h-3.5 w-3.5 text-primary fill-current" /> A cohort by women, for women
          in tech
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Girls Leading Tech{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            DSA Cohort
          </span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
          A 4-week gamified home base to level up your Data Structures & Algorithms. Earn XP, climb
          leaderboards, and grow together with your cohort sisters.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0">
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto text-base px-8">
              Join the cohort <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
              Explore features
            </Button>
          </a>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
          {[
            { n: "140+", l: "Mentees" },
            { n: "25", l: "Mentors" },
            { n: "4 weeks", l: "Cohort" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border bg-card p-4 sm:p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                {s.n}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">Everything you need to ship every day</h2>
          <p className="text-muted-foreground mt-2">Built specifically for our cohort's journey.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "XP & Levels",
              desc: "Every post, comment, and challenge earns XP toward your next level.",
            },
            {
              icon: Flame,
              title: "Daily streaks",
              desc: "Show up every day and watch your streak — and status — grow.",
            },
            {
              icon: Trophy,
              title: "Leaderboards",
              desc: "Weekly, overall, helpful, challenge, and streak boards to compete on.",
            },
            {
              icon: MessageSquare,
              title: "Discussions",
              desc: "Threaded discussions by topic. Best answers get accepted and rewarded.",
            },
            {
              icon: Target,
              title: "Challenges",
              desc: "Mentors post them, you solve them, XP + badges land in your profile.",
            },
            {
              icon: Heart,
              title: "Sisterhood",
              desc: "A safe, supportive space to ask, share, and celebrate wins together.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 transition hover:-translate-y-0.5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-16 rounded-3xl p-8 sm:p-12 text-center text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <h3 className="text-2xl sm:text-3xl font-extrabold">Your seat is waiting.</h3>
          <p className="mt-2 text-primary-foreground/90 max-w-xl mx-auto">
            Sign in to unlock your dashboard, streaks, and this week's challenges.
          </p>
          <Link to="/auth" className="inline-block mt-6">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Get started
            </Button>
          </Link>
        </div>
      </section>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Girls Leading Tech · DSA Cohort
      </footer>
    </div>
  );
}
