"use client";

/**
 * Shared motion helpers — staggered fade-up reveal, used by all views
 * to keep animation language consistent across the app.
 */
import { motion, type Variants } from "framer-motion";
import * as React from "react";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.06, 0.6), duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: Math.min(i * 0.05, 0.4), duration: 0.4 },
  }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: Math.min(i * 0.05, 0.4), duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

interface RevealProps {
  children: React.ReactNode;
  i?: number;
  className?: string;
  variant?: "up" | "in" | "scale";
  as?: "div" | "section" | "li" | "span";
}

/** A single element that fades up on mount. */
export function Reveal({ children, i = 0, className, variant = "up", as = "div" }: RevealProps) {
  const MotionTag = motion[as];
  const variants = variant === "up" ? fadeUp : variant === "scale" ? scaleIn : fadeIn;
  return (
    <MotionTag
      custom={i}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={variants}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers its children's fade-up. Wrap a list of <Reveal> items. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  initialDelay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  initialDelay?: number;
}) {
  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: initialDelay },
    },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={container}
      className={className}
    >
      {children}
    </motion.div>
  );
}
