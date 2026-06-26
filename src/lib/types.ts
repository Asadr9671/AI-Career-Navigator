/**
 * Shared types & constants for the AI Career Navigator.
 * Used by both server (API routes) and client (UI) code.
 */

export const VALID_ROLES = [
  "Software Development",
  "AI/ML Engineer",
  "DevOps Engineer",
  "Data Science",
  "Full-Stack Developer",
  "Cloud Engineer",
] as const;

export type TargetRole = (typeof VALID_ROLES)[number];

export interface RoadmapWeek {
  week: number;
  topic: string;
  resource_title: string;
  resource_url: string;
  project: string;
}

export interface AnalysisResult {
  id?: string;
  target_role: string;
  score: number;
  score_label: string;
  gaps: string[];
  strengths: string[];
  roadmap: RoadmapWeek[];
  created_at?: string;
}

export interface TrendingSkill {
  skill_name: string;
  target_role: string;
  frequency: number;
}

export interface CommunityStats {
  total_analyses: number;
  average_score: number;
  top_role: string;
  most_common_gap: string;
}

/** Standard API envelope: { data, error, message } */
export interface ApiResponse<T> {
  data: T | null;
  error: boolean;
  message: string;
}

/** Role → tailwind-friendly color token + hex used by recharts bars. */
export const ROLE_COLORS: Record<string, { token: string; hex: string }> = {
  "Software Development": { token: "violet", hex: "#8b5cf6" },
  "AI/ML Engineer": { token: "cyan", hex: "#06b6d4" },
  "DevOps Engineer": { token: "amber", hex: "#f59e0b" },
  "Data Science": { token: "emerald", hex: "#10b981" },
  "Full-Stack Developer": { token: "rose", hex: "#f43f5e" },
  "Cloud Engineer": { token: "teal", hex: "#14b8a6" },
};

export const ROLE_DEFAULT_COLOR = { token: "violet", hex: "#8b5cf6" };
