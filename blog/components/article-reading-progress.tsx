"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Props = { title: string };

function getReadingProgress() {
  const article = document.querySelector<HTMLElement>("[data-reading-content]");
  if (!article) return 0;

  const top = article.getBoundingClientRect().top + window.scrollY;
  const height = Math.max(article.offsetHeight, 1);
  const readerPosition = window.scrollY + Math.min(window.innerHeight * 0.26, 200);
  return Math.max(0, Math.min(100, ((readerPosition - top) / height) * 100));
}

export function ArticleReadingProgress({ title }: Props) {
  const [progress, setProgress] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null);
  const lastScrollY = useRef(0);
  const scrollEndTimer = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const nextProgress = getReadingProgress();
      setProgress((currentProgress) => Math.abs(currentProgress - nextProgress) >= 0.1 ? nextProgress : currentProgress);
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      const distance = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      if (Math.abs(distance) < 2) return;
      setScrollDirection(distance > 0 ? "down" : "up");
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = window.setTimeout(() => setScrollDirection(null), 180);
    };
    const handleScroll = () => {
      updateScrollDirection();
      requestUpdate();
    };
    const article = document.querySelector<HTMLElement>("[data-reading-content]");
    const observer = article ? new ResizeObserver(requestUpdate) : null;

    observer?.observe(article!);
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();
    return () => {
      cancelAnimationFrame(frame);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
      observer?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const visible = progress > 0.1;
  const roundedProgress = Math.round(progress);
  return <>
    <div className={`article-scroll-veil${scrollDirection ? ` is-scrolling is-scrolling-${scrollDirection}` : ""}`} aria-hidden="true" />
    <aside className={`article-reading-progress${visible ? " is-visible" : ""}`} aria-label="읽기 진행률">
      <span className="article-reading-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundedProgress} style={{ "--reading-progress": progress.toFixed(2) } as CSSProperties}>
        <span>{roundedProgress}</span>
      </span>
      <span className="article-reading-label"><b>{title}</b> 읽는 중</span>
    </aside>
  </>;
}
