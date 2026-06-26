/**
 * GET /api/analyze/[id]
 * Fetch a single saved analysis by id. Returns 404 if not found.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AnalysisResult, ApiResponse, DimensionScore } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { data: null, error: true, message: "Missing analysis id." },
      { status: 400 },
    );
  }

  const row = await db.analysis.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json(
      { data: null, error: true, message: "Analysis not found." },
      { status: 404 },
    );
  }

  let gaps: string[] = [];
  let strengths: string[] = [];
  let roadmap: AnalysisResult["roadmap"] = [];
  let dimensions: DimensionScore[] | undefined;
  try {
    gaps = JSON.parse(row.gaps || "[]");
    strengths = JSON.parse(row.strengths || "[]");
    roadmap = JSON.parse(row.roadmap || "[]");
    if (row.dimensions) dimensions = JSON.parse(row.dimensions);
  } catch (e) {
    console.error("[analyze/[id]] JSON parse failed:", e);
  }

  const payload: AnalysisResult = {
    id: row.id,
    target_role: row.targetRole,
    score: row.readinessScore,
    score_label: row.scoreLabel,
    score_justification: row.scoreJustification ?? undefined,
    dimensions,
    gaps,
    strengths,
    roadmap,
    created_at: row.createdAt.toISOString(),
  };

  return NextResponse.json(
    { data: payload, error: false, message: "ok" } satisfies ApiResponse<AnalysisResult>,
    { status: 200 },
  );
}
