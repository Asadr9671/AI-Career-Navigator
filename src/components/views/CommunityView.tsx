"use client";

/**
 * CommunityView - anonymized community insights dashboard.
 *
 * Pulls two endpoints on mount:
 *   GET /api/community/stats          → 4 aggregate metric cards
 *   GET /api/community/trending?role= → top-15 skill bar chart + ranked table
 *
 * All data is anonymized - no personal info is ever displayed.
 * Color language: violet / cyan / amber / emerald / rose / teal for the 6
 * popular roles, plus fuchsia / lime / orange / sky deterministically
 * assigned to any custom role via `getRoleColor` (no indigo / blue).
 */
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users,
  TrendingUp,
  Star,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Sparkles,
} from "lucide-react";

import { useNavigator } from "@/lib/navigator-store";
import {
  CommunityStats,
  TrendingSkill,
  getRoleColor,
} from "@/lib/types";
import { Reveal, StaggerGroup } from "@/components/motion-helpers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Color-token → colored badge class string.
 * Covers the full 10-color brand palette used by `getRoleColor`, so EVERY
 * role (popular or custom) gets a badge whose color matches its chart bar.
 * Static class strings so the Tailwind JIT compiler can see them.
 */
const TOKEN_BADGE_CLASS: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  teal: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  lime: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

/** Accent → icon-square gradient class string. */
const ACCENT_SQUARE: Record<"violet" | "cyan" | "amber" | "rose", string> = {
  violet:
    "bg-gradient-to-br from-violet-500/30 to-violet-500/5 text-violet-300 border border-violet-500/20",
  cyan: "bg-gradient-to-br from-cyan-500/30 to-cyan-500/5 text-cyan-300 border border-cyan-500/20",
  amber:
    "bg-gradient-to-br from-amber-500/30 to-amber-500/5 text-amber-300 border border-amber-500/20",
  rose: "bg-gradient-to-br from-rose-500/30 to-rose-500/5 text-rose-300 border border-rose-500/20",
};

/** Resolve a badge class for ANY role via its deterministic color token. */
function roleBadgeClass(role: string): string {
  const token = getRoleColor(role).token;
  return TOKEN_BADGE_CLASS[token] ?? TOKEN_BADGE_CLASS.violet;
}

/** Resolve a chart-bar hex color for ANY role (popular or custom). */
function roleHex(role: string): string {
  return getRoleColor(role).hex;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

interface StatCardDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "violet" | "cyan" | "amber" | "rose";
  value: string;
}

interface TrendingTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TrendingSkill }>;
}

function TrendingTooltip({ active, payload }: TrendingTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload as TrendingSkill;
  return (
    <div className="glass-strong rounded-lg p-3 shadow-glow-violet min-w-[200px]">
      <p className="font-semibold text-foreground text-sm break-words">
        {item.skill_name}
      </p>
      <div className="mt-2">
        <Badge variant="outline" className={roleBadgeClass(item.target_role)}>
          {item.target_role}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-mono text-foreground">{item.frequency}</span>{" "}
        analyses mention this skill
      </p>
    </div>
  );
}

function CommunityView() {
  const goUpload = useNavigator((s) => s.goUpload);

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [trending, setTrending] = useState<TrendingSkill[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  /** Distinct target roles seen in the community data - drives the filter
   *  dropdown so ANY analyzed role (not just the 6 popular ones) is selectable. */
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [loadingTrending, setLoadingTrending] = useState<boolean>(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [errorTrending, setErrorTrending] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(10);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorStats(null);
    try {
      const res = await fetch("/api/community/stats", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.message || `Request failed (${res.status})`);
      }
      setStats(json.data as CommunityStats);
    } catch (e) {
      setErrorStats(
        e instanceof Error ? e.message : "Failed to load community stats",
      );
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchTrending = useCallback(async (role: string) => {
    setLoadingTrending(true);
    setErrorTrending(null);
    try {
      const url =
        role === "all"
          ? "/api/community/trending"
          : `/api/community/trending?role=${encodeURIComponent(role)}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.message || `Request failed (${res.status})`);
      }
      const data = Array.isArray(json.data)
        ? (json.data as TrendingSkill[])
        : [];
      setTrending(data);
      setVisibleCount(10);
      // Derive the role list only from the UNFILTERED fetch so the dropdown
      // stays stable (doesn't shrink) when a specific role is selected.
      if (role === "all") {
        const roles = Array.from(
          new Set(data.map((d) => d.target_role)),
        ).sort((a, b) => a.localeCompare(b));
        setAvailableRoles(roles);
      }
    } catch (e) {
      setErrorTrending(
        e instanceof Error ? e.message : "Failed to load trending skills",
      );
      setTrending([]);
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchTrending(roleFilter);
  }, [roleFilter, fetchTrending]);

  const visibleTrending = trending.slice(0, visibleCount);
  const hasMore = visibleCount < trending.length;
  const remaining = Math.max(0, trending.length - visibleCount);

  const statsCards: StatCardDef[] = stats
    ? [
        {
          key: "total",
          label: "Total Resumes Analyzed",
          icon: Users,
          accent: "violet",
          value: String(stats.total_analyses),
        },
        {
          key: "avg",
          label: "Average Readiness Score",
          icon: TrendingUp,
          accent: "cyan",
          value:
            stats.average_score > 0
              ? `${stats.average_score}/100`
              : "-",
        },
        {
          key: "top",
          label: "Most Popular Role",
          icon: Star,
          accent: "amber",
          value:
            stats.top_role && stats.top_role !== "N/A" ? stats.top_role : "-",
        },
        {
          key: "gap",
          label: "Most Common Skill Gap",
          icon: AlertTriangle,
          accent: "rose",
          value:
            stats.most_common_gap && stats.most_common_gap !== "N/A"
              ? stats.most_common_gap
              : "-",
        },
      ]
    : [];

  const chartAriaLabel = `Bar chart of top ${trending.length} trending skills${
    roleFilter !== "all" ? ` for ${roleFilter}` : ""
  }`;

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* ============ PAGE HEADER ============ */}
        <Reveal i={0}>
          <div className="text-center">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/90">
              <Sparkles className="size-3.5" />
              Anonymized Insights
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
              <span className="text-gradient">Community</span> Dashboard
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
              See what skills people across the platform are working on. All
              data is anonymized - no personal information is ever displayed.
            </p>
          </div>
        </Reveal>

        {/* ============ STATS ROW ============ */}
        <StaggerGroup
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          stagger={0.08}
        >
          {statsCards.map((c) => {
            // Long values (e.g. "Performance optimization at scale") need a
            // smaller font + tight line-height so they wrap cleanly inside the
            // card without breaking mid-word. Short numeric values get the big
            // bold treatment.
            const isLong = (c.value?.length ?? 0) > 14;
            return (
              <Reveal key={c.key} i={1} variant="scale" as="div">
                <Card className="glass relative flex h-full flex-col p-5 gap-0 overflow-hidden">
                  <div
                    className={`absolute top-3 right-3 size-10 rounded-xl flex items-center justify-center ${ACCENT_SQUARE[c.accent]}`}
                  >
                    <c.icon className="size-5" />
                  </div>
                  <p
                    className={
                      isLong
                        ? "pr-12 text-base sm:text-lg font-semibold tracking-tight break-words leading-snug min-h-[2.5rem]"
                        : "pr-12 text-2xl sm:text-3xl font-bold tracking-tight break-words leading-tight"
                    }
                  >
                    {c.value}
                  </p>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                    {c.label}
                  </p>
                </Card>
              </Reveal>
            );
          })}

          {/* Skeleton placeholders while fetching */}
          {loadingStats &&
            !stats &&
            Array.from({ length: 4 }).map((_, i) => (
              <Reveal key={`stat-sk-${i}`} i={1} variant="scale" as="div">
                <Card className="glass p-5 gap-0">
                  <div className="flex justify-end">
                    <Skeleton className="size-10 rounded-xl" />
                  </div>
                  <Skeleton className="mt-2 h-8 w-24" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </Card>
              </Reveal>
            ))}
        </StaggerGroup>

        {/* Stats error */}
        {errorStats && !loadingStats && (
          <Reveal i={2}>
            <div className="mt-4 glass flex items-center justify-between gap-3 rounded-xl p-4 text-sm text-rose-300">
              <span>Failed to load community stats: {errorStats}</span>
              <Button size="sm" variant="outline" onClick={() => void fetchStats()}>
                <RefreshCw className="size-3.5" /> Retry
              </Button>
            </div>
          </Reveal>
        )}

        {/* ============ TRENDING CHART ============ */}
        <Reveal i={2} className="mt-10">
          <Card className="glass p-5 sm:p-6 gap-0">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-violet-300" />
                <h2 className="text-lg sm:text-xl font-semibold">
                  Top Skills People Are Working On
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="role-filter" className="sr-only">
                  Filter trending skills by target role
                </label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger
                    id="role-filter"
                    className="w-full sm:w-[220px]"
                  >
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chart area */}
            {loadingTrending ? (
              <Skeleton className="h-[420px] w-full rounded-lg" />
            ) : errorTrending ? (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-center">
                <AlertTriangle className="size-8 text-rose-300" />
                <p className="max-w-md text-sm text-muted-foreground">
                  Failed to load trending skills: {errorTrending}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchTrending(roleFilter)}
                >
                  <RefreshCw className="size-3.5" /> Retry
                </Button>
              </div>
            ) : trending.length === 0 ? (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-center">
                <BarChart3 className="size-10 text-muted-foreground/60" />
                <p className="max-w-md text-sm text-muted-foreground">
                  No trending skill data to display yet. Be the first to
                  contribute!
                </p>
              </div>
            ) : (
              <div
                role="img"
                aria-label={chartAriaLabel}
                className="w-full"
              >
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart
                    data={trending}
                    layout="vertical"
                    margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                  >
                    <CartesianGrid
                      stroke="oklch(1 0 0 / 0.06)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      dataKey="frequency"
                      stroke="oklch(0.72 0.02 270)"
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="skill_name"
                      stroke="oklch(0.72 0.02 270)"
                      tick={{ fontSize: 12 }}
                      width={140}
                      tickFormatter={(v: string) => truncate(String(v), 22)}
                    />
                    <Tooltip
                      content={<TrendingTooltip />}
                      cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
                    />
                    <Bar
                      dataKey="frequency"
                      radius={[0, 6, 6, 0]}
                      barSize={20}
                    >
                      {trending.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={roleHex(entry.target_role)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Reveal>

        {/* ============ RANKED SKILLS LIST ============ */}
        <Reveal i={3} className="mt-8">
          <Card className="glass p-5 sm:p-6 gap-0">
            <div className="mb-4 flex items-center gap-2">
              <Star className="size-5 text-amber-300" />
              <h2 className="text-lg sm:text-xl font-semibold">Ranked Skills</h2>
            </div>

            {loadingTrending ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
              </div>
            ) : errorTrending ? (
              <div className="rounded-lg border border-rose-500/20 p-4 text-sm text-rose-300">
                Failed to load ranked skills.
              </div>
            ) : trending.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No data yet - be the first to analyze your resume!
                </p>
                <Button className="mt-4" onClick={() => goUpload()}>
                  <Sparkles className="size-4" /> Analyze My Resume
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTrending.map((row, idx) => (
                      <TableRow
                        key={`${row.skill_name}-${row.target_role}-${idx}`}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.skill_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={roleBadgeClass(row.target_role)}
                          >
                            {row.target_role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.frequency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {hasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleCount((c) =>
                          Math.min(c + 5, trending.length),
                        )
                      }
                    >
                      Load More
                      {remaining > 0 && ` (${remaining} remaining)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </Reveal>

        {/* ============ DISCLAIMER FOOTER ============ */}
        <Reveal i={4} className="mt-8">
          <p className="text-center text-xs text-muted-foreground">
            All insights are anonymized. No personal data is displayed.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

export default CommunityView;
