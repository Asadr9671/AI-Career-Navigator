"use client";

/**
 * UploadView — PDF dropzone + role selector + analyze button.
 * On success hands the AnalysisResult to the navigator store (goResults).
 * All visual states animated with framer-motion + AnimatePresence.
 * Palette: violet/cyan accent + per-role hex (no indigo/blue).
 */
import * as React from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle2, X, Loader2, AlertCircle, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, StaggerGroup } from "@/components/motion-helpers";
import { useNavigator } from "@/lib/navigator-store";
import { ROLE_LIST } from "@/lib/role-meta";
import type { AnalysisResult, ApiResponse, TargetRole } from "@/lib/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const LOADING_MESSAGES = [
  "Reading your resume...",
  "Scanning for skill gaps...",
  "Drafting your 12-week plan...",
  "Comparing against role benchmarks...",
  "Polishing your roadmap...",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function UploadView() {
  const goResults = useNavigator((s) => s.goResults);

  const [file, setFile] = React.useState<File | null>(null);
  const [targetRole, setTargetRole] = React.useState<TargetRole | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [statusIndex, setStatusIndex] = React.useState(0);
  const [hoveredRole, setHoveredRole] = React.useState<string | null>(null);

  // Rotate the loading status messages while the LLM is working.
  React.useEffect(() => {
    if (!isAnalyzing) return;
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [isAnalyzing]);

  const onDrop = React.useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setError(null);

      if (rejections.length > 0) {
        const errs = rejections[0]?.errors ?? [];
        if (errs.some((e) => e.code === "file-too-large")) {
          setError("That file is over 5MB. Please upload a smaller PDF.");
        } else if (errs.some((e) => e.code === "file-invalid-type")) {
          setError("Only PDF files are accepted. Please upload a .pdf resume.");
        } else {
          setError("We couldn't accept that file. Try another PDF.");
        }
        return;
      }

      const f = accepted[0];
      if (!f) return;

      // Client-side double check (defense in depth).
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      if (!isPdf) {
        setError("Only PDF files are accepted. Please upload a .pdf resume.");
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError("That file is over 5MB. Please upload a smaller PDF.");
        return;
      }
      setFile(f);
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDrop,
  });

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  const canAnalyze = Boolean(file) && Boolean(targetRole) && !isAnalyzing;

  const handleAnalyze = async () => {
    if (!file || !targetRole) return;
    setError(null);
    setIsAnalyzing(true);
    setStatusIndex(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target_role", targetRole);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json: ApiResponse<AnalysisResult> = (await res.json()) as ApiResponse<AnalysisResult>;

      if (!res.ok || json.error || !json.data) {
        throw new Error(json.message || "Analysis failed. Please try again.");
      }
      goResults(json.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed. Please try again.";
      setError(msg);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32 lg:pt-36">
      {/* ───────── Page header ───────── */}
      <Reveal className="mb-12 text-center sm:mb-16">
        <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
          <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" aria-hidden="true" />
          Step-by-step
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Analyze your <span className="text-gradient">resume</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Drop your PDF and pick the role you&apos;re targeting. Our AI gives you an honest readiness
          score and a 12-week plan in seconds.
        </p>
      </Reveal>

      {/* ───────── Step 1 — dropzone ───────── */}
      <section className="mb-14">
        <SectionHeading step="01" title="Upload your resume" />
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: isDragActive ? 1.02 : 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  {...getRootProps({
                    className: `group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors sm:p-14 glass ${
                      isDragActive
                        ? "border-violet-400 bg-violet-500/10"
                        : "border-violet-400/40 hover:border-violet-400/80 hover:bg-violet-500/5"
                    }`,
                  })}
                >
                  <input {...getInputProps()} aria-label="Upload resume PDF" />
                  <motion.div
                    animate={isDragActive ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
                    className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-violet-200 shadow-glow-violet"
                  >
                    <UploadCloud className="size-7" />
                  </motion.div>
                  <p className="text-base font-medium text-foreground sm:text-lg">
                    {isDragActive ? "Drop it!" : "Drag your resume here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF files only · Max 5MB</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="glass-strong flex items-center gap-4 rounded-2xl border border-emerald-400/30 p-5"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 text-emerald-300">
                  <FileText className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · Ready to analyze
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  aria-label="Remove file"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ───────── Step 2 — role grid ───────── */}
      <section className="mb-14">
        <SectionHeading step="02" title="Select your target role" />
        <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_LIST.map((r, idx) => {
            const Icon = r.icon;
            const selected = targetRole === r.role;
            const isHovered = hoveredRole === r.role;
            const glowStyle: React.CSSProperties =
              selected || isHovered
                ? {
                    borderColor: selected ? undefined : `${r.color.hex}80`,
                    boxShadow: `0 12px 36px -14px ${r.color.hex}66`,
                  }
                : {};

            return (
              <Reveal key={r.role} i={idx}>
                <motion.button
                  type="button"
                  onClick={() => setTargetRole(r.role)}
                  onMouseEnter={() => setHoveredRole(r.role)}
                  onMouseLeave={() => setHoveredRole(null)}
                  onFocus={() => setHoveredRole(r.role)}
                  onBlur={() => setHoveredRole(null)}
                  aria-pressed={selected}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  style={glowStyle}
                  className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-colors ${
                    selected
                      ? "border-violet-400/80 bg-violet-500/10"
                      : "border-white/10 glass hover:border-white/20"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(60% 60% at 50% 0%, ${r.color.hex}22, transparent 70%)`,
                      opacity: isHovered && !selected ? 1 : 0,
                    }}
                  />
                  <div className="relative flex items-start gap-4">
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{
                        background: `linear-gradient(135deg, ${r.color.hex}, ${r.color.hex}aa)`,
                        boxShadow: `0 8px 22px -8px ${r.color.hex}aa`,
                      }}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{r.role}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{r.tagline}</p>
                    </div>
                  </div>
                  <AnimatePresence>
                    {selected && (
                      <motion.span
                        layoutId="role-check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-violet-500 text-white shadow-glow-violet"
                      >
                        <CheckCircle2 className="size-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </Reveal>
            );
          })}
        </StaggerGroup>
      </section>

      {/* ───────── Step 3 — analyze button ───────── */}
      <section className="mb-8">
        <SectionHeading step="03" title="Run the analysis" />
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={canAnalyze ? { scale: 1 } : { scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full sm:w-auto"
          >
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              aria-busy={isAnalyzing}
              aria-label="Analyze resume"
              className={`relative h-12 w-full overflow-hidden px-8 text-base font-semibold sm:w-auto ${
                canAnalyze
                  ? "bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-500 text-white shadow-glow-violet hover:shadow-glow-cyan"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing your resume...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FileUp className="size-4" />
                  Analyze my resume
                </span>
              )}
            </Button>
          </motion.div>
          <p className="text-center text-xs text-muted-foreground">
            {canAnalyze
              ? "Takes ~10–30 seconds. We'll read every line."
              : "Select a PDF and a role to continue."}
          </p>
        </div>
      </section>

      {/* ───────── Error banner ───────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mx-auto max-w-2xl"
          >
            <div className="glass-strong flex items-start gap-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-rose-200">{error}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    if (!file) setFile(null);
                  }}
                  className="text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
                >
                  Try again
                </Button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                  className="flex size-7 items-center justify-center rounded-md text-rose-200 hover:bg-rose-500/20"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── Loading overlay ───────── */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong w-[90%] max-w-md rounded-2xl border border-violet-400/30 p-8 text-center shadow-glow-violet"
            >
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-violet-200">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <div className="mb-3 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="size-2 rounded-full bg-violet-400"
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={statusIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-medium text-foreground"
                >
                  {LOADING_MESSAGES[statusIndex]}
                </motion.p>
              </AnimatePresence>
              <p className="mt-2 text-xs text-muted-foreground">
                This usually takes 10–30 seconds.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small section heading: numbered chip + title + gradient divider line. */
function SectionHeading({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold text-violet-300">
        {step}
      </span>
      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
      <span className="ml-1 h-px flex-1 bg-gradient-to-r from-violet-400/40 to-transparent" />
    </div>
  );
}

export default UploadView;
