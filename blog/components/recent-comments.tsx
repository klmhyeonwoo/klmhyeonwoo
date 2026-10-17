import Link from "next/link";
import { getRecentComments } from "@/lib/recent-comments";
import { getPosts } from "@/lib/posts";

export async function RecentComments() {
  const comments = await getRecentComments();
  const posts = getPosts(true);
  const postForComment = (value: string) => {
    const id = value.match(/(?:^|\/)posts?\/([^/?#]+)/)?.[1];
    const post = id ? posts.find((item) => item.id === id) : undefined;
    return { href: id ? `/posts/${id}` : "/", title: post?.title ?? value };
  };

  return <aside className="recent-comments" aria-labelledby="recent-comments-title"><header><h2 id="recent-comments-title">최신 댓글</h2></header>{comments.length === 0 ? <p className="recent-comments-empty">아직 댓글이 없습니다.</p> : <ul>{comments.map((comment) => { const post = postForComment(comment.postTitle); return <li key={comment.href}><Link href={post.href}><div className="recent-comment-author">{comment.avatar ? <img src={comment.avatar} alt="" /> : <span>{comment.author.slice(0, 1)}</span>}<strong>{comment.author}</strong></div><p className="recent-comment-body">{comment.body}</p><small>{post.title}</small></Link></li>; })}</ul>}</aside>;
}
