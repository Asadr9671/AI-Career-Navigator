/**
 * GET /api/community/stats
 * Returns aggregate community metrics:
 *   - total_analyses  (count of Analysis rows)
 *   - average_score   (avg readiness_score, 1 decimal)
 *   - top_role        (most common target_role among analyses)
 *   - most_common_gap (skill_name with highest frequency in skill_trends)
 *
 * Returns sensible defaults if tables empty.
 *
 * NOTE: We avoid Prisma `groupBy` here because the `_count: { _all: true }`
 * + `orderBy: { _count: { _all: "desc" } }` combo throws a
 * PrismaClientValidationError on Prisma 6 + SQLite. Manual counting after
 * a findMany(select:) is reliable and fast enough for this dataset size.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse, CommunityStats } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const totalAnalyses = await db.analysis.count();

    // average_score via aggregate (single _avg — this IS supported on SQLite)
    let averageScore = 0;
    if (totalAnalyses > 0) {
      const agg = await db.analysis.aggregate({ _avg: { readinessScore: true } });
      averageScore = Math.round((agg._avg.readinessScore ?? 0) * 10) / 10;
    }

    // top_role: fetch all targetRoles and count in JS (avoids groupBy pitfalls)
    let topRole = "N/A";
    if (totalAnalyses > 0) {
      const rows = await db.analysis.findMany({ select: { targetRole: true } });
      const counts: Record<string, number> = {};
      let max = 0;
      for (const r of rows) {
        const c = (counts[r.targetRole] ?? 0) + 1;
        counts[r.targetRole] = c;
        if (c > max) {
          max = c;
          topRole = r.targetRole;
        }
      }
    }

    // most_common_gap: highest-frequency skill_trend row
    let mostCommonGap = "N/A";
    const topTrend = await db.skillTrend.findFirst({
      orderBy: { frequency: "desc" },
    });
    if (topTrend) mostCommonGap = topTrend.skillName;

    const payload: CommunityStats = {
      total_analyses: totalAnalyses,
      average_score: averageScore,
      top_role: topRole,
      most_common_gap: mostCommonGap,
    };

    return NextResponse.json(
      { data: payload, error: false, message: "ok" } satisfies ApiResponse<CommunityStats>,
      { status: 200 },
    );
  } catch (e) {
    console.error("[community/stats] failed:", e);
    const fallback: CommunityStats = {
      total_analyses: 0,
      average_score: 0,
      top_role: "N/A",
      most_common_gap: "N/A",
    };
    return NextResponse.json(
      { data: fallback, error: false, message: "ok" } satisfies ApiResponse<CommunityStats>,
      { status: 200 },
    );
  }
}
