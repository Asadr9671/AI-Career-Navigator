# 🚀 AI Career Navigator

AI Career Navigator is a state-of-the-art, interactive web application designed to help tech professionals analyze their resumes against a target job role. Using advanced AI-driven multi-dimensional scoring, it identifies skill gaps, highlights strengths, and generates a personalized, actionable 12-week learning roadmap with real-world resources to help candidates bridge those gaps.

---

## 🎨 Design & Experience

The application is built around a single-page view structure wrapped in smooth, GPU-accelerated page transitions:
- **3D Immersive Landing Page**: An eye-catching interactive Hero scene using React Three Fiber, Drei, and Three.js.
- **Drag-and-Drop Resume Upload**: Seamless file upload interface that supports parsing PDF files directly in the browser.
- **Evidence-Based Results Dashboard**: High-fidelity data visualization breaking down performance across 5 key recruitment dimensions.
- **Interactive 12-Week Roadmap**: A weekly educational checklist detailing topics, curated online study resources (YouTube, MDN, fast.ai, etc.), and custom project prompts.
- **Community View**: Provides a live analytical snapshot of aggregate readiness metrics and trending skill gaps across job roles.

---

## 🛠️ Tech Stack

AI Career Navigator utilizes a cutting-edge, modern tech stack designed for speed, visual excellence, and robust type safety:

### Core Framework & Logic
* **Next.js 16 (App Router)** & **React 19**: Server components, optimized client-side hydration, and dynamic code-splitting.
* **TypeScript**: Strict compile-time type-safety across all components, API routes, and services.
* **Zustand**: Clean, lightweight global state management for single-page view transitions.
* **TanStack React Query (v5)**: Performant, asynchronous server-state fetching and mutations.

### Styling & 3D Visuals
* **Tailwind CSS v4**: Utility-first CSS using modern CSS variables and ultra-fast compile times.
* **Framer Motion**: Page transitions, interactive cards, hover micro-animations, and smooth accordion reveals.
* **Three.js / React Three Fiber / @react-three/drei**: Interactive 3D graphics rendered in a web canvas to create a stunning first impression.

### Backend, Database & AI
* **z-ai-web-dev-sdk & Gemini 3.5 Flash**: Integration with advanced LLMs for resume grading, gap assessment, and dynamic curriculum generation.
* **Prisma ORM**: Modern database client for schema migrations, queries, and SQLite mapping.
* **SQLite**: Embedded database used for storing resume analysis statistics and community skill trends.
* **PDF-Parse & PDF-Lib**: Serverless PDF extracting utilities to parse uploading resumes locally.

---

## 📂 Project Structure

```
├── .zscripts/             # Custom deployment and initialization scripts
├── prisma/
│   ├── schema.prisma      # SQLite Database schema
│   └── db/                # (Ignored) SQLite local db directory
├── public/                # Static assets (logos, images, etc.)
└── src/
    ├── app/
    │   ├── api/           # Backend endpoints (analyze, community stats)
    │   ├── layout.tsx     # Base layout wrapper (fonts, providers)
    │   └── page.tsx       # Main page entry point and view router
    ├── components/
    │   ├── ui/            # Reusable UI elements (Shadcn primitives)
    │   ├── views/         # Feature views (Landing, Upload, Results, Roadmap, Community)
    │   └── navbar & footer # Navigation and layout elements
    ├── lib/
    │   ├── ai-service.ts  # Resume analysis engine with Z.ai & Gemini fallbacks
    │   ├── resume-parser.ts # PDF parser
    │   ├── navigator-store.ts # Global state router
    │   └── types.ts       # Shared TypeScript definitions
```

---

## ⚡ Setup & Installation

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** or **Bun** installed on your system.

### 2. Clone the Repository
```bash
git clone https://github.com/Asadr9671/AI-Career-Navigator.git
cd AI-Career-Navigator
```

### 3. Install Dependencies
Using npm:
```bash
npm install
```
Using Bun:
```bash
bun install
```

### 4. Environment Variables Setup
Create a `.env` file in the root directory and add the following keys:
```env
# Database file location
DATABASE_URL="file:./db/custom.db"

# Gemini API Key (optional fallback if Z.ai sdk is not configured)
GEMINI_API_KEY="your-gemini-api-key"
```

### 5. Run Database Setup
Initialize the SQLite database and sync your Prisma schema:
```bash
npx prisma db push
```

### 6. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to run the app.

---

## 🛡️ Database Models
The SQLite database stores anonymized logs for analytics:
* `Analysis`: Saves readiness scores, dimension grading (evidence-based), and roadmap structures for recent parses.
* `SkillTrend`: Aggregates the frequency of specific skill gaps discovered for different target roles to feed the Community View.

---

## 📄 License
This project is private and proprietary. All rights reserved.
