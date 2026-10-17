"use client";

import { useEffect, useRef } from "react";

const repository = process.env.NEXT_PUBLIC_UTTERANCES_REPO ?? "klmhyeonwoo/klmhyeonwoo";
const utterancesOrigin = "https://utteranc.es";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "github-dark" : "github-light";
}

export function CommentSection() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `${utterancesOrigin}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("repo", repository);
    script.setAttribute("issue-term", "pathname");
    script.setAttribute("label", "blog-comment");
    script.setAttribute("theme", currentTheme());
    container.current?.appendChild(script);

    const syncTheme = () => {
      const frame = container.current?.querySelector<HTMLIFrameElement>(".utterances-frame");
      frame?.contentWindow?.postMessage({ type: "set-theme", theme: currentTheme() }, utterancesOrigin);
    };
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="comments" aria-label="댓글"><div ref={container} /></section>
  );
}
