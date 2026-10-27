"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function PostCarousel({ children, slidesPerView = 1 }: { children: ReactNode; slidesPerView?: number | string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);
  const [atEnd, setAtEnd] = useState(true);
  const visible = [1, 2, 3].includes(Number(slidesPerView)) ? Number(slidesPerView) : 1;
  const sync = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const left = el.getBoundingClientRect().left;
    let nearest = 0; let distance = Infinity;
    Array.from(el.children).forEach((child, index) => { const delta = Math.abs(child.getBoundingClientRect().left - left); if (delta < distance) { distance = delta; nearest = index; } });
    setActive(nearest); setCount(el.children.length); setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);
  useEffect(() => {
    sync();
    const el = viewport.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, visible, sync]);
  const move = (delta: number) => {
    const el = viewport.current;
    if (!el) return;
    const target = Math.max(0, Math.min(el.children.length - 1, active + delta));
    const slide = el.children[target] as HTMLElement | undefined;
    if (slide) el.scrollTo({ left: el.scrollLeft + slide.getBoundingClientRect().left - el.getBoundingClientRect().left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return <section className="post-carousel" data-visible={visible} aria-label="이미지 캐러셀">
    <div className="post-carousel-viewport" ref={viewport} tabIndex={0} onScroll={sync}>
      {children}
    </div>
    <div className="post-carousel-controls"><button type="button" onClick={() => move(-1)} disabled={active === 0} aria-label="이전 사진">‹</button><span aria-live="polite">{count ? active + 1 : 0} / {count}</span><button type="button" onClick={() => move(1)} disabled={atEnd} aria-label="다음 사진">›</button></div>
  </section>;
}
