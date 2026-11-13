"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import "./cursor-effect.css";
const Splash = dynamic(() => import("./cursor-splash"), { ssr: false });
export function CursorEffect() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const isReadingPost = /^\/(?:posts|private-posts)\/[^/]+\/?$/.test(pathname);
  return enabled && !pathname.startsWith("/ykk") && !isReadingPost ? <Splash key={pathname} /> : null;
}
