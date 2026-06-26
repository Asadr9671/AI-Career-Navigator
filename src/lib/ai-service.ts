/**
 * AI service — analyzes a resume against a target role using z-ai-web-dev-sdk LLM.
 *
 * This is the Next.js / TypeScript adaptation of the original
 * `services/gemini_service.py` from the master prompt. The exact prompt
 * engineering is preserved verbatim; only the SDK calls differ (Gemini → z-ai LLM).
 */
import ZAI from "z-ai-web-dev-sdk";
import type { AnalysisResult, RoadmapWeek } from "@/lib/types";

/** Build the verbatim prompt from the master spec. */
function buildPrompt(resumeText: string, targetRole: string): string {
  return `You are an expert technical recruiter and career coach with 15 years of experience
evaluating software engineering and tech candidates for top companies.

A candidate has submitted their resume and wants to become a: ${targetRole}

RESUME CONTENT:
${resumeText}

Perform a rigorous, honest analysis across 4 tasks:

TASK 1 — JOB READINESS SCORE (integer 0-100):
Assess how ready this candidate is for a ${targetRole} role at a mid-to-large
tech company today (2025). Be calibrated: 40 = significant gaps, 70 = competitive,
90+ = exceptionally strong. Do not inflate scores.

TASK 2 — SKILL GAP ANALYSIS:
Identify the 5 to 8 most critical skills or knowledge areas that are ABSENT or
clearly UNDERDEVELOPED in this resume relative to ${targetRole} requirements.
Be specific: "Docker & container orchestration" beats "DevOps tools".

TASK 3 — 12-WEEK LEARNING ROADMAP:
Design a focused, sequential 12-week plan to close the most important gaps.
For each week provide:
  - topic: the exact skill or concept (specific, not vague)
  - resource_title: the name of one free, publicly accessible resource
    (prefer: YouTube channels, freeCodeCamp, official documentation,
     Coursera audit, MIT OpenCourseWare, The Odin Project, fast.ai)
  - resource_url: the actual URL (must start with https://, must be real)
  - project: a concrete mini-project to build that week to demonstrate the skill
    (specific enough that the candidate knows exactly what to build,
     e.g. "Build a REST API with CRUD operations using FastAPI and SQLite,
     deploy it to Render.com free tier")

TASK 4 — STRENGTHS:
List exactly 3 genuine, specific strengths visible in the resume.
Avoid generic praise. Reference actual content from the resume.

Return ONLY a valid JSON object with this exact structure. No preamble, no
markdown fences, no explanation — pure JSON only:
{
  "score": 74,
  "score_label": "74% ready for ${targetRole}",
  "gaps": [
    "Skill gap one",
    "Skill gap two"
  ],
  "strengths": [
    "Specific strength one",
    "Specific strength two",
    "Specific strength three"
  ],
  "roadmap": [
    {
      "week": 1,
      "topic": "Topic name",
      "resource_title": "Name of free resource",
      "resource_url": "https://real-url.com",
      "project": "Specific mini-project description"
    }
  ]
}`;
}

/** Validate the parsed AI result against the spec's requirements. */
function validateResult(raw: unknown): { ok: true; value: AnalysisResult } | { ok: false; reason: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "Response is not an object" };
  const r = raw as Record<string, unknown>;

  const score = Number(r.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return { ok: false, reason: "score must be an integer 0-100" };
  }

  const gaps = r.gaps;
  if (!Array.isArray(gaps) || gaps.length < 5 || gaps.length > 8 || gaps.some((g) => typeof g !== "string")) {
    return { ok: false, reason: "gaps must be a list of 5-8 strings" };
  }

  const strengths = r.strengths;
  if (!Array.isArray(strengths) || strengths.length !== 3 || strengths.some((s) => typeof s !== "string")) {
    return { ok: false, reason: "strengths must be a list of exactly 3 strings" };
  }

  const roadmap = r.roadmap;
  if (!Array.isArray(roadmap) || roadmap.length !== 12) {
    return { ok: false, reason: "roadmap must have exactly 12 items" };
  }

  const requiredKeys: (keyof RoadmapWeek)[] = ["week", "topic", "resource_title", "resource_url", "project"];
  for (let i = 0; i < roadmap.length; i++) {
    const item = roadmap[i] as Record<string, unknown>;
    for (const k of requiredKeys) {
      if (!(k in item) || typeof item[k] !== "string" && k !== "week") {
        return { ok: false, reason: `roadmap[${i}] missing or invalid key: ${k}` };
      }
    }
    if (typeof item.week !== "number" || !Number.isInteger(item.week)) {
      return { ok: false, reason: `roadmap[${i}].week must be an integer` };
    }
    if (typeof item.resource_url !== "string" || !item.resource_url.startsWith("https://")) {
      return { ok: false, reason: `roadmap[${i}].resource_url must start with https://` };
    }
  }

  const scoreLabel = typeof r.score_label === "string" ? r.score_label : `${score}% ready`;
  const targetRole = typeof r.target_role === "string" ? r.target_role : "";

  return {
    ok: true,
    value: {
      target_role: targetRole,
      score,
      score_label: scoreLabel,
      gaps: gaps as string[],
      strengths: strengths as string[],
      roadmap: roadmap as RoadmapWeek[],
    },
  };
}

/** Strip markdown fences / leading whitespace before JSON.parse. */
function sanitizeJsonString(raw: string): string {
  let s = raw.trim();
  // Remove leading ```json or ``` and trailing ```
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  return s;
}

/**
 * Analyze a resume against a target role.
 * Returns either a valid AnalysisResult or `{ error: true, message }`.
 */
export async function analyzeResume(
  resumeText: string,
  targetRole: string,
): Promise<AnalysisResult | { error: true; message: string }> {
  let zai: Awaited<ReturnType<typeof ZAI.create>>;
  try {
    zai = await ZAI.create();
  } catch (e) {
    return { error: true, message: "AI engine unavailable. Please try again later." };
  }

  const basePrompt = buildPrompt(resumeText, targetRole);
  const retrySuffix =
    "\n\nIMPORTANT: Your previous response failed JSON validation. Return ONLY the raw JSON object. No markdown, no code fences, no explanation text whatsoever.";

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? basePrompt : basePrompt + retrySuffix;
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "You are a strict JSON-only career analysis engine. You return ONLY raw valid JSON, never markdown or prose." },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });

      const rawContent = completion.choices?.[0]?.message?.content ?? "";
      if (!rawContent) {
        if (attempt === 0) continue;
        return { error: true, message: "Analysis failed: empty AI response." };
      }

      const sanitized = sanitizeJsonString(rawContent);
      let parsed: unknown;
      try {
        parsed = JSON.parse(sanitized);
      } catch {
        if (attempt === 0) continue;
        return { error: true, message: "Analysis failed: AI returned malformed JSON." };
      }

      // Inject target_role for safety
      if (parsed && typeof parsed === "object") {
        (parsed as Record<string, unknown>).target_role = targetRole;
        const score = Number((parsed as Record<string, unknown>).score);
        if (Number.isInteger(score)) {
          (parsed as Record<string, unknown>).score_label = `${score}% ready for ${targetRole}`;
        }
      }

      const validation = validateResult(parsed);
      if (validation.ok) {
        return validation.value;
      }

      if (attempt === 0) {
        console.warn("[ai-service] first attempt failed validation:", validation.reason);
        continue;
      }
      return { error: true, message: `Analysis failed: ${validation.reason}` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Quota / rate-limit heuristic
      if (/quota|rate.?limit|429/i.test(msg)) {
        return { error: true, message: "API quota exceeded. Try again in a minute." };
      }
      if (attempt === 0) {
        console.warn("[ai-service] first attempt threw:", msg);
        continue;
      }
      return { error: true, message: `Analysis failed: ${msg}` };
    }
  }

  return { error: true, message: "Analysis failed after retry." };
}
