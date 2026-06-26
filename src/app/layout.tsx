import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Career Navigator — Know What's Holding Back Your Career",
  description:
    "Upload your resume. Get an honest readiness score, a precise skill gap analysis, and a free 12-week learning roadmap tailored to the role you want. Built with AI.",
  keywords: [
    "AI Career Navigator",
    "resume analyzer",
    "career roadmap",
    "skill gap analysis",
    "job readiness score",
    "AI career coach",
  ],
  authors: [{ name: "AI Career Navigator" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AI Career Navigator",
    description:
      "Upload your resume. Get an honest readiness score, a precise skill gap analysis, and a free 12-week learning roadmap.",
    siteName: "AI Career Navigator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Career Navigator",
    description:
      "Upload your resume. Get an honest readiness score and a free 12-week learning roadmap.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
