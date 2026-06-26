/**
 * Role metadata - icon + color + tagline for the 6 POPULAR_ROLES, plus a
 * `getRoleMeta(role)` resolver that returns a sensible default (generic
 * Briefcase icon + deterministic color) for ANY custom career path the user
 * types. Used by Upload / Results / Roadmap / Community / Landing views so
 * the visual language stays consistent even for unknown roles.
 */
import {
  BarChart3,
  Briefcase,
  Brain,
  Cloud,
  Code2,
  Layers,
  Server,
  type LucideIcon,
} from "lucide-react";
import { getRoleColor, POPULAR_ROLES, type PopularRole } from "@/lib/types";

export interface RoleMeta {
  role: string;
  icon: LucideIcon;
  color: { token: string; hex: string };
  tagline: string;
  popular: boolean;
}

/** Meta for the 6 popular quick-pick roles. */
export const ROLE_META: Record<PopularRole, RoleMeta> = {
  "Software Development": {
    role: "Software Development",
    icon: Code2,
    color: getRoleColor("Software Development"),
    tagline: "Backend, systems, and generalist SWE roles",
    popular: true,
  },
  "AI/ML Engineer": {
    role: "AI/ML Engineer",
    icon: Brain,
    color: getRoleColor("AI/ML Engineer"),
    tagline: "Model training, MLOps, and applied ML",
    popular: true,
  },
  "DevOps Engineer": {
    role: "DevOps Engineer",
    icon: Server,
    color: getRoleColor("DevOps Engineer"),
    tagline: "CI/CD, infrastructure, and reliability",
    popular: true,
  },
  "Data Science": {
    role: "Data Science",
    icon: BarChart3,
    color: getRoleColor("Data Science"),
    tagline: "Analytics, experimentation, and modeling",
    popular: true,
  },
  "Full-Stack Developer": {
    role: "Full-Stack Developer",
    icon: Layers,
    color: getRoleColor("Full-Stack Developer"),
    tagline: "End-to-end product engineering",
    popular: true,
  },
  "Cloud Engineer": {
    role: "Cloud Engineer",
    icon: Cloud,
    color: getRoleColor("Cloud Engineer"),
    tagline: "Cloud architecture, IAM, and cost optimization",
    popular: true,
  },
};

export const ROLE_LIST: RoleMeta[] = POPULAR_ROLES.map((r) => ROLE_META[r]);

/**
 * Resolve role metadata for ANY role string.
 *  - Known popular role → its rich meta (specific icon + tagline).
 *  - Custom/unknown role → generic Briefcase icon + deterministic color
 *    (stable hash → same role always gets the same color) + empty tagline.
 */
export function getRoleMeta(role: string): RoleMeta {
  if (role && role in ROLE_META) {
    return ROLE_META[role as PopularRole];
  }
  return {
    role: role || "Custom Role",
    icon: Briefcase,
    color: getRoleColor(role || "Custom Role"),
    tagline: "",
    popular: false,
  };
}
