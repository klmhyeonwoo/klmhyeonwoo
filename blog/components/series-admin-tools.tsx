"use client";

import Link from "next/link";
import type { Series } from "@/lib/series";
import { useAdminSession } from "./admin-session";
import { SeriesCreate } from "./series-create";

export function SeriesCreateGate({ series }: { series: Series[] }) {
  const { authenticated } = useAdminSession();
  return authenticated === true ? <SeriesCreate series={series} /> : null;
}

export function SeriesWriteGate({ seriesId }: { seriesId: string }) {
  const { authenticated } = useAdminSession();
  return authenticated === true ? <Link className="series-write" href={`/ykk?series=${seriesId}`}>이 시리즈에 글 쓰기</Link> : null;
}

export function SeriesEmptyMessage() {
  const { authenticated } = useAdminSession();
  return authenticated === true ? null : <p className="series-empty">아직 만든 아티클 시리즈가 없습니다.</p>;
}
