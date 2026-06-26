/**
 * GET /api/community/trending?role=<optional>
 * Returns top 15 skill_trends ordered by frequency desc.
 * If `role` query is provided and matches a VALID_ROLE, filter by target_role.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse, TrendingSkill } from "@/lib/types";
import { VALID_ROLES as ROLES } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role");

  const where = role && (ROLES as readonly string[]).includes(role) ? { targetRole: role } : undefined;

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
