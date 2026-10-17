"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent, type ReactNode, useState } from "react";
import type { Series } from "@/lib/series";

type Props = { series: Series[]; postCounts: Record<string, number>; children?: ReactNode };

export function SeriesLibrary({ series, postCounts, children }: Props) {
  const router = useRouter();
  const [openingId, setOpeningId] = useState<string | null>(null);

  function openSeries(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    setOpeningId(id);
    window.setTimeout(() => router.push(`/series/${id}`), 420);
  }

  return <section className="series-grid" aria-label="아티클 시리즈 목록">{series.map((item) => (
    <Link className={`series-card ${openingId === item.id ? "is-opening" : ""}`} href={`/series/${item.id}`} key={item.id} onClick={(event) => openSeries(event, item.id)}>
      <div className="series-book" aria-hidden="true"><div className="series-book-spine" /><div className="series-book-cover">{item.coverImage ? <img src={item.coverImage} alt="" /> : <span>{item.name.slice(0, 1)}</span>}</div><div className="series-book-pages" /></div>
      <h2>{item.name}</h2>
      {item.description && <p>{item.description}</p>}
      <small>아티클 {postCounts[item.id] ?? 0}개</small>
    </Link>
  ))}{children}</section>;
}
