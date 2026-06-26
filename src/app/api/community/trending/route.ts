/**
 * GET /api/community/trending?role=<optional>
 * Returns top 15 skill_trends ordered by frequency desc.
 * If `role` query is provided (ANY string - not limited to a whitelist),
 * filter by exact target_role match. Empty/non-string role → return all.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse, TrendingSkill } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role");
  // Accept any non-empty role string (trimmed). No whitelist.
  const role = typeof roleParam === "string" ? roleParam.trim().replace(/\s+/g, " ") : "";
  const where = role.length > 0 && role.length <= 80 ? { targetRole: role } : undefined;

  try {
    const rows = await db.skillTrend.findMany({
      where,
      orderBy: { frequency: "desc" },
      take: 15,
    });

    const payload: TrendingSkill[] = rows.map((r) => ({
      skill_name: r.skillName,
      target_role: r.targetRole,
      frequency: r.frequency,
    }));

    return NextResponse.json(
      { data: payload, error: false, message: "ok" } satisfies ApiResponse<TrendingSkill[]>,
      { status: 200 },
    );
  } catch (e) {
    console.error("[community/trending] failed:", e);
    return NextResponse.json(
      { data: [], error: false, message: "ok" } satisfies ApiResponse<TrendingSkill[]>,
      { status: 200 },
    );
  }
}
