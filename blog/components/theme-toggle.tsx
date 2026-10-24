"use client";

import { IconMoonLine, IconSunLine } from "@karrotmarket/react-monochrome-icon";
import { useEffect, useRef, useState } from "react";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = Exclude<ThemePreference, "system">;

function getPreference(): ThemePreference {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem("theme"); } catch { /* Storage can be disabled by the browser. */ }
  return saved === "light" || saved === "dark" ? saved : "system";
}

function resolveTheme(preference: ThemePreference, mediaQuery: MediaQueryList): ResolvedTheme {
  if (preference === "system") return mediaQuery.matches ? "dark" : "light";
  return preference;
}

function applyTheme(preference: ThemePreference, mediaQuery: MediaQueryList) {
  document.documentElement.dataset.theme = resolveTheme(preference, mediaQuery);
}

/** Keeps the document in sync with the operating system color preference. */
export function SystemThemeSync() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => applyTheme(getPreference(), mediaQuery);

    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  return null;
}

export function ThemePreferenceControl() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreference = () => {
      const nextPreference = getPreference();
      setPreference(nextPreference);
      setResolvedTheme(resolveTheme(nextPreference, mediaQuery));
    };
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!controlRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function selectTheme(nextPreference: ThemePreference) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    try { window.localStorage.setItem("theme", nextPreference); } catch { /* Fall back to this page session. */ }
    setPreference(nextPreference);
    setResolvedTheme(resolveTheme(nextPreference, mediaQuery));
    applyTheme(nextPreference, mediaQuery);
    setIsOpen(false);
  }

  const label = preference === "system" ? "시스템 설정" : preference === "dark" ? "다크 모드" : "라이트 모드";

  return <div className="theme-control" ref={controlRef}>
    <button type="button" className="theme-toggle" onClick={() => setIsOpen((open) => !open)} aria-label={`테마 설정: ${label}`} aria-expanded={isOpen} aria-haspopup="menu">
      {resolvedTheme === "dark" ? <IconMoonLine size={18} /> : <IconSunLine size={18} />}
    </button>
    {isOpen && <div className="theme-menu" role="menu" aria-label="테마 설정">
      <button type="button" role="menuitemradio" aria-checked={preference === "system"} onClick={() => selectTheme("system")}>시스템 설정</button>
      <button type="button" role="menuitemradio" aria-checked={preference === "light"} onClick={() => selectTheme("light")}>라이트 모드</button>
      <button type="button" role="menuitemradio" aria-checked={preference === "dark"} onClick={() => selectTheme("dark")}>다크 모드</button>
    </div>}
  </div>;
}
