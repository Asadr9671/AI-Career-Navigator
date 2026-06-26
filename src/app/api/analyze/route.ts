/**
 * POST /api/analyze
 * Body: multipart/form-data with `file` (PDF, ≤5MB) and `target_role` (ANY non-empty
 * career path string the user types - 2-80 chars, sanitized). No fixed role whitelist.
 * Optional: `user_id` (kept for spec parity - we use a single shared DB so it's informational only).
 *
 * Flow (mirrors the master spec's POST /analyze/upload):
 *   1. Validate file content type is application/pdf → 400 if not
 *   2. Read bytes; 413 if > 5MB
 *   3. extractTextFromPdf
 *   4. validateResume → 422 if invalid
 *   5. isResume → 422 if false
 *   6. analyzeResume (LLM)
 *   7. If error → 502
 *   8. Insert row into Analysis table; upsert skill_trends (increment frequency)
 *   9. Return 200 with the saved analysis
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeResume } from "@/lib/ai-service";
import { extractTextFromPdf, isResume, truncateForModel, validateResume } from "@/lib/resume-parser";
import { sanitizeTargetRole, type AnalysisResult, type ApiResponse } from "@/lib/types";
import { pushToCommunityStore } from "@/lib/community-store";

export const runtime = "nodejs";
export const maxDuration = 60; // LLM call can take a while

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return envelope(null, "Invalid multipart form data.", 400);
  }

  const file = form.get("file");
  const targetRole = form.get("target_role");

  if (!(file instanceof File)) {
    return envelope(null, "Missing 'file' field.", 400);
  }
  // Accept ANY career path the user types - just sanitize + length-check it.
  const [roleOk, role, roleMsg] = sanitizeTargetRole(targetRole);
  if (!roleOk) {
    return envelope(null, roleMsg || "Please enter a valid target role.", 400);
  }
  const targetRoleClean = role;

  // 1. Content-type check (File.type may be empty for some uploads - also allow .pdf extension)
  const isPdfType = file.type === "application/pdf";
  const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
  if (!isPdfType && !isPdfExt) {
    return envelope(null, "Only PDF files are accepted.", 400);
  }

  // 2. Size check
  if (file.size > MAX_BYTES) {
    return envelope(null, "File too large. Maximum size is 5MB.", 413);
  }

  // 3. Extract text
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    text = await extractTextFromPdf(bytes);
  } catch (e) {
    console.error("[analyze] pdf parse failed:", e);
    return envelope(null, "Could not read this PDF. Please upload a text-based PDF.", 422);
  }

  // 4. Validate resume
  const [valid, vMsg] = validateResume(text);
  if (!valid) {
    return envelope(null, vMsg, 422);
  }
  if (vMsg === "truncated") {
    text = truncateForModel(text);
  }

  // 5. isResume heuristic
  if (!isResume(text)) {
    return envelope(null, "This does not appear to be a resume. Please upload your CV or resume.", 422);
  }

  // 6. AI analysis (use the sanitized role)
  const result = await analyzeResume(text, targetRoleClean);
  if ("error" in result) {
    return envelope(null, result.message, 502);
  }

  // 8. Persist + update skill trends
  let savedId: string | undefined;
  let createdAt: string | undefined;
  try {
    const created = await db.analysis.create({
      data: {
        targetRole: result.target_role,
        readinessScore: result.score,
        scoreLabel: result.score_label,
        scoreJustification: result.score_justification ?? null,
        dimensions: result.dimensions ? JSON.stringify(result.dimensions) : null,
        gaps: JSON.stringify(result.gaps),
        strengths: JSON.stringify(result.strengths),
        roadmap: JSON.stringify(result.roadmap),
      },
    });
    savedId = created.id;
    createdAt = created.createdAt.toISOString();

    // Upsert each gap into skill_trends (increment frequency on conflict)
    for (const gap of result.gaps) {
      const existing = await db.skillTrend.findUnique({
        where: { targetRole_skillName: { targetRole: targetRoleClean, skillName: gap } },
      });
      if (existing) {
        await db.skillTrend.update({
          where: { id: existing.id },
          data: { frequency: existing.frequency + 1, lastSeen: new Date() },
        });
      } else {
        await db.skillTrend.create({
          data: { targetRole: targetRoleClean, skillName: gap, frequency: 1, lastSeen: new Date() },
        });
      }
    }
  } catch (e) {
    console.error("[analyze] DB persist failed (analysis still returned to user):", e);
  }

  // 9. Return result with id + created_at
  const payload: AnalysisResult = {
    ...result,
    id: savedId,
    created_at: createdAt ?? new Date().toISOString(),
  };

  // Push to global community KV store asynchronously (non-blocking)
  pushToCommunityStore(payload).catch((err) => {
    console.error("[analyze] Failed to push to community store:", err);
  });

  return NextResponse.json(
    { data: payload, error: false, message: "ok" } satisfies ApiResponse<AnalysisResult>,
    { status: 200 },
  );
}

function envelope<T>(data: T | null, message: string, status: number) {
  return NextResponse.json(
    { data, error: status >= 400, message } satisfies ApiResponse<T>,
    { status },
  );
}
