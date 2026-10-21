"use client";

import { useEffect, useId, useState } from "react";

let renderQueue: Promise<unknown> = Promise.resolve();

export function PostDiagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [result, setResult] = useState({ source: "", svg: "", error: "" });
  useEffect(() => {
    let cancelled = false;
    renderQueue = renderQueue.catch(() => {}).then(async () => {
      if (cancelled || !source.trim()) return;
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", suppressErrorRendering: true });
        const { svg } = await mermaid.render(`diagram${id}`, source);
        if (!cancelled) setResult({ source, svg, error: "" });
      } catch {
        if (!cancelled) setResult({ source, svg: "", error: "다이어그램 문법을 확인해 주세요." });
      }
    });
    return () => { cancelled = true; };
  }, [id, source]);
  if (result.source !== source || !result.svg) return <div className="slash-diagram"><pre>{source || "graph TD\n  A --> B"}</pre>{result.source === source && result.error && <p role="status">{result.error}</p>}</div>;
  // Mermaid's strict mode sanitizes generated SVG and disables interactive links.
  return <div className="slash-diagram" role="img" aria-label="다이어그램" dangerouslySetInnerHTML={{ __html: result.svg }} />;
}
