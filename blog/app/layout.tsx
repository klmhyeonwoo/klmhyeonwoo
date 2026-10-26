import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import "./image-containment.css";
import "@/components/editor-interactions.css";
import { ToastProvider } from "@/components/toast-provider";
import { AdminSessionProvider } from "@/components/admin-session";
import { CursorEffect } from "@/components/cursor-effect";
import { SystemThemeSync } from "@/components/theme-toggle";

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

function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  try {
    return new URL(value);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  title: { default: "wavy studio", template: "%s | wavy studio" },
  description: "기록을 쌓아가는 개인 블로그, wavy studio",
  metadataBase: getSiteUrl(),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: {
    other: {
      "naver-site-verification": "7186ca39127c40df126d2de419d19f1aad8029d9",
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
      <body><SystemThemeSync /><CursorEffect /><ToastProvider><AdminSessionProvider>{children}</AdminSessionProvider></ToastProvider></body>
    </html>
  );
}
