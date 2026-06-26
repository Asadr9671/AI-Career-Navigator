# AI Career Navigator — Master Prompt File
### Independent Project | One-Day Build Sprint
### Author: Shadow | Stack: React + FastAPI + Gemini + Supabase (All Free)

---

> **How to use this file:**
> Work through the prompts in order — top to bottom — in a single day.
> Each prompt is fully self-contained. Paste it into Claude, Cursor, Windsurf,
> or Bolt.new exactly as written. The entire project will be live by end of day.
> Estimated total build time: 8–10 hours.

---

## MASTER SYSTEM CONTEXT
> **Required.** Paste this block at the top of EVERY new AI coding session
> before running any prompt below. It keeps all tools aligned on the same project.

```
You are a senior full-stack AI engineer building "AI Career Navigator" —
an independent web application that analyzes a user's uploaded resume,
identifies skill gaps for their chosen career path, generates a personalized
week-by-week learning roadmap, shows a job readiness score, and includes a
community dashboard showing trending skills across all users.

TECH STACK (100% free tier, no credit card required):
  Frontend   : React 18 + Vite + Tailwind CSS + shadcn/ui → Vercel (free)
  Backend    : FastAPI (Python 3.11) → Render.com (free tier)
  AI Engine  : Google Gemini 1.5 Flash via google-generativeai → Google AI Studio (free)
  Database   : Supabase PostgreSQL → Supabase free tier (500MB)
  Auth       : Supabase Auth (built-in, free)
  PDF Parse  : PyMuPDF (fitz) — server-side, open source
  PDF Export : pdf-lib — browser-side JavaScript, zero server cost

PROJECT FOLDER STRUCTURE:
  /career-navigator-frontend     React + Vite app
  /career-navigator-backend      FastAPI app
    main.py                      App entry, CORS, router registration
    routers/
      analyze.py                 Resume upload and AI analysis endpoint
      community.py               Public trending skills endpoints
    services/
      gemini_service.py          Gemini API calls and prompt logic
      resume_parser.py           PDF text extraction with PyMuPDF
    models/
      schemas.py                 Pydantic request/response models
    database.py                  Supabase client initialization

CODING RULES — follow these in every file generated:
  1. Zero paid services. Every library, API, and platform must have a free tier.
  2. All secrets via environment variables. Never hardcode keys.
  3. Async/await throughout FastAPI. No synchronous blocking calls.
  4. Functional React components with hooks only. No class components.
  5. All API responses follow { data, error, message } envelope structure.
  6. Input validation on every endpoint (file type, size, role whitelist).
  7. Graceful error handling — never let an unhandled exception reach the user.
  8. TypeScript is NOT used — plain JavaScript only on the frontend.
  9. Tailwind CSS for all styling. No custom CSS files.
  10. Each file must be complete and immediately runnable — no placeholders.
```

---

## HOUR 1 — PROJECT SETUP
> **Goal:** Both repos initialized, dependencies installed, env files configured,
> Supabase schema live. Should take ~45 minutes.

---

### PROMPT 01 — SCAFFOLD BOTH REPOS

```
Using the master system context above, generate the following files
to initialize the complete project. Output each as a labelled code block.
No explanations between files — just the files.

FILES TO GENERATE:

1. /career-navigator-backend/requirements.txt
   Packages: fastapi uvicorn[standard] python-multipart pymupdf
   google-generativeai supabase python-dotenv pydantic[email]
   python-jose[cryptography] passlib[bcrypt]

2. /career-navigator-backend/.env.example
   Variables:
     GEMINI_API_KEY=your_gemini_api_key_here
     SUPABASE_URL=https://your-project-ref.supabase.co
     SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_KEY=your_supabase_service_role_key
     SECRET_KEY=any_long_random_string_here
     FRONTEND_URL=http://localhost:5173

3. /career-navigator-backend/main.py
   - FastAPI app instance with title "AI Career Navigator API"
   - CORSMiddleware: allow origins from env FRONTEND_URL + https://*.vercel.app,
     allow_methods=["*"], allow_headers=["*"], allow_credentials=True
   - Include routers: analyze (prefix /analyze), community (prefix /community)
   - GET / → returns {"status": "ok", "app": "AI Career Navigator", "version": "1.0"}

4. /career-navigator-backend/database.py
   - Loads SUPABASE_URL and SUPABASE_ANON_KEY from env using python-dotenv
   - Creates and exports: supabase_client (anon key, for user-facing ops)
   - Creates and exports: supabase_admin (service key, for server-side inserts)

5. /career-navigator-frontend/package.json
   Dependencies: react react-dom react-router-dom axios recharts
   react-dropzone pdf-lib lucide-react clsx tailwind-merge
   devDependencies: vite @vitejs/plugin-react tailwindcss postcss autoprefixer

6. /career-navigator-frontend/vite.config.js
   Standard Vite + React config with proxy:
   /api → http://localhost:8000 (so frontend can call /api/analyze during dev)

7. /career-navigator-frontend/src/main.jsx
   React 18 createRoot with BrowserRouter wrapping App

8. /career-navigator-frontend/src/App.jsx
   Routes:
     /           → LandingPage
     /analyze    → UploadPage
     /results/:id → ResultsPage
     /roadmap/:id → RoadmapPage
     /community  → CommunityPage
   Persistent Navbar at top with links: Home | Analyze Resume | Community
   Use react-router-dom NavLink with active styling.

9. /career-navigator-frontend/.env.example
   VITE_API_URL=http://localhost:8000
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### PROMPT 02 — SUPABASE DATABASE SCHEMA
> **Run this entire block in:** supabase.com → your project → SQL Editor → New Query → Run

```sql
-- ============================================================
-- AI Career Navigator — Supabase Database Schema
-- Run this full block once in the Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (auto-created on signup via trigger below)
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Resume analysis results
CREATE TABLE public.analyses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_role      TEXT NOT NULL,
  readiness_score  INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  score_label      TEXT,
  gaps             JSONB DEFAULT '[]',
  strengths        JSONB DEFAULT '[]',
  roadmap          JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Anonymized skill trend tracking (no PII)
CREATE TABLE public.skill_trends (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_role  TEXT NOT NULL,
  skill_name   TEXT NOT NULL,
  frequency    INTEGER DEFAULT 1,
  last_seen    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (target_role, skill_name)
);

-- Row-level security
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_trends ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Own profile readable"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Own analyses readable"
  ON public.analyses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Own analyses insertable"
  ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Skill trends public read"
  ON public.skill_trends FOR SELECT USING (true);

-- Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## HOUR 2–3 — BACKEND CORE
> **Goal:** Working FastAPI server with resume parsing and Gemini AI analysis.
> Test with Postman or curl before moving to frontend.

---

### PROMPT 03 — GEMINI AI SERVICE
> This is the most important file in the entire project.
> The quality of the AI output depends entirely on this prompt engineering.

```
Using the master system context, generate the complete file:
/career-navigator-backend/services/gemini_service.py

REQUIREMENTS:

The file must contain one async function:
  analyze_resume(resume_text: str, target_role: str) -> dict

GEMINI SETUP:
- Load GEMINI_API_KEY from environment using python-dotenv
- Model: gemini-1.5-flash
- generation_config:
    temperature: 0.2  (low = consistent structured output)
    max_output_tokens: 3000
    response_mime_type: "application/json"  (forces clean JSON response)

THE EXACT PROMPT TO SEND TO GEMINI (use this verbatim, only fill the placeholders):
---
You are an expert technical recruiter and career coach with 15 years of experience
evaluating software engineering and tech candidates for top companies.

A candidate has submitted their resume and wants to become a: {target_role}

RESUME CONTENT:
{resume_text}

Perform a rigorous, honest analysis across 4 tasks:

TASK 1 — JOB READINESS SCORE (integer 0-100):
Assess how ready this candidate is for a {target_role} role at a mid-to-large
tech company today (2025). Be calibrated: 40 = significant gaps, 70 = competitive,
90+ = exceptionally strong. Do not inflate scores.

TASK 2 — SKILL GAP ANALYSIS:
Identify the 5 to 8 most critical skills or knowledge areas that are ABSENT or
clearly UNDERDEVELOPED in this resume relative to {target_role} requirements.
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
  "score_label": "74% ready for {target_role}",
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
}
---

POST-RESPONSE VALIDATION:
After receiving the Gemini response, validate:
  - score is an integer between 0 and 100
  - gaps is a list with 5–8 string items
  - strengths is a list with exactly 3 string items
  - roadmap is a list with exactly 12 objects
  - each roadmap object has all 5 required keys
  - each resource_url starts with "https://"

RETRY LOGIC:
If validation fails or JSON parsing fails, retry once with this appended to the prompt:
"IMPORTANT: Your previous response failed JSON validation. Return ONLY the raw JSON
object. No markdown, no code fences, no explanation text whatsoever."

ERROR RETURNS:
On quota exceeded: return {"error": True, "message": "API quota exceeded. Try again in a minute."}
On all other failures: return {"error": True, "message": "Analysis failed: <exception message>"}

Include all imports. Use load_dotenv() at the top of the file.
```

---

### PROMPT 04 — RESUME PARSER SERVICE

```
Using the master system context, generate the complete file:
/career-navigator-backend/services/resume_parser.py

REQUIREMENTS:

1. extract_text_from_pdf(file_bytes: bytes) -> str
   - Uses PyMuPDF: import fitz
   - Opens PDF from bytes stream (not file path)
   - Extracts text from every page, joins with newline
   - Strips repeated whitespace and blank lines
   - Returns cleaned string

2. validate_resume(text: str) -> tuple[bool, str]
   Returns (is_valid: bool, message: str)
   - (False, "PDF appears to be empty or image-only. Please upload a text-based PDF.")
     if len(text.strip()) < 150
   - (True, "truncated") if text > 8000 chars — silently truncate to 8000
   - (False, "Resume text too short to analyze.") if 150 <= len < 300
   - (True, "") for all valid cases

3. is_resume(text: str) -> bool
   Returns True if at least 3 of these words appear (case-insensitive):
   experience, education, skills, project, university, degree, internship,
   work, engineer, developer, bachelor, master, gpa, certificate, python,
   javascript, software, data, cloud, devops

All functions must have type hints and a one-line docstring.
```

---

### PROMPT 05 — PYDANTIC SCHEMAS

```
Using the master system context, generate the complete file:
/career-navigator-backend/models/schemas.py

Define Pydantic v2 models for:

1. RoadmapWeek
   week: int
   topic: str
   resource_title: str
   resource_url: str
   project: str

2. AnalysisResult
   id: Optional[str] = None
   target_role: str
   score: int
   score_label: str
   gaps: list[str]
   strengths: list[str]
   roadmap: list[RoadmapWeek]
   created_at: Optional[str] = None

3. AnalysisRequest (for form data reference — not a request body, just docs)
   file: description note (UploadFile, handled in router)
   target_role: str — must be one of the 6 valid roles

4. TrendingSkill
   skill_name: str
   target_role: str
   frequency: int

5. CommunityStats
   total_analyses: int
   average_score: float
   top_role: str
   most_common_gap: str

VALID_ROLES constant (list of 6 strings):
  "Software Development", "AI/ML Engineer", "DevOps Engineer",
  "Data Science", "Full-Stack Developer", "Cloud Engineer"

Export VALID_ROLES at the module level for use in routers.
```

---

### PROMPT 06 — ANALYZE ROUTER

```
Using the master system context, generate the complete file:
/career-navigator-backend/routers/analyze.py

ENDPOINTS:

POST /analyze/upload
  Input: multipart/form-data
    file: UploadFile  (PDF only, max 5MB)
    target_role: str  (must be in VALID_ROLES)
    user_id: Optional[str] = None
  Process (in order):
    1. Validate file content type is application/pdf; return HTTP 400 if not
    2. Read file bytes; return HTTP 413 if > 5MB (5_242_880 bytes)
    3. Call resume_parser.extract_text_from_pdf(bytes)
    4. Call resume_parser.validate_resume(text); return HTTP 422 if invalid
    5. Call resume_parser.is_resume(text); return HTTP 422 with message
       "This does not appear to be a resume. Please upload your CV or resume."
       if False
    6. Call gemini_service.analyze_resume(text, target_role)
    7. If result contains "error" key: return HTTP 502 with the error message
    8. If user_id is provided:
         a. Insert row into analyses table via supabase_admin
         b. For each gap in result["gaps"], upsert into skill_trends:
            on conflict (target_role, skill_name) increment frequency by 1
         c. Add the saved analysis id to the result dict
    9. Return result with HTTP 200

GET /analyze/result/{analysis_id}
  Fetch from analyses table by id using supabase_admin
  Return 404 if not found, else return the full row as AnalysisResult

GET /analyze/history/{user_id}
  Return last 10 analyses for user_id, ordered by created_at DESC
  Only return: id, target_role, readiness_score, score_label, created_at

Include all imports. Import VALID_ROLES from models.schemas.
Use supabase_admin from database.py for all DB operations.
```

---

### PROMPT 07 — COMMUNITY ROUTER

```
Using the master system context, generate the complete file:
/career-navigator-backend/routers/community.py

ENDPOINTS:

GET /community/trending
  Query param: role: Optional[str] = None
  If role provided: filter skill_trends by target_role = role
  Return top 15 rows ordered by frequency DESC
  Response: list of TrendingSkill

GET /community/stats
  Query against analyses and skill_trends tables:
    total_analyses  → COUNT(*) from analyses
    average_score   → AVG(readiness_score) from analyses, rounded to 1 decimal
    top_role        → target_role with highest COUNT in analyses
    most_common_gap → skill_name with highest frequency in skill_trends
  Return as CommunityStats
  If tables are empty return sensible defaults (zeros, "N/A")

All operations use supabase_admin (bypasses RLS for public aggregate reads).
No authentication required on any community endpoint.
```

---

## HOUR 4–5 — FRONTEND PAGES
> **Goal:** All 5 pages built and wired to the backend API.

---

### PROMPT 08 — LANDING PAGE

```
Using the master system context, generate the complete file:
/career-navigator-frontend/src/pages/LandingPage.jsx

Build a clean, professional hero landing page with:

1. HERO SECTION
   - Headline: "Know Exactly What's Holding Back Your Career"
   - Subheadline: "Upload your resume. Get an honest readiness score,
     a precise skill gap analysis, and a free 12-week learning roadmap —
     tailored to the role you want."
   - CTA button: "Analyze My Resume →" → navigates to /analyze
   - A small trust line below button:
     "Free to use. No account required for instant results."

2. HOW IT WORKS SECTION (3 steps, horizontal on desktop, vertical on mobile)
   Step 1 — Upload: "Drop your PDF resume and select your target role"
   Step 2 — Analyze: "Our AI scores your resume and finds your exact skill gaps"
   Step 3 — Learn: "Get a week-by-week free roadmap to close every gap"
   Use lucide-react icons: Upload, Cpu, BookOpen

3. ROLES SECTION
   "Works for 6 career paths" — show the 6 role cards in a 3x2 grid
   with matching icons (Code, Brain, Server, BarChart, Layers, Cloud)
   Cards are non-interactive, just visual.

4. FOOTER
   "AI Career Navigator — Built with Gemini AI · Open Source"

Tailwind CSS only. Mobile-first responsive design.
No external images or assets. Icons from lucide-react only.
```

---

### PROMPT 09 — UPLOAD PAGE

```
Using the master system context, generate the complete file:
/career-navigator-frontend/src/pages/UploadPage.jsx

This is the core user interaction page. Build it with:

1. PDF DRAG-AND-DROP UPLOADER (using react-dropzone)
   Visual states:
     idle:         Dashed border, "Drag your resume here or click to browse"
                   + "PDF files only · Max 5MB" in smaller text below
     drag-over:    Solid accent border, blue-tinted background, "Drop it!"
     file-selected: Shows filename, file size, green checkmark icon
                   + a small "Remove" link to clear selection
   Validation (client-side before submit):
     - Reject non-PDF by checking file.type === "application/pdf"
     - Reject files > 5MB
     - Show inline error message for both cases

2. ROLE SELECTOR — 6 clickable cards in a 2-column grid
   Each card: icon (top) + role name (bottom)
   Roles: Software Development (Code), AI/ML Engineer (Brain),
          DevOps Engineer (Server), Data Science (BarChart),
          Full-Stack Developer (Layers), Cloud Engineer (Cloud)
   Selected state: accent-colored border, lightly tinted background

3. ANALYZE BUTTON
   - Disabled and gray when file or role not selected
   - Active and accent-colored when both are selected
   - During API call: shows spinner + "Analyzing your resume..." text, disabled
   - Full width on mobile, auto width centered on desktop

4. API CALL on submit:
   POST to ${import.meta.env.VITE_API_URL}/analyze/upload
   FormData with: file (the PDF), target_role (selected role)
   On success (200): navigate to /results/${response.data.id}
                     passing full response.data as router state
   On error: show inline error banner with the API error message

5. LAYOUT: single column, max-width 600px, centered, generous padding
   Section headings: "Step 1 — Upload Your Resume" and "Step 2 — Select Your Target Role"
```

---

### PROMPT 10 — RESULTS DASHBOARD PAGE

```
Using the master system context, generate the complete file:
/career-navigator-frontend/src/pages/ResultsPage.jsx

Data source: useLocation().state contains the full analysis object.
If state is null, fetch from GET /analyze/result/:id using useParams().

BUILD THESE SECTIONS IN ORDER:

1. SCORE HEADER CARD
   - Large centered circular gauge using recharts RadialBarChart
     (single bar, fill based on score: red <40, amber 40-70, green >70)
   - Score number large (e.g. "74") inside the gauge center
   - Score label below: "74% Ready for Software Development"
   - Animate the bar from 0 to score on mount (use startAngle/endAngle animation)

2. SKILL GAPS CARD
   Heading: "Skills to Develop" with AlertCircle icon
   Each gap as a rounded pill badge: red background, red text, × icon on right
   Caption below pills: "Closing these gaps will most impact your readiness score."

3. STRENGTHS CARD
   Heading: "Your Strengths" with CheckCircle icon
   Each strength as a rounded pill badge: green background, green text, ✓ icon
   Caption: "Leverage these in interviews and on your resume."

4. ACTION ROW (3 buttons, horizontal on desktop, stacked on mobile)
   [View Full Roadmap →]    → navigate to /roadmap/:id with state
   [Export PDF Report]      → calls handleExportPDF() (see below)
   [Analyze Another Resume] → navigate to /analyze

5. PDF EXPORT using pdf-lib (fully browser-side, no backend call):
   async function handleExportPDF(analysisData):
     Page 1 — Cover:
       Title: "AI Career Navigator Report"
       Date: today's date
       Role: target_role
       Readiness Score: score + score_label
       Gaps listed with bullet points
       Strengths listed with bullet points
     Pages 2-4 — Roadmap (3 weeks per page):
       Each week block: Week N header, Topic, Resource (title + URL), Project
     Save as: "career-roadmap-{role}-{YYYY-MM-DD}.pdf"
     Trigger browser download immediately

Use shadcn/ui-style Tailwind card styling (white bg, rounded-xl, shadow-sm, border).
Show a skeleton loader while fetching (if fetching by ID).
All sections animate in with a staggered fade-up on mount.
```

---

### PROMPT 11 — ROADMAP PAGE

```
Using the master system context, generate the complete file:
/career-navigator-frontend/src/pages/RoadmapPage.jsx

Data: from useLocation().state or fetch by ID if state is null.

FEATURES:

1. HEADER
   - Title: "Your 12-Week Learning Roadmap"
   - Role badge: target_role
   - Progress bar: "X of 12 weeks complete" (X = checked weeks count)
   - Progress persisted in localStorage with key: "roadmap-progress-{analysisId}"

2. FILTER TABS (above the cards row)
   [All] [Remaining] [Completed]
   Filters the visible week cards accordingly.

3. WEEK CARDS (12 total, 2-column grid on desktop, 1-column mobile)
   Each card contains:
     - Top-left: "Week N" badge
       Color group: weeks 1-4 = blue, 5-8 = amber, 9-12 = green
     - Topic: bold heading
     - Resource row: BookOpen icon + clickable link (resource_title, opens new tab)
     - Project row: Wrench icon + project description text
     - Bottom: checkbox "Mark as complete" — updates progress state
   Completed card appearance: green left border, subtle green background tint,
   CheckCircle icon top-right, slightly reduced opacity on content

4. COMPLETION BANNER (shown when all 12 complete)
   Full-width card with trophy icon:
   "Roadmap Complete! You've put in the work — time to update your resume and apply."
   Button: "Analyze Again →" → /analyze

5. BACK LINK at top-left: "← Back to Results" → /results/:id

No external API calls on this page — all data from state or the already-fetched result.
```

---

### PROMPT 12 — COMMUNITY PAGE

```
Using the master system context, generate the complete file:
/career-navigator-frontend/src/pages/CommunityPage.jsx

This page shows anonymized learning trends across all users.
Fetch data on mount from:
  GET /community/stats    → CommunityStats object
  GET /community/trending → list of TrendingSkill objects

SECTIONS:

1. STATS ROW — 4 metric cards in a grid
   - Total Resumes Analyzed  (Users icon)
   - Average Readiness Score (TrendingUp icon)
   - Most Popular Role       (Star icon)
   - Most Common Skill Gap   (AlertTriangle icon)
   Show skeleton loaders while fetching.

2. TRENDING SKILLS CHART
   - Heading: "Top Skills People Are Working On"
   - Role filter dropdown above chart (All Roles + the 6 specific roles)
   - Horizontal recharts BarChart
     Y-axis: skill_name, X-axis: frequency count
     Bar fill color varies by role (assign each role a fixed Tailwind color)
   - Chart height: 420px, responsive container width 100%
   - Custom tooltip showing: skill name, role, count

3. RANKED SKILLS LIST (below chart, same filtered data)
   Table with columns: # | Skill | Role | Count
   Show 10 rows, "Load More" button appends next 10
   Role shown as a colored badge matching the chart color

4. DISCLAIMER FOOTER
   Small muted text: "All insights are anonymized. No personal data is displayed."

Implement loading state (skeleton), error state (retry button), and empty state
("No data yet — be the first to analyze your resume!").
```

---

## HOUR 6 — DEPLOYMENT
> **Goal:** Both services live with public URLs. Should take ~45 minutes.

---

### PROMPT 13 — DEPLOYMENT CONFIG FILES

```
Using the master system context, generate all deployment and config files.
Output each as a labelled code block, no explanations between them.

1. /career-navigator-backend/render.yaml
   Web service, Python 3.11, build: pip install -r requirements.txt,
   start: uvicorn main:app --host 0.0.0.0 --port $PORT
   Set envVars section with placeholders for all 5 env variables.

2. /career-navigator-frontend/vercel.json
   SPA rewrite: all routes → /index.html
   Build: npm run build, output: dist
   No serverless functions needed.

3. /career-navigator-backend/Dockerfile
   Python 3.11-slim, WORKDIR /app, copy requirements, install, copy app,
   EXPOSE 8000, CMD uvicorn main:app --host 0.0.0.0 --port 8000

4. /.gitignore (root level, covers both sub-projects)
   Cover: .env, __pycache__, node_modules, dist, .venv, venv,
   *.pyc, .DS_Store, *.egg-info

5. /README.md
   Sections: Overview (3 sentences), Live Demo (placeholder URL),
   Tech Stack (table), Local Setup (step-by-step for both frontend and backend),
   Environment Variables (table with name + description for all variables),
   Deploy (Vercel + Render.com steps), Free Tier Limits (what to watch for),
   License: MIT
```

---

## HOUR 7 — TESTING & BUG FIXES

---

### PROMPT 14 — BACKEND TEST SCRIPT

```
Using the master system context, generate /career-navigator-backend/test_api.py

A zero-dependency test script runnable with: python test_api.py
Uses only httpx and standard library. No pytest.

TEST SUITE:

T01: Health check — GET / → 200, body contains "status": "ok"
T02: Invalid file type — POST /analyze/upload with a .txt file → 400
T03: File too large — POST /analyze/upload with 6MB fake bytes → 413
T04: Missing role — POST /analyze/upload with valid PDF but no target_role → 422
T05: Valid analysis — POST /analyze/upload with a generated minimal PDF
     (generate inline using fpdf2 or write raw PDF bytes — no external file needed)
     target_role = "Software Development"
     Assert: 200, response has keys score/gaps/strengths/roadmap
     Assert: 0 <= score <= 100
     Assert: len(roadmap) == 12
     Assert: all roadmap items have week/topic/resource_title/resource_url/project
     Assert: each resource_url starts with "https://"
T06: Community stats — GET /community/stats → 200, has all 4 expected keys
T07: Community trending — GET /community/trending → 200, returns a list

For each test: print "✓ PASS T0X — <name> (<Nms>)" or "✗ FAIL T0X — <name>: <error>"
Print summary at end: "X/7 tests passed"
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
```

---

## QUICK-FIX PROMPTS
> Keep these ready. Copy-paste the relevant one when you hit a specific issue.

---

### FIX-01 — CORS error in browser console
```
My React app at localhost:5173 is getting a CORS error when calling FastAPI
at localhost:8000. The error is: [paste error here]
Fix the CORSMiddleware in main.py. Ensure allow_origins includes both
http://localhost:5173 and https://*.vercel.app, allow_credentials=True,
allow_methods=["*"], allow_headers=["*"].
```

### FIX-02 — Gemini returns plain text instead of JSON
```
My Gemini 1.5 Flash call is returning plain text or markdown-wrapped JSON
instead of a pure JSON object. The current gemini_service.py is: [paste file]
Fix it by:
1. Adding response_mime_type: "application/json" to generation_config
2. Stripping any ```json or ``` fences before json.loads()
3. Adding a fallback: if parsing fails, log the raw response and retry once
```

### FIX-03 — Supabase insert blocked by RLS
```
My FastAPI backend is getting a permission denied error when inserting into
the analyses table. I am using the anon key. Fix database.py to create a
second Supabase client using the SUPABASE_SERVICE_KEY (service_role key)
which bypasses RLS. Name it supabase_admin and use it in analyze.py for
all insert and upsert operations.
```

### FIX-04 — Render.com cold start (30-second delay)
```
My Render.com free tier backend has a 30-second cold start on the first request.
Add a keep-alive ping to App.jsx using useEffect and setInterval:
every 14 minutes, silently call GET /health on the backend to prevent sleep.
The interval should clear on component unmount. Show the complete updated App.jsx.
```

### FIX-05 — PDF export not downloading in Safari
```
My pdf-lib export function works in Chrome but the download does not trigger
in Safari. Here is my current handleExportPDF function: [paste function]
Fix the download trigger to work cross-browser including Safari and mobile browsers.
```

### FIX-06 — Recharts RadialBarChart not animating
```
My recharts RadialBarChart score gauge is not animating from 0 to the score value
on page mount. Here is the current component code: [paste component]
Fix it using the isAnimationActive prop and animationBegin/animationDuration,
or use a useEffect + useState approach that increments the displayed value
from 0 to the target score over 1.2 seconds using requestAnimationFrame.
```

---

## FREE TOOLS REFERENCE

| Purpose | Tool | URL | Notes |
|---|---|---|---|
| AI Engine | Google Gemini 1.5 Flash | aistudio.google.com | Free, 1M tokens/min |
| Alt AI | Together.ai (Llama 3) | together.ai | $25 free credit |
| Frontend deploy | Vercel | vercel.com | Unlimited, free |
| Backend deploy | Render.com | render.com | 750 hrs/month free |
| Database + Auth | Supabase | supabase.com | 500MB, 50k rows free |
| UI components | shadcn/ui | ui.shadcn.com | Copy-paste, free |
| Icons | lucide-react | lucide.dev | MIT license |
| Charts | recharts | recharts.org | MIT license |
| PDF (browser) | pdf-lib | pdf-lib.js.org | MIT license |
| PDF (server) | PyMuPDF | pymupdf.readthedocs.io | AGPL, free |
| AI coding | Cursor | cursor.com | Free tier |
| Alt coding | Bolt.new | bolt.new | Free tier |

---

## ONE-DAY SPRINT SCHEDULE

| Time | Task | Prompts |
|---|---|---|
| 9:00 AM | Scaffold repos, install deps, Supabase schema | 01, 02 |
| 10:00 AM | Gemini service + Resume parser + Schemas | 03, 04, 05 |
| 11:00 AM | Analyze router + Community router | 06, 07 |
| 12:00 PM | **Test backend with curl/Postman before touching frontend** | — |
| 1:00 PM | Landing page + Upload page | 08, 09 |
| 2:30 PM | Results page + PDF export | 10 |
| 3:30 PM | Roadmap page + Community page | 11, 12 |
| 4:30 PM | Deployment config + push to GitHub | 13 |
| 5:00 PM | Deploy backend to Render.com, frontend to Vercel | — |
| 5:30 PM | Run test script, fix issues with FIX-0X prompts | 14 |
| 6:00 PM | **Live demo URL ready** | — |

---

> Start with the MASTER SYSTEM CONTEXT block in every session.
> Run prompts in order. Test the backend before building the frontend.
> All infrastructure is free. Total cost to ship: $0.
```

*AI Career Navigator — Independent Project | Built in one day*
