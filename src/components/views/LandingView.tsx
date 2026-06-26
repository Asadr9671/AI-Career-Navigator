"use client";

/**
 * LandingView — hero landing page for the AI Career Navigator.
 * Single-page view (no props). Reads `goUpload` / `goCommunity` from the
 * navigator store to switch logical pages without touching the router.
 *
 * Sections:
 *   1. Hero (full-viewport, 3D scene behind, gradient headline, CTAs, stat chips)
 *   2. How it works (3 steps, glass cards, dashed desktop connector)
 *   3. Career paths (6 role cards mapped from ROLE_LIST, role-colored glow)
 *   4. Why trust us (4 feature cards)
 *   5. Final CTA (gradient-border glass panel)
 */
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Compass,
  Cpu,
  GraduationCap,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal, StaggerGroup } from "@/components/motion-helpers";
import HeroScene3D from "@/components/hero-scene-3d";
import { ROLE_LIST } from "@/lib/role-meta";
import { useNavigator } from "@/lib/navigator-store";

/** Literal class strings per role color token (Tailwind JIT needs full names). */
const ROLE_HOVER_CLASS: Record<string, string> = {
  violet: "hover:border-violet-500/60 hover:shadow-glow-violet",
  cyan: "hover:border-cyan-500/60 hover:shadow-glow-cyan",
  amber: "hover:border-amber-500/60 hover:shadow-[0_0_40px_-8px_rgba(245,158,11,0.55)]",
  emerald: "hover:border-emerald-500/60 hover:shadow-[0_0_40px_-8px_rgba(16,185,129,0.55)]",
  rose: "hover:border-rose-500/60 hover:shadow-[0_0_40px_-8px_rgba(244,63,94,0.55)]",
  teal: "hover:border-teal-500/60 hover:shadow-[0_0_40px_-8px_rgba(20,184,166,0.55)]",
};

const STEPS: Array<{ num: string; Icon: typeof Upload; title: string; desc: string }> = [
  { num: "01", Icon: Upload, title: "Upload", desc: "Drop your PDF resume and select your target role." },
  { num: "02", Icon: Cpu, title: "Analyze", desc: "Our AI scores your resume and finds your exact skill gaps." },
  { num: "03", Icon: BookOpen, title: "Learn", desc: "Get a week-by-week free roadmap to close every gap." },
];

const FEATURES: Array<{ Icon: typeof Scale; title: string; desc: string }> = [
  { Icon: Scale, title: "Honest scores", desc: "No score inflation — see where you really stand." },
  { Icon: GraduationCap, title: "Real free resources", desc: "YouTube, freeCodeCamp, and official docs only." },
  { Icon: CalendarDays, title: "12-week plan", desc: "Specific mini-projects mapped to every week." },
  { Icon: ShieldCheck, title: "Private by design", desc: "Your resume is never stored after analysis." },
];

const HERO_STATS: Array<{ value: string; label: string }> = [
  { value: "6", label: "career paths" },
  { value: "12-week", label: "roadmap" },
  { value: "$0", label: "cost" },
];

const PRIMARY_CTA =
  "group h-12 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-8 text-base font-semibold text-white shadow-glow-violet transition-transform hover:scale-[1.03]";

export default function LandingView() {
  const goUpload = useNavigator((s) => s.goUpload);
  const goCommunity = useNavigator((s) => s.goCommunity);

  return (
    <main className="relative">
      {/* ============================ HERO ============================ */}
      <section
        aria-label="Hero"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-28 pt-32 sm:px-6"
      >
        <HeroScene3D />
        {/* Readability veil over the 3D scene (sits above canvas, below content) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-b from-background/40 via-background/55 to-background"
        />

        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-foreground/80"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            Powered by AI · Free forever
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Know Exactly What&apos;s{" "}
            <span className="text-gradient">Holding Back</span> Your Career
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-2xl text-pretty text-base text-foreground/70 sm:text-lg"
          >
            Upload your resume. Get an honest readiness score, a precise skill gap analysis,
            and a free 12-week learning roadmap — tailored to the role you want.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button onClick={goUpload} aria-label="Analyze my resume" size="lg" className={PRIMARY_CTA}>
              Analyze My Resume
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              onClick={goCommunity}
              aria-label="Explore community"
              variant="ghost"
              size="lg"
              className="h-12 rounded-full border border-border/60 bg-background/40 px-8 text-base font-medium text-foreground/90 backdrop-blur hover:bg-background/60"
            >
              Explore Community
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-5 flex items-center gap-2 text-xs text-foreground/60"
          >
            <ShieldCheck className="size-4 text-emerald-400" />
            Free to use. No account required for instant results.
          </motion.div>
        </div>

        {/* Floating stat chips */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2 sm:gap-3"
        >
          {HERO_STATS.map((s) => (
            <div
              key={s.label}
              className="glass flex flex-col items-center rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3"
            >
              <span className="text-base font-bold text-foreground sm:text-lg">{s.value}</span>
              <span className="text-[10px] uppercase tracking-wide text-foreground/60 sm:text-xs">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ========================= HOW IT WORKS ========================= */}
      <section aria-label="How it works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            3 Steps
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            How it works
          </h2>
        </Reveal>

        <div className="relative mt-14">
          {/* Dashed connector — desktop only */}
          <div
            aria-hidden
            className="absolute left-[16%] right-[16%] top-[4.25rem] hidden h-px bg-repeat-x md:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(139,92,246,0.55) 50%, transparent 50%)",
              backgroundSize: "10px 1px",
            }}
          />
          <StaggerGroup className="grid gap-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <Reveal key={step.num} variant="up">
                <div className="glass group relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow-violet">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-black text-foreground/10 transition-colors group-hover:text-violet-500/30">
                      {step.num}
                    </span>
                    <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/25 text-violet-200">
                      <step.Icon className="size-6" />
                    </div>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-foreground/65">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ============================ ROLES ============================ */}
      <section aria-label="Career paths" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Career Paths
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Works for 6 career paths
          </h2>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_LIST.map((role) => {
            const hoverClass = ROLE_HOVER_CLASS[role.color.token] ?? "";
            return (
              <Reveal key={role.role} variant="up">
                <div
                  className={`group glass relative h-full cursor-default rounded-2xl border border-border/40 p-6 transition-all duration-300 hover:-translate-y-1.5 ${hoverClass}`}
                >
                  <div
                    className="flex size-14 items-center justify-center rounded-2xl text-white"
                    style={{
                      background: `linear-gradient(135deg, ${role.color.hex}, ${role.color.hex}99)`,
                      boxShadow: `0 10px 30px -10px ${role.color.hex}aa`,
                    }}
                  >
                    <role.icon className="size-7" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{role.role}</h3>
                  <p className="mt-1.5 text-sm text-foreground/65">{role.tagline}</p>
                </div>
              </Reveal>
            );
          })}
        </StaggerGroup>
      </section>

      {/* =========================== FEATURES =========================== */}
      <section aria-label="Why trust us" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Why Trust Us
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Built to actually help
          </h2>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Reveal key={f.title} variant="scale">
              <div className="glass group h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-500/40">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/25 text-violet-200">
                  <f.Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-foreground/65">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </StaggerGroup>
      </section>

      {/* =========================== FINAL CTA =========================== */}
      <section aria-label="Call to action" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-3xl p-[1px]">
            {/* Gradient border */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 opacity-80"
            />
            <div className="glass-strong relative flex flex-col items-center gap-6 rounded-3xl px-6 py-12 text-center sm:px-12 md:py-16">
              <Compass className="size-10 text-violet-400" />
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Stop guessing. Start <span className="text-gradient">closing gaps.</span>
              </h2>
              <p className="max-w-xl text-pretty text-foreground/70">
                One upload. A complete picture of where you stand and what to learn next.
              </p>
              <Button onClick={goUpload} aria-label="Analyze my resume" size="lg" className={PRIMARY_CTA}>
                Analyze My Resume
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
