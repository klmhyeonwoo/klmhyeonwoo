"use client";

import { Button } from "@base-ui/react/button";
import { useEffect, useState } from "react";
import { IconMoonLine, IconSunLine } from "@karrotmarket/react-monochrome-icon";

type Theme = "light" | "dark";

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("theme", theme);
}

export function ThemeToggle() {
  const [theme, setCurrentTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const nextTheme: Theme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setCurrentTheme(nextTheme);
    setTheme(nextTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    setTheme(nextTheme);
  }

  return <Button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}>{theme === "dark" ? <IconSunLine size={18} /> : <IconMoonLine size={18} />}</Button>;
}
