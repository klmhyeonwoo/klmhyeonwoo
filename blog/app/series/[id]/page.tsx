import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";
import { SeriesWriteGate } from "@/components/series-admin-tools";
import { SeriesPostList } from "@/components/series-post-list";
import { SeriesMetadataEditor } from "@/components/series-metadata-editor";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export function generateStaticParams() {
  return getSeries().map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const series = getSeries().find((item) => item.id === id);
  if (!series) return {};
  const title = series.name;
  const description = series.description || `${series.name}에 담긴 아티클을 모아봅니다.`;
  const image = `/series/${id}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: `/series/${id}` },
    openGraph: { title, description, url: `/series/${id}`, type: "website", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = getSeries().find((item) => item.id === id);
  if (!series) notFound();
  const posts = getPosts(true).filter((post) => post.seriesId === id);
  const seriesSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: series.name,
    description: series.description || undefined,
    url: absoluteUrl(`/series/${id}`),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.filter((post) => !post.isPrivate).map((post, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(`/posts/${post.id}`), name: post.title })),
    },
  };

  return <><SiteHeader /><main className="series-page series-detail"><Link className="series-back" href="/series">아티클 시리즈</Link><header className="series-page-header"><p className="series-page-eyebrow">COLLECTION</p><h1>{series.name}</h1>{series.description && <p>{series.description}</p>}<SeriesWriteGate seriesId={series.id} /><SeriesMetadataEditor series={series} /></header>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesSchema).replace(/</g, "\\u003c") }} />
    <SeriesPostList posts={posts} />
  </main></>;
}
