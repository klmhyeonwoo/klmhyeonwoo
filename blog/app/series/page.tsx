import { SeriesLibrary } from "@/components/series-library";
import { SeriesCreateGate, SeriesEmptyMessage } from "@/components/series-admin-tools";
import { SiteHeader } from "@/components/site-header";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아티클 시리즈",
  description: "주제별로 이어지는 wavy studio의 아티클 컬렉션입니다.",
  alternates: { canonical: "/series" },
  openGraph: { title: "아티클 시리즈", description: "주제별로 이어지는 wavy studio의 아티클 컬렉션입니다.", url: "/series", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "wavy studio 아티클 시리즈" }] },
};

export const revalidate = 3600;

export default async function SeriesPage() {
  const posts = getPosts();
  const series = getSeries();
  const postCounts = Object.fromEntries(series.map((item) => [item.id, posts.filter((post) => post.seriesId === item.id).length]));

  return <><SiteHeader /><main className="series-page"><header className="series-page-header"><p className="series-page-eyebrow">COLLECTIONS</p><h1>아티클 시리즈</h1><p>주제별로 이어지는 기록을 한 권씩 꺼내 읽어보세요.</p></header>
    {series.length > 0 ? <SeriesLibrary series={series} postCounts={postCounts}><SeriesCreateGate series={series} /></SeriesLibrary> : <><SeriesLibrary series={series} postCounts={postCounts}><SeriesCreateGate series={series} /></SeriesLibrary><SeriesEmptyMessage /></>}
  </main></>;
}
