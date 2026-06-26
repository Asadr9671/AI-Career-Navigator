/**
 * AI service - analyzes a resume against a target role using z-ai-web-dev-sdk LLM.
 *
 * This is the Next.js / TypeScript adaptation of the original
 * `services/gemini_service.py` from the master prompt.
 *
 * PROMPT DESIGN (v2 - fixes the "same score for every resume" bug):
 * The original prompt anchored the AI on "70 = competitive" which caused it to
 * cluster ALL decent resumes around 74 and refuse to score 90+ even for
 * genuinely exceptional candidates (e.g. a Principal Engineer at Google with a
 * PhD got 74). The v2 prompt fixes this by:
 *   1. Forcing multi-dimensional scoring (5 dimensions, each 0-100 WITH evidence)
 *      so the AI must engage with the actual resume content, not pick a safe number.
 *   2. Providing concrete calibration anchors with example profiles at each tier.
 *   3. Explicitly requiring 90+ scores for exceptional candidates.
 *   4. Requiring a score_justification that cites specific resume content.
 *   5. Returning the dimension breakdown so the UI can prove the score is real-time.
 */
import ZAI from "z-ai-web-dev-sdk";
import type { AnalysisResult, DimensionScore, RoadmapWeek } from "@/lib/types";

/** Build the evidence-based scoring prompt. */
function buildPrompt(resumeText: string, targetRole: string): string {
  return `You are an expert technical recruiter and career coach with 15 years of experience
evaluating tech candidates for top companies (Google, Meta, Amazon, Netflix, top startups).

A candidate has submitted their resume and wants to become a: ${targetRole}

RESUME CONTENT:
${resumeText}

Perform a rigorous, EVIDENCE-BASED analysis. You MUST score based on what is
actually written in the resume. Different resumes MUST produce different scores.
Do NOT default to a "safe" middle score like 70-75. Do NOT cap scores at 75.
If the candidate is genuinely exceptional, you MUST score 90 or higher.
If the candidate is genuinely weak, you MUST score below 40.

=== STEP 1: MULTI-DIMENSIONAL SCORING (0-100 each, with EVIDENCE) ===
Score each of the 5 dimensions below. For each, cite the SPECIFIC resume content
that justifies your score (quote roles, skills, schools, projects, metrics).

1. relevant_experience (weight 30%):
   Years + relevance of work experience to ${targetRole}.
   0 = no relevant experience; 50 = 1-2 years tangential; 70 = 2-4 years directly relevant;
   85 = 5+ years senior relevant; 95+ = staff/principal level at a top company.

2. technical_skills (weight 30%):
   Coverage of skills typically required for ${targetRole}.
   0 = none; 50 = some basics; 70 = most core skills; 85 = strong + advanced;
   95+ = expert across the full required skill set + modern tooling.

3. education (weight 15%):
   Degree relevance and quality.
   0 = none; 40 = unrelated degree; 60 = relevant degree; 75 = relevant degree good school;
   85 = relevant degree + strong GPA; 90+ = advanced degree (MS/PhD) from top school in field.

4. projects_portfolio (weight 15%):
   Quality + relevance of projects, open source, publications, competitions.
   0 = none; 40 = basic personal projects; 60 = several non-trivial;
   80 = significant with impact; 90+ = major OSS contributions, published research, or
   competition wins at a high level.

5. leadership_impact (weight 10%):
   Scope, scale, mentorship, measurable outcomes.
   0 = none; 40 = individual contributor only; 60 = some mentorship;
   80 = led teams / owned significant initiatives; 90+ = org-level leadership, large measurable impact.

=== STEP 2: COMPUTE THE FINAL SCORE ===
final_score = round(weighted average of the 5 dimensions).
You MAY adjust by up to ±5 points based on overall trajectory or red flags
(career gaps, job-hopping). Explain any adjustment in score_justification.

=== STEP 3: CALIBRATION CHECK (verify before finalizing) ===
- 10-25: No relevant experience (e.g. a cashier wanting to be an ML engineer).
- 35-50: Some relevant skills, significant gaps (e.g. bootcamp grad, junior dev).
- 55-70: Competitive mid-level (2-4 years relevant experience, solid skills).
- 75-85: Strong senior (5+ years, senior title, broad skills, some leadership).
- 88-95: Exceptional (Principal/Staff at top company, PhD, publications, major OSS).
- 96-100: World-class (recognizable industry leader, foundational contributions).

CRITICAL EXAMPLES:
- A cashier with no coding experience applying for ML Engineer → score 10-20.
- A bootcamp grad with 1 personal project applying for Full-Stack → score 35-45.
- A mid-level dev with 3 years React experience applying for Full-Stack → score 60-70.
- A Principal ML Engineer at Google DeepMind with a Stanford PhD and 15 NeurIPS
  papers applying for AI/ML Engineer → score 92-97. NOT 74.
- A world-renowned expert (e.g. creator of a major framework) → score 96-100.

=== STEP 4: SCORE JUSTIFICATION ===
Write a 1-2 sentence score_justification citing SPECIFIC resume content.
Example: "Strong ML background with 6 years at Google DeepMind and a Stanford PhD,
but the resume lacks formal MLOps pipeline ownership at production scale."

=== STEP 5: SKILL GAPS (5-8 items) ===
Identify the 5 to 8 most critical skills ABSENT or UNDERDEVELOPED relative to ${targetRole}.
Be specific: "Docker & container orchestration" beats "DevOps tools".

=== STEP 6: STRENGTHS (exactly 3) ===
List exactly 3 genuine, specific strengths referencing actual resume content.
Avoid generic praise.

=== STEP 7: 12-WEEK LEARNING ROADMAP ===
Design a focused, sequential 12-week plan to close the most important gaps.
For each week provide:
  - topic: the exact skill or concept (specific, not vague)
  - resource_title: the name of one free, publicly accessible resource
    (prefer: YouTube, freeCodeCamp, official documentation, Coursera audit,
     MIT OpenCourseWare, The Odin Project, fast.ai)
  - resource_url: the actual URL (must start with https://, must be real)
  - project: a concrete mini-project to build that week
    (specific enough that the candidate knows exactly what to build)

Return ONLY a valid JSON object with this EXACT structure. No preamble, no
markdown fences, no explanation - pure JSON only:
{
  "dimensions": [
    {"name": "relevant_experience", "score": 85, "evidence": "6 years as ML Engineer at Google DeepMind and Meta"},
    {"name": "technical_skills", "score": 80, "evidence": "PyTorch, TensorFlow, JAX, Kubernetes all present"},
    {"name": "education", "score": 95, "evidence": "PhD in CS from Stanford, BS from MIT"},
    {"name": "projects_portfolio", "score": 90, "evidence": "15 NeurIPS papers, PyTorch core contributor, Kaggle Grandmaster"},
    {"name": "leadership_impact", "score": 85, "evidence": "Led team of 12, mentored 200+ engineers"}
  ],
  "score": 88,
  "score_label": "88% ready for ${targetRole}",
  "score_justification": "1-2 sentences citing specific resume content...",
  "gaps": ["Skill gap one", "Skill gap two"],
  "strengths": ["Specific strength one", "Specific strength two", "Specific strength three"],
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

  // dimensions (optional but if present must be valid 5-item array)
  let dimensions: DimensionScore[] | undefined;
  if (r.dimensions !== undefined && r.dimensions !== null) {
    if (!Array.isArray(r.dimensions) || r.dimensions.length !== 5) {
      return { ok: false, reason: "dimensions must be an array of exactly 5 items" };
    }
    dimensions = [];
    for (let i = 0; i < r.dimensions.length; i++) {
      const d = r.dimensions[i] as Record<string, unknown>;
      if (!d || typeof d.name !== "string" || typeof d.evidence !== "string") {
        return { ok: false, reason: `dimensions[${i}] must have name + evidence strings` };
      }
      const ds = Number(d.score);
      if (!Number.isInteger(ds) || ds < 0 || ds > 100) {
        return { ok: false, reason: `dimensions[${i}].score must be an integer 0-100` };
      }
      dimensions.push({ name: d.name, score: ds, evidence: d.evidence });
    }
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
      if (!(k in item) || (typeof item[k] !== "string" && k !== "week")) {
        return { ok: false, reason: `roadmap[${i}] missing or invalid key: ${k}` };
      }
    }
    if (typeof item.week !== "number" || !Number.isInteger(item.week)) {
      return { ok: false, reason: `roadmap[${i}].week must be an integer` };
    }
    // Auto-fix URLs: upgrade http:// → https://, and prefix https:// if no protocol.
    // The AI occasionally returns bare URLs or http:// links, which shouldn't
    // fail the whole analysis.
    if (typeof item.resource_url === "string") {
      let url: string = item.resource_url.trim();
      if (url.startsWith("http://")) {
        url = "https://" + url.slice(7);
      } else if (!url.startsWith("https://")) {
        // Bare URL like "reactjs.org/tutorial" → prefix https://
        url = "https://" + url;
      }
      item.resource_url = url;
    }
  }

  const scoreLabel = typeof r.score_label === "string" ? r.score_label : `${score}% ready`;
  const targetRole = typeof r.target_role === "string" ? r.target_role : "";
  const scoreJustification = typeof r.score_justification === "string" ? r.score_justification : undefined;

  return {
    ok: true,
    value: {
      target_role: targetRole,
      score,
      score_label: scoreLabel,
      score_justification: scoreJustification,
      dimensions,
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
 * Call Gemini API using native fetch.
 */
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const model = "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: "You are a strict JSON-only career analysis engine. You return ONLY raw valid JSON, never markdown or prose. You score resumes honestly across a wide range (10-100) based on actual evidence - never defaulting to a safe middle score." }]
      },
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("No content returned from Gemini API");
  }
  return content;
}

/**
 * Generate content using Z.ai with dynamic fallback to Gemini if needed.
 */
async function generateContent(
  prompt: string,
  zai: any
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || "";

  if (!zai) {
    console.log("[ai-service] Z.ai client not initialized, using Gemini...");
    return await callGemini(prompt, geminiKey);
  }

  try {
    const completion = await zai.chat.completions.create({
      model: "glm-4-plus",
      messages: [
        {
          role: "assistant",
          content:
            "You are a strict JSON-only career analysis engine. You return ONLY raw valid JSON, never markdown or prose. You score resumes honestly across a wide range (10-100) based on actual evidence - never defaulting to a safe middle score.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });

    const rawContent = completion.choices?.[0]?.message?.content ?? "";
    if (!rawContent) {
      throw new Error("Empty response from Z.ai");
    }
    return rawContent;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[ai-service] Z.ai request failed: ${msg}. Falling back to Gemini...`);
    return await callGemini(prompt, geminiKey);
  }
}

/**
 * Analyze a resume against a target role.
 * Returns either a valid AnalysisResult or `{ error: true, message }`.
 */
export async function analyzeResume(
  resumeText: string,
  targetRole: string,
): Promise<AnalysisResult | { error: true; message: string }> {
  let zai: any = null;
  try {
    zai = await ZAI.create();
  } catch (e) {
    console.warn("[ai-service] Z.ai initialization failed, will fall back to Gemini:", e);
  }

  const basePrompt = buildPrompt(resumeText, targetRole);
  const retrySuffix =
    "\n\nIMPORTANT: Your previous response failed JSON validation. Return ONLY the raw JSON object. No markdown, no code fences, no explanation text whatsoever.";

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? basePrompt : basePrompt + retrySuffix;
    try {
      const rawContent = await generateContent(prompt, zai);

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

      // Inject target_role + ensure score_label matches for safety
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

