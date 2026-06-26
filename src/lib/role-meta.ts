/**
 * Role metadata — icon + color + description for each of the 6 VALID_ROLES.
 * Shared by Upload / Results / Community / Landing views so the visual
 * language stays consistent.
 */
import {
  BarChart3,
  Brain,
  Cloud,
  Code2,
  Layers,
  Server,
  type LucideIcon,
} from "lucide-react";
import { ROLE_COLORS, type TargetRole } from "@/lib/types";

export interface RoleMeta {
  role: TargetRole;
  icon: LucideIcon;
  color: { token: string; hex: string };
  tagline: string;
}

export const ROLE_META: Record<TargetRole, RoleMeta> = {
  "Software Development": {
    role: "Software Development",
    icon: Code2,
    color: ROLE_COLORS["Software Development"],
    tagline: "Backend, systems, and generalist SWE roles",
  },
  "AI/ML Engineer": {
    role: "AI/ML Engineer",
    icon: Brain,
    color: ROLE_COLORS["AI/ML Engineer"],
    tagline: "Model training, MLOps, and applied ML",
  },
  "DevOps Engineer": {
    role: "DevOps Engineer",
    icon: Server,
    color: ROLE_COLORS["DevOps Engineer"],
    tagline: "CI/CD, infrastructure, and reliability",
  },
  "Data Science": {
    role: "Data Science",
    icon: BarChart3,
    color: ROLE_COLORS["Data Science"],
    tagline: "Analytics, experimentation, and modeling",
  },
  "Full-Stack Developer": {
    role: "Full-Stack Developer",
    icon: Layers,
    color: ROLE_COLORS["Full-Stack Developer"],
    tagline: "End-to-end product engineering",
  },
  "Cloud Engineer": {
    role: "Cloud Engineer",
    icon: Cloud,
    color: ROLE_COLORS["Cloud Engineer"],
    tagline: "Cloud architecture, IAM, and cost optimization",
  },
};

export const ROLE_LIST: RoleMeta[] = Object.values(ROLE_META);
