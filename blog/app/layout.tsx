import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My technical notes",
  description: "A technical blog written with a block editor.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
