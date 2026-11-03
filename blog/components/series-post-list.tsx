"use client";

import { useEffect, useState } from "react";
import { formatPostDate, formatPostUpdatedLabel, postWasUpdated } from "@/lib/post-date";
import type { PostMeta } from "@/lib/posts";
import { useAdminSession } from "@/components/admin-session";
import { PrefetchLink } from "@/components/prefetch-link";
import { SeriesArticleManager } from "@/components/series-article-manager";

export function SeriesPostList({ seriesId, posts }: { seriesId: string; posts: PostMeta[] }) {
  const { authenticated } = useAdminSession();
  const [hidden, setHidden] = useState<{ seriesId: string; posts: PostMeta[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authenticated !== true) return;
    const controller = new AbortController();
    void fetch(`/api/series/${encodeURIComponent(seriesId)}/hidden-posts`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load hidden posts");
        return response.json() as Promise<{ posts: PostMeta[] }>;
      })
      .then((result) => { if (!controller.signal.aborted) { setHidden({ seriesId, posts: result.posts }); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [authenticated, seriesId]);

  const privatePosts = authenticated === true && hidden?.seriesId === seriesId ? hidden.posts : [];
  const combined = [...posts, ...privatePosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.date.localeCompare(a.date));
  return <>
    <ol className="series-post-list">{combined.map((post, index) => <li key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><PrefetchLink href={`/posts/${post.id}`}><div className="series-post-copy"><small>{formatPostDate(post.date)}{postWasUpdated(post.publishedAt, post.updatedAt) && <> · {formatPostUpdatedLabel(post.updatedAt)}</>}</small><h2>{post.title}{post.isPrivate && <> <span aria-label="비공개 글">🔒</span></>}</h2>{post.description && <p>{post.description}</p>}</div>{post.thumbnail && <img className="series-post-thumbnail" src={post.thumbnail} alt="" />}</PrefetchLink></li>)}</ol>
    {combined.length === 0 && <p className="series-empty">아직 이 시리즈에 담긴 글이 없습니다.</p>}
    {authenticated === true && error && <p role="status">숨겨진 비공개 글을 불러오지 못했습니다. 새로고침해 주세요.</p>}
    <SeriesArticleManager key={combined.map((post) => post.id).join(":")} posts={combined} />
  </>;
}
