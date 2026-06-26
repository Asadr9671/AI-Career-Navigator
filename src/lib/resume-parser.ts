/**
 * Resume parser — extracts text from a PDF and validates it looks like a resume.
 *
 * Next.js / TypeScript adaptation of the original `services/resume_parser.py`.
 * Uses `pdf-parse` v2 (Node) instead of PyMuPDF (Python).
 *
 * NOTE: `pdf-parse` v2+ exports a `PDFParse` CLASS (no default export).
 * The old v1 API `import pdfParse from "pdf-parse"` no longer works.
 */
import { PDFParse } from "pdf-parse";

/** Extract text from a PDF given its raw bytes. */
export async function extractTextFromPdf(fileBytes: Uint8Array): Promise<string> {
  // pdf-parse v2 takes a `data` Uint8Array (Buffer also works — it converts internally).
  // Initialize the worker once for Node (idempotent, no-op if already set).
  try {
    PDFParse.setWorker();
  } catch {
    // Non-fatal: pdfjs will fall back to a fake (main-thread) worker.
  }

  const parser = new PDFParse({ data: fileBytes });
  try {
    const result = await parser.getText();
    // `result.text` is the full concatenated document text.
    const cleaned = (result.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return cleaned;
  } finally {
    // Always release the underlying pdfjs document to avoid memory leaks.
    await parser.destroy().catch(() => {});
  }
}

/**
 * Validate resume text.
 * Returns [isValid, message].
 *  - too short < 150 chars  → invalid (image-only / empty)
 *  - 150 ≤ len < 300        → invalid (too short)
 *  - len > 8000             → valid, silently truncate to 8000
 *  - otherwise              → valid
 */
export function validateResume(text: string): [boolean, string] {
  const len = text.length;
  if (len < 150) {
    return [false, "PDF appears to be empty or image-only. Please upload a text-based PDF."];
  }
  if (len < 300) {
    return [false, "Resume text too short to analyze."];
  }
  if (len > 8000) {
    return [true, "truncated"];
  }
  return [true, ""];
}

const RESUME_KEYWORDS = [
  "experience", "education", "skills", "project", "university", "degree",
  "internship", "work", "engineer", "developer", "bachelor", "master",
  "gpa", "certificate", "python", "javascript", "software", "data", "cloud",
  "devops", "react", "node", "sql", "aws", "docker", "kubernetes", "git",
  "typescript", "java", "c++", "machine", "learning", "framework",
];

/** Heuristic: returns true if at least 3 resume keywords appear (case-insensitive). */
export function isResume(text: string): boolean {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of RESUME_KEYWORDS) {
    if (lower.includes(kw)) hits++;
    if (hits >= 3) return true;
  }
  return false;
}

/** Truncate text to 8000 chars (matches the silent-truncate rule in validateResume). */
export function truncateForModel(text: string, max = 8000): string {
  return text.length > max ? text.slice(0, max) : text;
}
