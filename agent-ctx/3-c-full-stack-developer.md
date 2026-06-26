# Task 3-c — full-stack-developer — UploadView

## Task
Build `src/components/views/UploadView.tsx` — the PDF drag-and-drop + role selector + analyze button page for AI Career Navigator. A `"use client"` default export, no props.

## Work Log
- Read `worklog.md`, `navigator-store.ts`, `role-meta.ts`, `types.ts`, `motion-helpers.tsx`, `card.tsx`, `button.tsx`, and the relevant `@utility` blocks in `globals.css` (glass / glass-strong / text-gradient / shadow-glow-violet / shadow-glow-cyan) to confirm exact import paths + utility names.
- Verified no `src/components/views/` directory existed; created it together with `agent-ctx/`.
- Wrote a single ~440-line component covering:
  1. Page header (eyebrow chip + `text-gradient` title + subtitle).
  2. PDF dropzone via `useDropzone({ accept: { "application/pdf": [".pdf"] }, maxSize: 5MB, multiple: false, onDrop })` with `AnimatePresence`-driven idle / drag-over / file-selected states. Drag-over scales 1.02 and switches to solid violet border + violet-tinted bg. File-selected shows filename, KB/MB size, emerald `CheckCircle2`, and a `X` remove button.
  3. Client-side validation in `onDrop` — accepts only `file.type === "application/pdf"` OR `.pdf` extension AND ≤5MB; rejects with a friendly inline red banner using `AlertCircle`.
  4. Role selector — 2-col / 3-col responsive grid of real `<button>` elements (`aria-pressed`), each rendering the role icon in a `linear-gradient` square using `r.color.hex`, the role name, and tagline. Hover lifts via `whileHover={{ y: -4 }}` and applies a role-colored border + glow via inline `boxShadow` (Tailwind can't JIT dynamic class names, so colors are runtime-applied). Selected state = violet border + violet-tinted bg + animated `layoutId="role-check"` badge.
  5. Analyze button — full-width on mobile, auto on desktop. Disabled + muted when no file OR no role. Active state = violet→cyan gradient + `shadow-glow-violet` → `shadow-glow-cyan` on hover, `aria-busy` set during call. On click POSTs `FormData(file, target_role)` to `/api/analyze`, parses `ApiResponse<AnalysisResult>`, calls `goResults(json.data)` on 200, otherwise surfaces `json.message` in the error banner.
  6. Error banner — dismissible red glass card with `AlertCircle`, message, and a "Try again" ghost button.
  7. Loading overlay — full-screen slate-950/70 backdrop with a centered glass-strong panel: animated spinner, 3 bouncing dots, and a rotating status message (`setInterval` every 2.5s cycling 5 messages). `role="status"` + `aria-live="polite"`.
  8. Section headings (`01`, `02`, `03`) with a gradient divider line for visual rhythm.
- Color discipline: only violet / cyan / emerald / teal / rose + per-role hex tokens — no indigo or blue classes anywhere.
- Ran `bun run lint` → clean (no errors, no warnings). Dev server log shows ongoing successful `GET / 200` compiles.

## Stage Summary
- Artifact: `src/components/views/UploadView.tsx` (default export `UploadView`, no props, strict TypeScript, ~440 lines).
- Depends only on already-existing imports declared in the task spec.
- Integration contract for downstream agents: this view calls `useNavigator().goResults(AnalysisResult)` to hand off to the Results view, and posts multipart/form-data `file` + `target_role` to `POST /api/analyze` (the API contract from Task 2).
- Ready to be mounted by the main page router (`src/app/page.tsx`) when `view === "upload"`.
