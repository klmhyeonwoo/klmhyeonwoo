import { compileMDX } from "next-mdx-remote/rsc";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PostAdminActions } from "@/components/post-admin-actions";
import { PostUnlockForm } from "@/components/post-unlock-form";
import { CommentSection } from "@/components/comment-section";
import { isAdmin } from "@/lib/auth";
import { hasPostAccess } from "@/lib/post-access";
import { formatPostDate } from "@/lib/post-date";
import { getPost, getPosts } from "@/lib/posts";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return getPosts().map(({ id }) => ({ id }));
}

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const source = getPost(id);
  if (!source) notFound();
  const authenticated = await isAdmin();
  const profile = getProfile();
  const { data } = matter(source);
  const passwordHash = typeof data.passwordHash === "string" ? data.passwordHash : null;

  if (data.private === true && !authenticated && (!passwordHash || !(await hasPostAccess(id, passwordHash)))) {
    return <><SiteHeader /><main className="article-shell"><PostUnlockForm id={id} /></main></>;
  }

  const { content, frontmatter } = await compileMDX<{ title: string; date: string; description?: string }>({ source, options: { parseFrontmatter: true } });
  return (
    <><SiteHeader /><main className="article-shell"><article className="article">
      <div className="author-byline">{profile.image ? <img src={profile.image} alt="" /> : <span>{profile.name.slice(0, 1)}</span>}<p><strong>{profile.name}</strong><small>{formatPostDate(frontmatter.date)}</small></p></div><h1>{frontmatter.title}</h1>
      {frontmatter.description && <p className="lede">{frontmatter.description}</p>}
      <div className="prose">{content}</div>
      {authenticated && <PostAdminActions id={id} title={frontmatter.title} />}
      <CommentSection />
    </article></main></>
  );
}
