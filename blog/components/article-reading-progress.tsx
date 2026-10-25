"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Props = { title: string };
type ReadingState = { progress: number; isWithinArticle: boolean };

function getReadingState(): ReadingState {
  const article = document.querySelector<HTMLElement>("[data-reading-content]");
  if (!article) return { progress: 0, isWithinArticle: false };

  const bounds = article.getBoundingClientRect();
  const top = bounds.top + window.scrollY;
  const height = Math.max(article.offsetHeight, 1);
  const readerPosition = window.scrollY + Math.min(window.innerHeight * 0.26, 200);
  return {
    progress: Math.max(0, Math.min(100, ((readerPosition - top) / height) * 100)),
    // Keep the indicator with the article itself instead of leaving it on
    // screen while readers have moved into the author card or comments.
    isWithinArticle: bounds.top < window.innerHeight * 0.72 && bounds.bottom > window.innerHeight * 0.28,
  };
}

export function ArticleReadingProgress({ title }: Props) {
  const [progress, setProgress] = useState(0);
  const [isWithinArticle, setIsWithinArticle] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimer = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const nextState = getReadingState();
      setProgress((currentProgress) => Math.abs(currentProgress - nextState.progress) >= 0.1 ? nextState.progress : currentProgress);
      setIsWithinArticle((currentState) => currentState === nextState.isWithinArticle ? currentState : nextState.isWithinArticle);
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = window.setTimeout(() => setIsScrolling(false), 160);
      requestUpdate();
    };
    const article = document.querySelector<HTMLElement>("[data-reading-content]");
    const observer = article ? new ResizeObserver(requestUpdate) : null;

    observer?.observe(article!);
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

  const visible = isWithinArticle && progress > 0.1;
  const roundedProgress = Math.round(progress);
  return <>
    <div className={`article-scroll-veil article-scroll-veil-top${isScrolling ? " is-scrolling" : ""}`} aria-hidden="true" />
    <div className={`article-scroll-veil article-scroll-veil-bottom${isScrolling ? " is-scrolling" : ""}`} aria-hidden="true" />
    <aside className={`article-reading-progress${visible ? " is-visible" : ""}`} aria-label="읽기 진행률">
      <span className="article-reading-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundedProgress} style={{ "--reading-progress": progress.toFixed(2) } as CSSProperties}>
        <span>{roundedProgress}</span>
      </span>
      <span className="article-reading-label"><b>{title}</b> 읽는 중</span>
    </aside>
  </>;
}
