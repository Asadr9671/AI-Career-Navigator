"use client";

/**
 * AI Career Navigator — single-page app entry.
 *
 * Per project constraints the only user-visible route is `/`, so we use the
 * Zustand navigator store to switch between 5 logical views:
 *   landing → upload → results → roadmap → community
 *
 * Each transition is wrapped in framer-motion AnimatePresence for a smooth
 * fade/slide. The Navbar is fixed; the Footer is sticky (`mt-auto` from the
 * layout's `min-h-screen flex flex-col`).
 */
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useNavigator } from "@/lib/navigator-store";

// Code-split each view so the initial bundle stays lean and the 3D hero
// only loads on the landing view.
const LandingView = dynamic(() => import("@/components/views/LandingView").then((m) => m.default), {
  ssr: true,
});
const UploadView = dynamic(() => import("@/components/views/UploadView").then((m) => m.default), {
  ssr: false,
});
const ResultsView = dynamic(() => import("@/components/views/ResultsView").then((m) => m.default), {
  ssr: false,
});
const RoadmapView = dynamic(() => import("@/components/views/RoadmapView").then((m) => m.default), {
  ssr: false,
});
const CommunityView = dynamic(() => import("@/components/views/CommunityView").then((m) => m.default), {
  ssr: false,
});

const viewVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
};

export default function Page() {
  const view = useNavigator((s) => s.view);

  return (
    <>
      <Navbar />
      {/* pt-24 to clear the fixed navbar; flex-1 so footer sits at bottom on short views */}
      <main className="flex-1 pt-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "landing" && <LandingView />}
            {view === "upload" && <UploadView />}
            {view === "results" && <ResultsView />}
            {view === "roadmap" && <RoadmapView />}
            {view === "community" && <CommunityView />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
