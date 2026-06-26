/**
 * Shared types & constants for the AI Career Navigator.
 * Used by both server (API routes) and client (UI) code.
 *
 * NOTE: The app supports ANY career path the user types — not just the 6
 * "popular" roles listed below. `POPULAR_ROLES` is only used for quick-pick
 * suggestion chips in the UI and for assigning nice icon/color defaults.
 * Any free-text role is accepted by the API (see `sanitizeTargetRole`).
 */

export const POPULAR_ROLES = [
  "Software Development",
  "AI/ML Engineer",
  "DevOps Engineer",
  "Data Science",
  "Full-Stack Developer",
  "Cloud Engineer",
] as const;

/** @deprecated alias kept for backward compatibility — use POPULAR_ROLES. */
export const VALID_ROLES = POPULAR_ROLES;

export type PopularRole = (typeof POPULAR_ROLES)[number];

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

/** Role → tailwind-friendly color token + hex used by recharts bars / badges. */
export const ROLE_COLORS: Record<string, { token: string; hex: string }> = {
  "Software Development": { token: "violet", hex: "#8b5cf6" },
  "AI/ML Engineer": { token: "cyan", hex: "#06b6d4" },
  "DevOps Engineer": { token: "amber", hex: "#f59e0b" },
  "Data Science": { token: "emerald", hex: "#10b981" },
  "Full-Stack Developer": { token: "rose", hex: "#f43f5e" },
  "Cloud Engineer": { token: "teal", hex: "#14b8a6" },
};

export const ROLE_DEFAULT_COLOR = { token: "violet", hex: "#8b5cf6" };

/**
 * Palette used to deterministically assign a color to a custom (non-popular)
 * role. Stable hash → same role always gets the same color across the app.
 */
const CUSTOM_COLOR_PALETTE: { token: string; hex: string }[] = [
  { token: "violet", hex: "#8b5cf6" },
  { token: "cyan", hex: "#06b6d4" },
  { token: "amber", hex: "#f59e0b" },
  { token: "emerald", hex: "#10b981" },
  { token: "rose", hex: "#f43f5e" },
  { token: "teal", hex: "#14b8a6" },
  { token: "fuchsia", hex: "#d946ef" },
  { token: "lime", hex: "#84cc16" },
  { token: "orange", hex: "#fb923c" },
  { token: "sky", hex: "#0ea5e9" },
];

/** Resolve a stable color for ANY role (popular or custom). */
export function getRoleColor(role: string): { token: string; hex: string } {
  if (ROLE_COLORS[role]) return ROLE_COLORS[role];
  // Deterministic hash → palette index
  let hash = 0;
  for (let i = 0; i < role.length; i++) {
    hash = (hash * 31 + role.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % CUSTOM_COLOR_PALETTE.length;
  return CUSTOM_COLOR_PALETTE[idx];
}

/**
 * Sanitize + validate a free-text target role.
 * Returns `[ok, normalizedRole, message]`.
 *  - empty / whitespace only           → (false, "", "Please enter a target role.")
 *  - < 2 chars after trim              → (false, ..., "Role must be at least 2 characters.")
 *  - > 80 chars                         → (false, ..., "Role must be 80 characters or fewer.")
 *  - contains control chars / <>       → (false, ..., "Role contains invalid characters.")
 *  - otherwise                          → (true, trimmed, "")
 */
export function sanitizeTargetRole(raw: unknown): [boolean, string, string] {
  if (typeof raw !== "string") {
    return [false, "", "Please enter a target role."];
  }
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    return [false, "", "Please enter a target role."];
  }
  if (trimmed.length < 2) {
    return [false, trimmed, "Role must be at least 2 characters."];
  }
  if (trimmed.length > 80) {
    return [false, trimmed.slice(0, 80), "Role must be 80 characters or fewer."];
  }
  // Reject control chars and angle brackets (basic XSS / injection hygiene)
  if (/[\x00-\x1f<>]/.test(trimmed)) {
    return [false, "", "Role contains invalid characters."];
  }
  return [true, trimmed, ""];
}
