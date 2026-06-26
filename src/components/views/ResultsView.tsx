"use client";

/**
 * ResultsView — the analysis results dashboard.
 *
 * Shows an animated circular readiness gauge, skill-gap pills, strength pills,
 * and action buttons (View Roadmap / Export PDF / Analyze Another).
 *
 * PDF export is fully client-side via pdf-lib (no backend call).
 */
import * as React from "react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  AlertCircle,
  CheckCircle2,
  FileDown,
  RefreshCw,
  ArrowRight,
  Trophy,
  X,
  Check,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useNavigator } from "@/lib/navigator-store";
import type { AnalysisResult, DimensionScore } from "@/lib/types";
import { getRoleMeta } from "@/lib/role-meta";
import { Reveal, StaggerGroup } from "@/components/motion-helpers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

/* --------------------------------- helpers -------------------------------- */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Score → fill color (red / amber / emerald). */
function scoreColorHex(score: number): string {
  if (score < 40) return "#f43f5e"; // rose
  if (score < 70) return "#f59e0b"; // amber
  return "#10b981"; // emerald
}

function scoreColorToken(score: number): "rose" | "amber" | "emerald" {
  if (score < 40) return "rose";
  if (score < 70) return "amber";
  return "emerald";
}

const COLOR_CLASSES: Record<
  "rose" | "amber" | "emerald",
  { text: string; bg: string; border: string; glow: string; from: string; to: string }
> = {
  rose: {
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(244,63,94,0.45)]",
    from: "from-rose-500",
    to: "to-rose-400",
  },
  amber: {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.45)]",
    from: "from-amber-500",
    to: "to-amber-400",
  },
  emerald: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]",
    from: "from-emerald-500",
    to: "to-emerald-400",
  },
};

/**
 * Human-readable labels for the 5 readiness dimensions returned by the AI.
 * Keys are the raw `name` strings from DimensionScore; unknown names fall
 * back to a Title-Cased version via `dimensionLabel()`.
 */
const DIMENSION_LABELS: Record<string, string> = {
  relevant_experience: "Relevant Experience",
  technical_skills: "Technical Skills",
  education: "Education",
  projects_portfolio: "Projects & Portfolio",
  leadership_impact: "Leadership & Impact",
};

/** Fallback: convert snake_case → Title Case for unknown dimension names. */
function humanizeDimensionName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve a dimension's raw name → human-readable label. */
function dimensionLabel(name: string): string {
  return DIMENSION_LABELS[name] ?? humanizeDimensionName(name);
}

/** Word-wrap a long line to fit a max pixel width using the embedded font. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        // word itself overflows → hard-break by char
        let chunk = "";
        for (const ch of w) {
          if (
            font.widthOfTextAtSize(chunk + ch, size) > maxWidth &&
            chunk
          ) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ------------------------------- PDF export ------------------------------- */

async function exportPDF(
  analysis: AnalysisResult,
  toast: ReturnType<typeof useToast>["toast"]
): Promise<void> {
  try {
    const doc = await PDFDocument.create();
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvB = await doc.embedFont(StandardFonts.HelveticaBold);

    const W = 595;
    const H = 842;
    const M = 50;
    const lineH = 18;
    const today = todayISO();

    const totalPages = 1 + Math.ceil(analysis.roadmap.length / 3); // 1 cover + weeks/3

    function drawFooter(page: PDFPage, idx: number) {
      const label = `${idx} / ${totalPages}`;
      const tw = helv.widthOfTextAtSize(label, 9);
      page.drawText(label, {
        x: (W - tw) / 2,
        y: 26,
        size: 9,
        font: helv,
        color: rgb(0.55, 0.55, 0.6),
      });
    }

    /* ----------------------------- Page 1: Cover ---------------------------- */
    const cover = doc.addPage([W, H]);
    let y = H - M;

    cover.drawText("AI Career Navigator Report", {
      x: M,
      y,
      size: 22,
      font: helvB,
      color: rgb(0.18, 0.12, 0.32),
    });
    y -= lineH * 1.4;

    cover.drawText(`Date: ${today}`, {
      x: M,
      y,
      size: 11,
      font: helv,
      color: rgb(0.35, 0.35, 0.4),
    });
    y -= lineH;

    cover.drawText(`Target Role: ${analysis.target_role}`, {
      x: M,
      y,
      size: 11,
      font: helv,
      color: rgb(0.22, 0.22, 0.28),
    });
    y -= lineH;

    cover.drawText(
      `Readiness Score: ${analysis.score} — ${analysis.score_label}`,
      {
        x: M,
        y,
        size: 12,
        font: helvB,
        color: rgb(0.16, 0.55, 0.42),
      }
    );
    y -= lineH * 2;

    // Score justification (may be absent on older analyses)
    if (analysis.score_justification && analysis.score_justification.trim()) {
      cover.drawText("Score Justification:", {
        x: M,
        y,
        size: 12,
        font: helvB,
        color: rgb(0.22, 0.22, 0.28),
      });
      y -= lineH;
      for (const ln of wrapText(
        analysis.score_justification,
        helv,
        10,
        W - M * 2
      )) {
        if (y < M + lineH) break;
        cover.drawText(ln, {
          x: M + 4,
          y,
          size: 10,
          font: helv,
          color: rgb(0.3, 0.3, 0.35),
        });
        y -= 14;
      }
      y -= lineH;
    }

    // Dimension breakdown (may be absent on older analyses)
    if (analysis.dimensions && analysis.dimensions.length > 0) {
      cover.drawText("Score Breakdown:", {
        x: M,
        y,
        size: 12,
        font: helvB,
        color: rgb(0.22, 0.22, 0.28),
      });
      y -= lineH;
      for (const dim of analysis.dimensions) {
        const label = dimensionLabel(dim.name);
        const evidencePart = dim.evidence ? ` — ${dim.evidence}` : "";
        const line = `•  ${label}: ${dim.score}/100${evidencePart}`;
        for (const ln of wrapText(line, helv, 10, W - M * 2 - 8)) {
          if (y < M + lineH) break;
          cover.drawText(ln, {
            x: M + 8,
            y,
            size: 10,
            font: helv,
            color: rgb(0.25, 0.25, 0.3),
          });
          y -= 14;
        }
        y -= 2;
      }
      y -= lineH;
    }

    // Gaps
    cover.drawText("Skills to Develop", {
      x: M,
      y,
      size: 14,
      font: helvB,
      color: rgb(0.8, 0.22, 0.32),
    });
    y -= lineH;
    for (const g of analysis.gaps) {
      const lines = wrapText(`•  ${g}`, helv, 10, W - M * 2 - 8);
      for (const ln of lines) {
        if (y < M + lineH) break;
        cover.drawText(ln, {
          x: M + 8,
          y,
          size: 10,
          font: helv,
          color: rgb(0.25, 0.25, 0.3),
        });
        y -= 14;
      }
      y -= 2;
    }
    y -= lineH;

    // Strengths
    cover.drawText("Your Strengths", {
      x: M,
      y,
      size: 14,
      font: helvB,
      color: rgb(0.1, 0.6, 0.42),
    });
    y -= lineH;
    for (const s of analysis.strengths) {
      const lines = wrapText(`•  ${s}`, helv, 10, W - M * 2 - 8);
      for (const ln of lines) {
        if (y < M + lineH) break;
        cover.drawText(ln, {
          x: M + 8,
          y,
          size: 10,
          font: helv,
          color: rgb(0.25, 0.25, 0.3),
        });
        y -= 14;
      }
      y -= 2;
    }
    drawFooter(cover, 1);

    /* --------------------- Pages 2-4: Roadmap (3 / page) -------------------- */
    const weeks = analysis.roadmap;
    let pageIdx = 1;
    for (let i = 0; i < weeks.length; i += 3) {
      const page = doc.addPage([W, H]);
      pageIdx++;
      let py = H - M;

      page.drawText("Career Roadmap", {
        x: M,
        y: py,
        size: 18,
        font: helvB,
        color: rgb(0.18, 0.12, 0.32),
      });
      py -= lineH * 1.5;

      const chunk = weeks.slice(i, i + 3);
      for (const w of chunk) {
        if (py < M + 120) break; // safety; spec guarantees 3 fits

        page.drawText(`Week ${w.week}`, {
          x: M,
          y: py,
          size: 13,
          font: helvB,
          color: rgb(0.42, 0.32, 0.7),
        });
        py -= lineH;

        for (const ln of wrapText(
          `Topic: ${w.topic}`,
          helv,
          10,
          W - M * 2
        )) {
          page.drawText(ln, {
            x: M + 6,
            y: py,
            size: 10,
            font: helv,
            color: rgb(0.2, 0.2, 0.25),
          });
          py -= 14;
        }

        for (const ln of wrapText(
          `Resource: ${w.resource_title} (${w.resource_url})`,
          helv,
          9,
          W - M * 2
        )) {
          page.drawText(ln, {
            x: M + 6,
            y: py,
            size: 9,
            font: helv,
            color: rgb(0.38, 0.38, 0.42),
          });
          py -= 13;
        }

        for (const ln of wrapText(
          `Project: ${w.project}`,
          helv,
          10,
          W - M * 2
        )) {
          page.drawText(ln, {
            x: M + 6,
            y: py,
            size: 10,
            font: helv,
            color: rgb(0.2, 0.2, 0.25),
          });
          py -= 14;
        }
        py -= lineH * 0.7;
      }
      drawFooter(page, pageIdx);
    }

    /* ------------------------------ download -------------------------------- */
    const bytes = await doc.save();
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `career-roadmap-${slugify(analysis.target_role)}-${today}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    toast({
      title: "PDF exported",
      description: "Your career report has been downloaded.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    toast({
      title: "Export failed",
      description: msg,
      variant: "destructive",
    });
  }
}

/* -------------------------------- component ------------------------------- */

export default function ResultsView() {
  const { currentAnalysis, goUpload, goRoadmap } = useNavigator();
  const { toast } = useToast();

  const [displayScore, setDisplayScore] = React.useState(0);
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const analysis = currentAnalysis;

  // Animate the gauge from 0 → score on mount (and whenever score changes).
  React.useEffect(() => {
    if (!analysis) {
      setDisplayScore(0);
      return;
    }
    const target = analysis.score;
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setDisplayScore(Math.round(ease(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analysis?.score, analysis?.id]);

  /* -------------------------------- empty -------------------------------- */
  if (!analysis) {
    return (
      <section
        aria-label="No analysis available"
        className="flex min-h-[60vh] items-center justify-center px-4 py-16"
      >
        <Reveal variant="scale">
          <Card className="glass-strong mx-auto flex w-full max-w-md flex-col items-center gap-5 border-white/10 p-8 text-center">
            <div className="bg-violet-500/10 text-violet-300 ring-violet-500/20 flex size-16 items-center justify-center rounded-full ring-1">
              <Sparkles className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold text-foreground">
                No analysis yet
              </h2>
              <p className="text-muted-foreground text-sm">
                Upload your resume to see your personalized results here.
              </p>
            </div>
            <Button
              onClick={goUpload}
              className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:from-violet-400 hover:to-cyan-400"
            >
              Go to Upload
              <ArrowRight className="size-4" />
            </Button>
          </Card>
        </Reveal>
      </section>
    );
  }

  const score = analysis.score;
  const colorToken = scoreColorToken(score);
  const colorHex = scoreColorHex(score);
  const cc = COLOR_CLASSES[colorToken];
  const roleMeta = getRoleMeta(analysis.target_role);
  const RoleIcon = roleMeta.icon;

  const gaugeData = [{ name: "score", value: displayScore, fill: colorHex }];

  const handleExport = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await exportPDF(analysis, toast);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <section
      aria-label="Your analysis results"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14"
    >
      <StaggerGroup className="flex flex-col gap-6" stagger={0.08}>
        {/* -------------------------- Score header card -------------------------- */}
        <Reveal>
          <Card
            className="glass-strong relative overflow-hidden rounded-2xl border-white/10 p-6 sm:p-10"
            style={{
              backgroundImage: `radial-gradient(50rem 30rem at 50% -20%, ${colorHex}22, transparent 60%)`,
            }}
          >
            {/* role badge */}
            <div className="mb-6 flex justify-center">
              <div
                className={`inline-flex items-center gap-2 rounded-full border ${cc.border} ${cc.bg} ${cc.text} pl-1.5 pr-3.5 py-1.5 text-sm font-medium`}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-6 items-center justify-center rounded-md text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${roleMeta.color.hex}, ${roleMeta.color.hex}aa)`,
                  }}
                >
                  <RoleIcon className="size-3.5" />
                </span>
                <span>{analysis.target_role}</span>
              </div>
            </div>

            {/* gauge */}
            <div className="relative mx-auto h-[260px] w-full max-w-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="78%"
                  outerRadius="100%"
                  data={gaugeData}
                  startAngle={90}
                  endAngle={-270}
                  barSize={16}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background={{ fill: "rgba(255,255,255,0.06)" }}
                    dataKey="value"
                    cornerRadius={20}
                    angleAxisId={0}
                  >
                    {gaugeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>

              {/* center overlay: big number + label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={colorToken}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex items-baseline gap-1 ${cc.text}`}
                >
                  <span className="text-6xl font-bold tabular-nums tracking-tight">
                    {displayScore}
                  </span>
                  <span className="text-2xl font-semibold">%</span>
                </motion.div>
                <span className="text-muted-foreground mt-1 text-xs uppercase tracking-widest">
                  Ready
                </span>
              </div>
            </div>

            {/* score label */}
            <p className="mt-6 text-center text-lg font-medium text-foreground sm:text-xl">
              <AnimatePresence mode="wait">
                <motion.span
                  key={analysis.score_label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-gradient"
                >
                  {analysis.score_label}
                </motion.span>
              </AnimatePresence>
            </p>
          </Card>
        </Reveal>

        {/* ----------------------- Why this score? breakdown ---------------------- */}
        {((analysis.score_justification && analysis.score_justification.trim()) ||
          (analysis.dimensions && analysis.dimensions.length > 0)) && (
          <Reveal i={1}>
            <Card className="glass-strong rounded-2xl border-white/10 p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="bg-violet-500/10 text-violet-300 ring-violet-500/20 flex size-9 items-center justify-center rounded-lg ring-1">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Why this score?
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Evidence-based breakdown of your readiness
                  </p>
                </div>
              </div>

              {/* A. Score justification — quote-style block */}
              {analysis.score_justification &&
                analysis.score_justification.trim() && (
                  <blockquote
                    className="mb-6 border-l-2 py-1 pl-4 text-base italic leading-relaxed text-foreground/90 sm:text-lg"
                    style={{ borderColor: colorHex }}
                  >
                    {analysis.score_justification}
                  </blockquote>
                )}

              {/* B. Dimension breakdown — 5 progress-bar rows */}
              {analysis.dimensions && analysis.dimensions.length > 0 && (
                <StaggerGroup className="flex flex-col gap-4" stagger={0.07}>
                  {analysis.dimensions.map((dim: DimensionScore, idx: number) => {
                    const label = dimensionLabel(dim.name);
                    const dimHex = scoreColorHex(dim.score);
                    const dimToken = scoreColorToken(dim.score);
                    const dc = COLOR_CLASSES[dimToken];
                    const clamped = Math.max(0, Math.min(100, dim.score));
                    return (
                      <Reveal
                        key={`${dim.name}-${idx}`}
                        as="div"
                        variant="up"
                        i={idx}
                      >
                        <div>
                          <div className="mb-1.5 flex items-baseline justify-between gap-3">
                            <span className="text-sm font-medium text-foreground">
                              {label}
                            </span>
                            <span
                              className={`text-sm font-semibold tabular-nums ${dc.text}`}
                            >
                              {dim.score}
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuenow={dim.score}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${label}: ${dim.score} out of 100`}
                            className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${clamped}%`,
                                background: `linear-gradient(90deg, ${dimHex}, ${dimHex}cc)`,
                              }}
                            />
                          </div>
                          {dim.evidence && (
                            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                              {dim.evidence}
                            </p>
                          )}
                        </div>
                      </Reveal>
                    );
                  })}
                </StaggerGroup>
              )}

              {/* C. Calibration legend */}
              <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-4 text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-rose-500" />
                  0–39 significant gaps
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  40–69 competitive
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-600" />
                  70–84 strong senior
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-400" />
                  85–100 exceptional
                </span>
              </div>
            </Card>
          </Reveal>
        )}

        {/* --------------------- Gaps + Strengths two-up grid ------------------- */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* skill gaps */}
          <Reveal i={2}>
            <Card className="glass h-full rounded-2xl border-white/10 p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="bg-rose-500/10 text-rose-300 flex size-9 items-center justify-center rounded-lg ring-1 ring-rose-500/20">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Skills to Develop
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {analysis.gaps.length} priority gaps identified
                  </p>
                </div>
              </div>

              <StaggerGroup
                className="flex flex-wrap gap-2"
                stagger={0.05}
                initialDelay={0.1}
              >
                {analysis.gaps.map((g, idx) => (
                  <Reveal key={`${g}-${idx}`} as="div" variant="up" i={idx}>
                    <Badge
                      variant="outline"
                      className="border-rose-500/25 bg-rose-500/10 text-rose-200 gap-1.5 px-3 py-1.5 text-sm font-medium"
                    >
                      {g}
                      <X className="size-3.5 opacity-80" />
                    </Badge>
                  </Reveal>
                ))}
              </StaggerGroup>

              <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                Closing these gaps will most impact your readiness score.
              </p>
            </Card>
          </Reveal>

          {/* strengths */}
          <Reveal i={3}>
            <Card className="glass h-full rounded-2xl border-white/10 p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="bg-emerald-500/10 text-emerald-300 flex size-9 items-center justify-center rounded-lg ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Your Strengths
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {analysis.strengths.length} areas to leverage
                  </p>
                </div>
              </div>

              <StaggerGroup
                className="flex flex-wrap gap-2"
                stagger={0.07}
                initialDelay={0.15}
              >
                {analysis.strengths.map((s, idx) => (
                  <Reveal key={`${s}-${idx}`} as="div" variant="up" i={idx}>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200 gap-1.5 px-3 py-1.5 text-sm font-medium"
                    >
                      {s}
                      <Check className="size-3.5 opacity-80" />
                    </Badge>
                  </Reveal>
                ))}
              </StaggerGroup>

              <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                Leverage these in interviews and on your resume.
              </p>
            </Card>
          </Reveal>
        </div>

        {/* ----------------------------- Action row ----------------------------- */}
        <Reveal i={4}>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => goRoadmap(analysis)}
              className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:from-violet-400 hover:to-cyan-400 sm:px-7"
              size="lg"
            >
              <Trophy className="size-4" />
              View Full Roadmap
              <ArrowRight className="size-4" />
            </Button>

            <Button
              onClick={handleExport}
              disabled={pdfLoading}
              aria-busy={pdfLoading}
              variant="secondary"
              size="lg"
              className="border border-white/10 bg-white/5 text-foreground hover:bg-white/10 sm:px-6"
            >
              {pdfLoading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <FileDown className="size-4" />
                  Export PDF Report
                </>
              )}
            </Button>

            <Button
              onClick={goUpload}
              variant="ghost"
              size="lg"
              className="text-muted-foreground hover:text-foreground sm:px-6"
            >
              <RefreshCw className="size-4" />
              Analyze Another Resume
            </Button>
          </div>
        </Reveal>
      </StaggerGroup>
    </section>
  );
}
