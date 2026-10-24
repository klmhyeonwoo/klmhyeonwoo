"use client";

import { useEffect } from "react";

function applySystemTheme(mediaQuery: MediaQueryList) {
  document.documentElement.dataset.theme = mediaQuery.matches ? "dark" : "light";
}

/** Keeps the document in sync with the operating system color preference. */
export function SystemThemeSync() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => applySystemTheme(mediaQuery);

    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  return null;
}
