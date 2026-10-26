import Link from "next/link";
import { PrefetchLink } from "@/components/prefetch-link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { formatPostDate, formatPostUpdatedLabel, postWasUpdated } from "@/lib/post-date";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";
import { SeriesWriteGate } from "@/components/series-admin-tools";
import { SeriesArticleManager } from "@/components/series-article-manager";

export const revalidate = 3600;

export function generateStaticParams() {
  return getSeries().map(({ id }) => ({ id }));
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = getSeries().find((item) => item.id === id);
  if (!series) notFound();
  const posts = getPosts().filter((post) => post.seriesId === id);

  return <><SiteHeader /><main className="series-page series-detail"><Link className="series-back" href="/series">아티클 시리즈</Link><header className="series-page-header"><p className="series-page-eyebrow">COLLECTION</p><h1>{series.name}</h1>{series.description && <p>{series.description}</p>}<SeriesWriteGate seriesId={series.id} /></header>
    <ol className="series-post-list">{posts.map((post, index) => <li key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><PrefetchLink href={`/posts/${post.id}`}><div className="series-post-copy"><small>{formatPostDate(post.date)}{postWasUpdated(post.publishedAt, post.updatedAt) && <> · {formatPostUpdatedLabel(post.updatedAt)}</>}</small><h2>{post.title}</h2>{post.description && <p>{post.description}</p>}</div>{post.thumbnail && <img className="series-post-thumbnail" src={post.thumbnail} alt="" />}</PrefetchLink></li>)}</ol>
    {posts.length === 0 && <p className="series-empty">아직 이 시리즈에 담긴 글이 없습니다.</p>}
    <SeriesArticleManager posts={posts} />
  </main></>;
}
