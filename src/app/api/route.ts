/**
 * GET /api
 * Health check - mirrors the master spec's `GET /` on the FastAPI backend.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "AI Career Navigator",
    version: "1.0",
  });
}
