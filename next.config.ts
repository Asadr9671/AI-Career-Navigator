import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // pdfjs-dist (used by pdf-parse) dynamically imports its worker module.
  // Turbopack rewrites that import to a .next/dev/server/chunks/ path that
  // doesn't exist, breaking PDF text extraction at runtime.
  // Marking these as server external packages makes Next.js load them via
  // native Node require() instead of bundling — so the worker resolves correctly.
  serverExternalPackages: ["pdfjs-dist", "pdf-parse", "canvas"],
};

export default nextConfig;
