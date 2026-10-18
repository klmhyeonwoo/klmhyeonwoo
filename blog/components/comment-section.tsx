"use client";

import { useEffect, useRef } from "react";

const utterancesRepository = process.env.NEXT_PUBLIC_UTTERANCES_REPO ?? "klmhyeonwoo/klmhyeonwoo";
const giscus = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
};
const hasGiscusConfiguration = Object.values(giscus).every(Boolean);

function currentTheme(provider: "giscus" | "utterances") {
  const dark = document.documentElement.dataset.theme === "dark";
  return provider === "giscus" ? (dark ? "dark" : "light") : (dark ? "github-dark" : "github-light");
}

/** Prefers Giscus when configured while keeping existing Issue threads as a fallback. */
export function CommentSection() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const provider = hasGiscusConfiguration ? "giscus" : "utterances";
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";

    if (provider === "giscus") {
      script.src = "https://giscus.app/client.js";
      script.setAttribute("data-repo", giscus.repo!);
      script.setAttribute("data-repo-id", giscus.repoId!);
      script.setAttribute("data-category", giscus.category!);
      script.setAttribute("data-category-id", giscus.categoryId!);
      script.setAttribute("data-mapping", "pathname");
      script.setAttribute("data-strict", "0");
      script.setAttribute("data-reactions-enabled", "1");
      script.setAttribute("data-emit-metadata", "0");
      script.setAttribute("data-input-position", "bottom");
      script.setAttribute("data-theme", currentTheme(provider));
      script.setAttribute("data-lang", "ko");
    } else {
      script.src = "https://utteranc.es/client.js";
      script.setAttribute("repo", utterancesRepository);
      script.setAttribute("issue-term", "pathname");
      script.setAttribute("label", "blog-comment");
      script.setAttribute("theme", currentTheme(provider));
    }
    container.current?.replaceChildren();
    container.current?.appendChild(script);

    const syncTheme = () => {
      if (provider === "giscus") {
        const frame = container.current?.querySelector<HTMLIFrameElement>(".giscus-frame");
        frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: currentTheme(provider) } } }, "https://giscus.app");
        return;
      }
      const frame = container.current?.querySelector<HTMLIFrameElement>(".utterances-frame");
      frame?.contentWindow?.postMessage({ type: "set-theme", theme: currentTheme(provider) }, "https://utteranc.es");
    };
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="comments" aria-label="댓글"><div ref={container} /></section>
  );
}
