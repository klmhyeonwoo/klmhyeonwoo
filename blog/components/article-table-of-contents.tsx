"use client";

import { useEffect, useState } from "react";
import type { TableOfContentsItem } from "@/lib/table-of-contents";

export function ArticleTableOfContents({ items }: { items: TableOfContentsItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => heading !== null);
    if (headings.length === 0) return;

    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      const current = headings.filter((heading) => heading.getBoundingClientRect().top <= 132).at(-1) ?? headings[0];
      setActiveId(current.id);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [items]);

  return <nav aria-label="본문 목차" className="article-toc">
    <p>목차</p>
    <ol>
      {items.map((item) => <li className={`level-${item.level}`} key={item.id}>
        <a aria-current={activeId === item.id ? "location" : undefined} href={`#${item.id}`}>{item.title}</a>
      </li>)}
    </ol>
  </nav>;
}
