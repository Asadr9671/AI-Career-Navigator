"use client";

/**
 * RoadmapView - 12-week learning roadmap.
 *
 * Reads `currentAnalysis` from the navigator store. If null, shows an empty
 * state directing the user to upload. Otherwise renders:
 *  - Header with role badge, progress bar (X of 12 weeks complete)
 *  - Filter tabs (All / Remaining / Completed) with counts
 *  - 12 color-coded week cards (cyan / amber / emerald groups) with
 *    resource link, project description, and a "Mark as complete" checkbox
 *  - Completion banner (AnimatePresence) when all 12 weeks are checked
 *
 * Progress is persisted to localStorage keyed by analysis id (with a
 * topic-hash fallback if id is missing) so users can resume across reloads.
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Wrench, CheckCircle2, Trophy, ExternalLink, CalendarDays, Flag,
} from "lucide-react";
import { useNavigator } from "@/lib/navigator-store";
import { getRoleMeta } from "@/lib/role-meta";
import type { RoadmapWeek } from "@/lib/types";
import { Reveal } from "@/components/motion-helpers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

type FilterTab = "all" | "remaining" | "completed";

/** Color groups per spec - weeks 1-4 cyan, 5-8 amber, 9-12 emerald. */
const WEEK_COLOR = {
  cyan: {
    badge: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.70_0.18_195/0.30),0_18px_50px_-12px_oklch(0.70_0.18_195/0.45)] hover:border-cyan-500/60",
  },
  amber: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.78_0.18_75/0.30),0_18px_50px_-12px_oklch(0.78_0.18_75/0.45)] hover:border-amber-500/60",
  },
  emerald: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.70_0.18_160/0.30),0_18px_50px_-12px_oklch(0.70_0.18_160/0.45)] hover:border-emerald-500/60",
  },
} as const;

function weekGroup(week: number): keyof typeof WEEK_COLOR {
  if (week <= 4) return "cyan";
  if (week <= 8) return "amber";
  return "emerald";
}

/** Stable fallback key when analysis.id is missing. */
function hashTopics(weeks: RoadmapWeek[]): string {
  const s = weeks.map((w) => `${w.week}:${w.topic}`).join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export default function RoadmapView() {
  const currentAnalysis = useNavigator((s) => s.currentAnalysis);
  const goUpload = useNavigator((s) => s.goUpload);
  const goResults = useNavigator((s) => s.goResults);

  const [completed, setCompleted] = React.useState<Set<number>>(new Set());
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [hydrated, setHydrated] = React.useState(false);

  const storageKey = React.useMemo(() => {
    if (!currentAnalysis) return "roadmap-progress-anonymous";
    const id = currentAnalysis.id ?? hashTopics(currentAnalysis.roadmap ?? []);
    return `roadmap-progress-${id}`;
  }, [currentAnalysis]);

  // Load persisted progress on mount.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const next = new Set<number>();
          for (const n of parsed) {
            if (typeof n === "number" && Number.isFinite(n)) next.add(n);
          }
          setCompleted(next);
        }
      }
    } catch { /* ignore - corrupt JSON, start fresh */ }
    setHydrated(true);
  }, [storageKey]);

  const toggleWeek = React.useCallback(
    (week: number) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(week)) next.delete(week);
        else next.add(week);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify(Array.from(next).sort((a, b) => a - b))
            );
          } catch {
            /* ignore quota / privacy errors */
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  // ─── Empty state ──────────────────────────────────────────────────
  if (!currentAnalysis) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-16">
        <Reveal>
          <Card className="glass-strong w-full items-center gap-6 p-8 text-center sm:p-12">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30">
              <CalendarDays className="size-9" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                No roadmap yet
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground sm:text-base">
                Analyze your resume first to generate your personalized
                12-week learning plan, tailored to your target role and
                skill gaps.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:from-violet-400 hover:to-cyan-400"
              onClick={goUpload}
            >
              Go to Upload
              <ArrowLeft className="size-4 rotate-180" />
            </Button>
          </Card>
        </Reveal>
      </div>
    );
  }

  const weeks = currentAnalysis.roadmap ?? [];
  const total = weeks.length || 12;
  const completedCount = weeks.filter((w) => completed.has(w.week)).length;
  const progressPct = total ? (completedCount / total) * 100 : 0;
  const isComplete = weeks.length === 12 && completedCount === 12;

  const roleMeta = getRoleMeta(currentAnalysis.target_role);
  const RoleIcon = roleMeta.icon;

  const counts = {
    all: weeks.length,
    remaining: weeks.filter((w) => !completed.has(w.week)).length,
    completed: weeks.filter((w) => completed.has(w.week)).length,
  };

  const FILTERS: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "remaining", label: "Remaining", count: counts.remaining },
    { id: "completed", label: "Completed", count: counts.completed },
  ];

  const visible = weeks.filter((w) => {
    if (filter === "all") return true;
    if (filter === "remaining") return !completed.has(w.week);
    return completed.has(w.week);
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Back link */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => goResults(currentAnalysis)}
        >
          <ArrowLeft className="size-4" />
          Back to Results
        </Button>
      </div>

      {/* Header */}
      <Reveal>
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Your <span className="text-gradient">12-Week</span> Learning Roadmap
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 border-violet-500/40 bg-violet-500/10 pl-1 pr-3 py-1 text-sm text-violet-200"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-5 items-center justify-center rounded-sm text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${roleMeta.color.hex}, ${roleMeta.color.hex}aa)`,
                  }}
                >
                  <RoleIcon className="size-3" />
                </span>
                {currentAnalysis.target_role}
              </Badge>
              <Badge
                variant="outline"
                className="gap-1.5 border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200"
              >
                <CalendarDays className="size-3.5" />
                12-Week Plan
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-semibold text-foreground">
                  {completedCount} of {total} weeks complete
                </span>
                <span className="text-muted-foreground">
                  ({Math.round(progressPct)}%)
                </span>
              </div>
              {completedCount > 0 && (
                <Badge className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-200">
                  <CheckCircle2 className="size-3" />
                  {completedCount} done
                </Badge>
              )}
            </div>
            <Progress
              value={progressPct}
              className="h-2.5 bg-muted/60 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-violet-500 [&_[data-slot=progress-indicator]]:via-cyan-500 [&_[data-slot=progress-indicator]]:to-emerald-500"
            />
          </div>
        </div>
      </Reveal>

      {/* Filter tabs */}
      <Reveal i={1}>
        <div
          role="tablist"
          aria-label="Filter roadmap weeks"
          className="mt-8 flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  active
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-100 shadow-glow-violet"
                    : "border-border bg-card/40 text-muted-foreground hover:border-violet-500/30 hover:text-foreground"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs ${
                    active ? "bg-violet-500/30 text-violet-100" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* Week cards grid */}
      <motion.div layout className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <AnimatePresence mode="popLayout">
          {visible.map((w, idx) => {
            const group = weekGroup(w.week);
            const color = WEEK_COLOR[group];
            const done = completed.has(w.week);
            return (
              <motion.div
                key={w.week}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: Math.min(idx * 0.04, 0.3), duration: 0.4 },
                }}
                exit={{ opacity: 0, scale: 0.92 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
              >
                <Card
                  className={`relative h-full gap-0 overflow-hidden rounded-2xl p-0 transition-colors ${color.glow} ${
                    done ? "border-l-4 border-l-emerald-500 bg-emerald-500/5" : "bg-card/60"
                  }`}
                >
                  <div className="p-5 sm:p-6">
                    {/* Top row */}
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <Badge
                        variant="outline"
                        className={`gap-1 px-2.5 py-1 text-xs font-semibold ${color.badge}`}
                      >
                        <Flag className="size-3" />
                        Week {w.week}
                      </Badge>
                      {done ? (
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                      ) : (
                        <span className="mt-0.5 size-4 shrink-0 rounded-full border border-dashed border-muted-foreground/40" />
                      )}
                    </div>

                    {/* Topic */}
                    <h3 className={`mb-4 text-lg font-semibold leading-snug ${done ? "opacity-80" : ""}`}>
                      {w.topic}
                    </h3>

                    {/* Resource row */}
                    <div className={`mb-3 ${done ? "opacity-80" : ""}`}>
                      <a
                        href={w.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open resource: ${w.resource_title}`}
                        className="group -mx-2 flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-violet-500/10"
                      >
                        <BookOpen className="mt-0.5 size-4 shrink-0 text-violet-300" />
                        <span className="flex-1">
                          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Resource
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-200 underline-offset-2 group-hover:underline">
                            {w.resource_title}
                            <ExternalLink className="size-3.5 shrink-0 opacity-70" />
                          </span>
                        </span>
                      </a>
                    </div>

                    {/* Project row */}
                    <div className={`mb-5 ${done ? "opacity-80" : ""}`}>
                      <div className="flex items-start gap-2.5">
                        <Wrench className="mt-0.5 size-4 shrink-0 text-amber-300" />
                        <span className="flex-1">
                          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Project
                          </span>
                          <span className="text-sm text-muted-foreground">{w.project}</span>
                        </span>
                      </div>
                    </div>

                    {/* Footer checkbox */}
                    <label
                      htmlFor={`week-${w.week}-done`}
                      className="flex cursor-pointer items-center gap-2.5 border-t border-border/60 pt-4 text-sm"
                    >
                      <Checkbox
                        id={`week-${w.week}-done`}
                        checked={done}
                        onCheckedChange={() => toggleWeek(w.week)}
                        className="data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                      />
                      <span
                        className={`select-none font-medium ${
                          done ? "text-emerald-300" : "text-muted-foreground"
                        }`}
                      >
                        {done ? "Completed" : "Mark as complete"}
                      </span>
                    </label>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-16 text-center"
          >
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
              <CalendarDays className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === "completed"
                ? "No completed weeks yet - check off your first one!"
                : "All weeks are complete. Time to celebrate!"}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Completion banner */}
      <AnimatePresence>
        {hydrated && isComplete && (
          <motion.div
            key="completion-banner"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <Card className="glass-strong relative overflow-hidden rounded-2xl border-amber-500/30 p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-amber-500/20 blur-3xl" />
              <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40">
                  <Trophy className="size-8" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    <span className="text-gradient">Roadmap Complete!</span>
                  </h2>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    You&apos;ve put in the work - time to update your resume and apply.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="shrink-0 bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:from-violet-400 hover:to-cyan-400"
                  onClick={goUpload}
                >
                  Analyze Again
                  <ArrowLeft className="size-4 rotate-180" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
