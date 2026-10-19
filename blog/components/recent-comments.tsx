import { getRecentComments } from "@/lib/recent-comments";
import type { PostMeta } from "@/lib/posts";
import { PrefetchLink } from "@/components/prefetch-link";

export function RecentCommentsFallback() {
  return (
    <aside className="recent-comments recent-comments-loading" aria-busy="true" aria-labelledby="recent-comments-title">
      <header><h2 id="recent-comments-title">최신 댓글</h2></header>
      <div className="recent-comments-placeholder" aria-hidden="true"><span /><span /></div>
      <span className="sr-only">최신 댓글을 불러오는 중입니다.</span>
    </aside>
  );
}

export async function RecentComments({ posts }: { posts: PostMeta[] }) {
  const comments = await getRecentComments();
  const postForComment = (value: string) => {
    const id = value.match(/(?:^|\/)posts?\/([^/?#]+)/)?.[1];
    const post = id ? posts.find((item) => item.id === id) : undefined;
    return { href: id ? `/posts/${id}` : "/", title: post?.title ?? value };
  };

  return <aside className="recent-comments" aria-labelledby="recent-comments-title"><header><h2 id="recent-comments-title">최신 댓글</h2></header>{comments.length === 0 ? <p className="recent-comments-empty">아직 댓글이 없습니다.</p> : <ul>{comments.map((comment) => { const post = postForComment(comment.postTitle); return <li key={comment.href}><PrefetchLink href={post.href}><div className="recent-comment-author">{comment.avatar ? <img src={comment.avatar} alt="" /> : <span>{comment.author.slice(0, 1)}</span>}<strong>{comment.author}</strong></div><p className="recent-comment-body">{comment.body}</p><small>{post.title}</small></PrefetchLink></li>; })}</ul>}</aside>;
}
