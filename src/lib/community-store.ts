import type { AnalysisResult, CommunityStats, TrendingSkill } from "./types";
import { db } from "./db";

const BUCKET_URL = "https://jsonblob.com/api/jsonBlob/019f057b-61d2-768e-b039-92f41311f7b9";

// Helper to fetch all analyses from the global KV store
async function fetchGlobalAnalyses(): Promise<AnalysisResult[]> {
  try {
    const res = await fetch(BUCKET_URL, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 10 } // Cache for 10 seconds to avoid exceeding API limits
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[community-store] Failed to fetch global analyses:", err);
    return [];
  }
}

// Helper to push a new analysis to the global KV store
export async function pushToCommunityStore(result: AnalysisResult) {
  try {
    // 1. Fetch current global list
    const current = await fetchGlobalAnalyses();
    
    // 2. Append new result (keep only necessary fields to minimize size)
    const cleanedResult: AnalysisResult = {
      id: result.id || Math.random().toString(36).slice(2),
      target_role: result.target_role,
      score: result.score,
      score_label: result.score_label,
      gaps: result.gaps,
      strengths: result.strengths,
      roadmap: [], // Clear roadmap to save space (not needed for stats)
      created_at: result.created_at || new Date().toISOString()
    };
    
    current.push(cleanedResult);
    
    // Limit list to last 500 entries to prevent exceeding size limits
    const trimmed = current.slice(-500);
    
    // 3. Write back to KV store
    const res = await fetch(BUCKET_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(trimmed)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    console.log("[community-store] Successfully pushed to global KV store.");
  } catch (err) {
    console.error("[community-store] Failed to push to global KV store:", err);
  }
}

// Fetch stats from global KV, fall back to local SQLite if empty/fails
export async function getCommunityStats(): Promise<CommunityStats> {
  const globalAnalyses = await fetchGlobalAnalyses();
  
  if (globalAnalyses.length === 0) {
    // Fall back to local SQLite
    try {
      const totalAnalyses = await db.analysis.count();
      let averageScore = 0;
      if (totalAnalyses > 0) {
        const agg = await db.analysis.aggregate({ _avg: { readinessScore: true } });
        averageScore = Math.round((agg._avg.readinessScore ?? 0) * 10) / 10;
      }
      let topRole = "N/A";
      if (totalAnalyses > 0) {
        const rows = await db.analysis.findMany({ select: { targetRole: true } });
        const counts: Record<string, number> = {};
        let max = 0;
        for (const r of rows) {
          const c = (counts[r.targetRole] ?? 0) + 1;
          counts[r.targetRole] = c;
          if (c > max) { max = c; topRole = r.targetRole; }
        }
      }
      let mostCommonGap = "N/A";
      const topTrend = await db.skillTrend.findFirst({ orderBy: { frequency: "desc" } });
      if (topTrend) mostCommonGap = topTrend.skillName;
      
      return { total_analyses: totalAnalyses, average_score: averageScore, top_role: topRole, most_common_gap: mostCommonGap };
    } catch {
      return { total_analyses: 0, average_score: 0, top_role: "N/A", most_common_gap: "N/A" };
    }
  }
  
  // Calculate from global array
  const total = globalAnalyses.length;
  let scoreSum = 0;
  const roleCounts: Record<string, number> = {};
  const gapCounts: Record<string, number> = {};
  
  for (const item of globalAnalyses) {
    scoreSum += item.score;
    roleCounts[item.target_role] = (roleCounts[item.target_role] ?? 0) + 1;
    for (const gap of item.gaps) {
      gapCounts[gap] = (gapCounts[gap] ?? 0) + 1;
    }
  }
  
  const avg = Math.round((scoreSum / total) * 10) / 10;
  
  let topRole = "N/A";
  let maxRoleCount = 0;
  for (const [r, c] of Object.entries(roleCounts)) {
    if (c > maxRoleCount) { maxRoleCount = c; topRole = r; }
  }
  
  let mostCommonGap = "N/A";
  let maxGapCount = 0;
  for (const [g, c] of Object.entries(gapCounts)) {
    if (c > maxGapCount) { maxGapCount = c; mostCommonGap = g; }
  }
  
  return {
    total_analyses: total,
    average_score: avg,
    top_role: topRole,
    most_common_gap: mostCommonGap
  };
}

// Fetch trending skills from global KV, fall back to local SQLite if empty/fails
export async function getCommunityTrending(role?: string): Promise<TrendingSkill[]> {
  const globalAnalyses = await fetchGlobalAnalyses();
  
  if (globalAnalyses.length === 0) {
    // Fall back to local SQLite
    try {
      const where = role && role.length > 0 ? { targetRole: role } : undefined;
      const rows = await db.skillTrend.findMany({
        where,
        orderBy: { frequency: "desc" },
        take: 15,
      });
      return rows.map((r) => ({
        skill_name: r.skillName,
        target_role: r.targetRole,
        frequency: r.frequency,
      }));
    } catch {
      return [];
    }
  }
  
  // Calculate from global array
  const filtered = role && role.length > 0 
    ? globalAnalyses.filter(item => item.target_role.toLowerCase() === role.toLowerCase())
    : globalAnalyses;
    
  const trendMap: Record<string, { skill_name: string; target_role: string; frequency: number }> = {};
  
  for (const item of filtered) {
    for (const gap of item.gaps) {
      const key = `${item.target_role}_${gap}`;
      if (!trendMap[key]) {
        trendMap[key] = {
          skill_name: gap,
          target_role: item.target_role,
          frequency: 0
        };
      }
      trendMap[key].frequency += 1;
    }
  }
  
  const trends = Object.values(trendMap);
  trends.sort((a, b) => b.frequency - a.frequency);
  return trends.slice(0, 15);
}
