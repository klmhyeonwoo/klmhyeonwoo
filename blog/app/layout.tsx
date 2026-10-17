import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

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
  title: "bloging.",
  description: "기록을 쌓아가는 개인 블로그, bloging.",
  metadataBase: getSiteUrl(),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "bloging.",
    title: "bloging.",
    description: "기록을 쌓아가는 개인 블로그, bloging.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "bloging." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "bloging.",
    description: "기록을 쌓아가는 개인 블로그, bloging.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
