import type { Metadata } from "next";
import type { Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import "./image-containment.css";
import "@/components/editor-interactions.css";
import { ToastProvider } from "@/components/toast-provider";
import { AdminSessionProvider } from "@/components/admin-session";
import { CursorEffect } from "@/components/cursor-effect";
import { SystemThemeSync } from "@/components/theme-toggle";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

const systemThemeScript = `
  (() => {
    let preference = "";
    try { preference = localStorage.getItem("theme") || ""; } catch {}
    const applyTheme = () => {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = preference === "dark" || preference === "light" ? preference : systemTheme;
    };
    applyTheme();
  })();
`;

export const metadata: Metadata = {
  title: { default: "wavy studio", template: "%s | wavy studio" },
  description: "기록을 쌓아가는 개인 블로그, wavy studio",
  metadataBase: getSiteUrl(),
  alternates: { canonical: "/", types: { "application/rss+xml": absoluteUrl("/rss.xml") } },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: {
    other: {
      "naver-site-verification": "1203d34a59acbfa0df7e70a917d4691008bb1feb",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "wavy studio",
    title: "wavy studio",
    description: "기록을 쌓아가는 개인 블로그, wavy studio",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "wavy studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "wavy studio",
    description: "기록을 쌓아가는 개인 블로그, wavy studio",
    images: ["/opengraph-image"],
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: systemThemeScript }} /></head>
      <body><SystemThemeSync /><CursorEffect /><ToastProvider><AdminSessionProvider>{children}</AdminSessionProvider></ToastProvider><Analytics /></body>
    </html>
  );
}
