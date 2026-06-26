# Task 7-d — full-stack-developer — CommunityView dynamic role filter

## Task
Update `src/components/views/CommunityView.tsx` so the role-filter dropdown derives its options from the actual community trending data (not the hardcoded 6-role whitelist), and switch the chart bar colors + table role badges to use `getRoleColor(role)` so ANY analyzed career path renders with a stable, brand-safe color.

## Prior context read
- `worklog.md` — esp. Task ID 6 (custom-roles backend): the `/api/community/trending?role=<any>` endpoint now accepts any role string, and `src/lib/types.ts` exports `getRoleColor(role)` (deterministic token + hex for popular OR custom roles, drawn from a 10-color brand palette: violet / cyan / amber / emerald / rose / teal / fuchsia / lime / orange / sky).
- Existing `CommunityView.tsx` — had a hardcoded `VALID_ROLES.map(...)` for the dropdown and a static `ROLE_BADGE_CLASS` lookup that only knew the 6 popular roles.

## Work Log
- Replaced the `VALID_ROLES, ROLE_COLORS` imports with a single `getRoleColor` import from `@/lib/types`.
- Replaced the static `ROLE_BADGE_CLASS: Record<role, class>` map with `TOKEN_BADGE_CLASS: Record<token, class>` covering all 10 palette colors (static class strings so Tailwind JIT can see them).
- Rewrote `roleBadgeClass(role)` to resolve via `getRoleColor(role).token` (violet fallback).
- Rewrote `roleHex(role)` to return `getRoleColor(role).hex` directly.
- Added `availableRoles: string[]` state; populated it inside `fetchTrending` ONLY when `role === "all"` by taking `new Set(data.map(d => d.target_role))` and sorting alphabetically. This keeps the dropdown stable when a specific role is selected.
- Updated `<SelectContent>` to render "All Roles" + `availableRoles.map(...)` instead of `VALID_ROLES.map(...)`. Empty state naturally falls through to just "All Roles".
- Updated the top-of-file color-language comment to mention the extended 10-color palette.
- Left stats row, chart layout, ranked table layout, and disclaimer 100% unchanged. Select still has its `sr-only` label; chart still has `role="img"` + `aria-label`. All fetches remain relative URLs. Still `"use client"` + default export + no props + strict TS.
- Ran `cd /home/z/my-project && bun run lint` → clean, zero errors, zero warnings. Did NOT run the dev server (per instructions).

## Stage Summary
- Artifact: `src/components/views/CommunityView.tsx` (default export `CommunityView`, no props).
- Role-filter dropdown now lists every role that actually exists in the community (e.g. "Product Manager", "UX Designer" — anything a user has analyzed for), auto-derived from `/api/community/trending` (unfiltered) and re-derived whenever the user switches back to "All Roles".
- Chart bar colors + table role badges use `getRoleColor(role)` so ANY role — popular or custom — gets a deterministic, brand-safe color that is identical in both the chart and the table.
- No indigo / blue introduced; the extended palette (fuchsia / lime / orange / sky) matches `CUSTOM_COLOR_PALETTE` in `src/lib/types.ts`.
- No API contract changes; the only data flow change is that `availableRoles` is now derived client-side from the existing trending response.
