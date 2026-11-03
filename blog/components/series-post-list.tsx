import { formatPostDate, formatPostUpdatedLabel, postWasUpdated } from "@/lib/post-date";
import type { PostMeta } from "@/lib/posts";
import { PrefetchLink } from "@/components/prefetch-link";
import { SeriesArticleManager } from "@/components/series-article-manager";

export function SeriesPostList({ posts }: { posts: PostMeta[] }) {
  return <>
    <ol className="series-post-list">{posts.map((post, index) => <li key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><PrefetchLink href={`/posts/${post.id}`}><div className="series-post-copy"><small>{formatPostDate(post.date)}{postWasUpdated(post.publishedAt, post.updatedAt) && <> · {formatPostUpdatedLabel(post.updatedAt)}</>}</small><h2>{post.title}{post.isPrivate && <> <span aria-label="비공개 글">🔒</span></>}</h2>{post.description && <p>{post.description}</p>}</div>{post.thumbnail && <img className="series-post-thumbnail" src={post.thumbnail} alt="" />}</PrefetchLink></li>)}</ol>
    {posts.length === 0 && <p className="series-empty">아직 이 시리즈에 담긴 글이 없습니다.</p>}
    <SeriesArticleManager posts={posts} />
  </>;
}
