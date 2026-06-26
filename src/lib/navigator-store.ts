/**
 * View-state store - single-page navigation without router routes.
 * The app exposes only `/` (per project constraints), so we use a Zustand
 * store to switch between the 5 logical "pages": landing / upload / results / roadmap / community.
 *
 * `currentAnalysis` carries the AI result from upload → results → roadmap so the
 * user never has to refetch.
 */
import { create } from "zustand";
import type { AnalysisResult } from "@/lib/types";

export type ViewName = "landing" | "upload" | "results" | "roadmap" | "community";

interface NavigatorState {
  view: ViewName;
  currentAnalysis: AnalysisResult | null;
  /** Optional anchor for scroll-to-top on view change. */
  setView: (v: ViewName) => void;
  goHome: () => void;
  goUpload: () => void;
  goResults: (analysis: AnalysisResult) => void;
  goRoadmap: (analysis?: AnalysisResult) => void;
  goCommunity: () => void;
  setAnalysis: (a: AnalysisResult | null) => void;
}

export const useNavigator = create<NavigatorState>((set, get) => ({
  view: "landing",
  currentAnalysis: null,
  setView: (v) => set({ view: v }),
  goHome: () => {
    set({ view: "landing" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goUpload: () => {
    set({ view: "upload" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goResults: (analysis) => {
    set({ view: "results", currentAnalysis: analysis });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goRoadmap: (analysis) => {
    const next = analysis ?? get().currentAnalysis;
    set({ view: "roadmap", currentAnalysis: next });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goCommunity: () => {
    set({ view: "community" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  setAnalysis: (a) => set({ currentAnalysis: a }),
}));
