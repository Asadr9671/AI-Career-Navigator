/**
 * GET /api/community/trending?role=<optional>
 * Returns top 15 skill_trends ordered by frequency desc.
 * If `role` query is provided (ANY string - not limited to a whitelist),
 * filter by exact target_role match. Empty/non-string role → return all.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, TrendingSkill } from "@/lib/types";
import { getCommunityTrending } from "@/lib/community-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role");
  const role = typeof roleParam === "string" ? roleParam.trim().replace(/\s+/g, " ") : "";

  const payload = await getCommunityTrending(role);

  return NextResponse.json(
    { data: payload, error: false, message: "ok" } satisfies ApiResponse<TrendingSkill[]>,
    { status: 200 },
  );
}
