"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Props = { title: string };
type ReadingState = { progress: number; isWithinArticle: boolean; left: number; width: number };

function getReadingState(): ReadingState {
  const article = document.querySelector<HTMLElement>("[data-reading-content]");
  if (!article) return { progress: 0, isWithinArticle: false, left: 0, width: 0 };

  const bounds = article.getBoundingClientRect();
  const top = bounds.top + window.scrollY;
  const height = Math.max(article.offsetHeight, 1);
  const readerPosition = window.scrollY + Math.min(window.innerHeight * 0.26, 200);
  return {
    progress: Math.max(0, Math.min(100, ((readerPosition - top) / height) * 100)),
    // Keep the indicator with the article itself instead of leaving it on
    // screen while readers have moved into the author card or comments.
    isWithinArticle: bounds.top < window.innerHeight * 0.72 && bounds.bottom > window.innerHeight * 0.28,
    left: bounds.left,
    width: bounds.width,
  };
}

export function ArticleReadingProgress({ title }: Props) {
  const [progress, setProgress] = useState(0);
  const [isWithinArticle, setIsWithinArticle] = useState(false);
  const [readingColumn, setReadingColumn] = useState({ left: 0, width: 0 });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const nextState = getReadingState();
      setProgress((currentProgress) => Math.abs(currentProgress - nextState.progress) >= 0.1 ? nextState.progress : currentProgress);
      setIsWithinArticle((currentState) => currentState === nextState.isWithinArticle ? currentState : nextState.isWithinArticle);
      setReadingColumn((currentColumn) => Math.abs(currentColumn.left - nextState.left) < 0.5 && Math.abs(currentColumn.width - nextState.width) < 0.5
        ? currentColumn
        : { left: nextState.left, width: nextState.width });
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const article = document.querySelector<HTMLElement>("[data-reading-content]");
    const observer = article ? new ResizeObserver(requestUpdate) : null;

    observer?.observe(article!);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const visible = isWithinArticle && progress > 0.1;
  const hasPassedContent = isWithinArticle && progress > 3;
  const roundedProgress = Math.round(progress);
  const veilStyle = {
    "--reading-column-left": `${readingColumn.left}px`,
    "--reading-column-width": `${readingColumn.width}px`,
  } as CSSProperties;
  return <>
    <div className={`article-scroll-veil article-scroll-veil-top${hasPassedContent ? " is-visible" : ""}`} style={veilStyle} aria-hidden="true" />
    <aside className={`article-reading-progress${visible ? " is-visible" : ""}`} aria-label="읽기 진행률">
      <span className="article-reading-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundedProgress} style={{ "--reading-progress": progress.toFixed(2) } as CSSProperties}>
        <span>{roundedProgress}</span>
      </span>
      <span className="article-reading-label"><b>{title}</b> 읽는 중</span>
    </aside>
  </>;
}
