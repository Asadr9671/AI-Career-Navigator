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
import type { ApiResponse, CommunityStats } from "@/lib/types";
import { getCommunityStats } from "@/lib/community-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getCommunityStats();
  return NextResponse.json(
    { data: payload, error: false, message: "ok" } satisfies ApiResponse<CommunityStats>,
    { status: 200 },
  );
}
