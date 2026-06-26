"use client";

/**
 * Top navigation bar - fixed at the top, glassmorphism style.
 * Shows brand on the left, and 3 nav buttons on the right
 * (Home | Analyze Resume | Community).
 * Active state is derived from the navigator store.
 */
import { motion } from "framer-motion";
import { FileText, Home, Users } from "lucide-react";
import { useNavigator, type ViewName } from "@/lib/navigator-store";
import { cn } from "@/lib/utils";

interface NavItem {
  key: ViewName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export function Navbar() {
  const view = useNavigator((s) => s.view);
  const goHome = useNavigator((s) => s.goHome);
  const goUpload = useNavigator((s) => s.goUpload);
  const goCommunity = useNavigator((s) => s.goCommunity);

  const items: NavItem[] = [
    { key: "landing", label: "Home", icon: Home, onClick: goHome },
    { key: "upload", label: "Analyze Resume", icon: FileText, onClick: goUpload },
    { key: "community", label: "Community", icon: Users, onClick: goCommunity },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.nav
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-3 flex items-center justify-between rounded-2xl glass px-4 py-3 sm:px-6"
        >
          <button
            onClick={goHome}
            className="group flex items-center gap-2.5"
            aria-label="AI Career Navigator - home"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 shadow-glow-violet transition">
              <img
                src="/acn-logo.png"
                alt="ACN Logo"
                className="h-full w-full object-contain p-1"
              />
            </span>

            <span className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">AI Career Navigator</span>
              <span className="text-[10px] text-muted-foreground">Know your gaps. Close them.</span>
            </span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                view === item.key ||
                (item.key === "upload" && (view === "results" || view === "roadmap"));
              return (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-medium transition",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-cyan-400/20 ring-1 ring-inset ring-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.nav>
      </div>
    </header>
  );
}
