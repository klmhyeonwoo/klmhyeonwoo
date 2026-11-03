"use client";

import { createElement, useEffect, useState, type ReactNode } from "react";

type Token = { type: string; value?: string; tagName?: string; properties?: { className?: string[] }; children?: Token[] };

let highlighter: Promise<ReturnType<typeof import("lowlight").createLowlight>> | undefined;
function loadHighlighter() {
  if (!highlighter) {
    highlighter = import("lowlight").then(({ common, createLowlight }) => createLowlight(common)).catch((error) => {
      highlighter = undefined;
      throw error;
    });
  }
  return highlighter;
}

function renderToken(token: Token, key: number): ReactNode {
  if (token.type === "text") return token.value;
  if (token.type !== "element" || token.tagName !== "span") return null;
  return createElement("span", { key, className: token.properties?.className?.join(" ") }, token.children?.map(renderToken));
}

export function PrivatePostCode({ children, className }: { children?: ReactNode; className?: string }) {
  const source = typeof children === "string" ? children : null;
  const language = className?.match(/(?:^|\s)language-([^\s]+)/)?.[1];
  const [highlighted, setHighlighted] = useState<{ source: string; language: string; tokens: Token[] } | null>(null);

  useEffect(() => {
    if (source === null || !language) return;
    let cancelled = false;
    void loadHighlighter().then((lowlight) => {
      if (cancelled) return;
      if (!lowlight.registered(language)) return;
      const result = lowlight.highlight(language, source);
      setHighlighted({ source, language, tokens: result.children as Token[] });
    }).catch(() => {
      // Keep the original readable code when a language or chunk is unavailable.
    });
    return () => { cancelled = true; };
  }, [language, source]);

  const tokens = highlighted?.source === source && highlighted.language === language ? highlighted.tokens : null;
  return <code className={[className, tokens ? "private-code-highlight" : ""].filter(Boolean).join(" ") || undefined}>{tokens ? tokens.map(renderToken) : children}</code>;
}
