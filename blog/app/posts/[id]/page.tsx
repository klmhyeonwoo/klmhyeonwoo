import { compileMDX } from "next-mdx-remote/rsc";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PostAdminActions } from "@/components/post-admin-actions";
import { PostUnlockForm } from "@/components/post-unlock-form";
import { CommentSection } from "@/components/comment-section";
import { PostCallout } from "@/components/post-callout";
import { PostContent } from "@/components/post-content";
import { PostLinkCopy } from "@/components/post-link-copy";
import { isAdmin } from "@/lib/auth";
import { hasPostAccess } from "@/lib/post-access";
import { formatPostDate, formatPostUpdatedLabel, postWasUpdated } from "@/lib/post-date";
import { getPost, getPostBlocks, getPosts } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { restoreCallouts } from "@/lib/callout-markdown";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function postDescription(source: string, data: Record<string, unknown>) {
  if (typeof data.description === "string" && data.description.trim()) return data.description.trim();
  const text = source
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const source = getPost(id);
  if (!source) return {};

  const { data } = matter(source);
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "글";
  const isPrivate = data.private === true;
  const description = isPrivate
    ? "비공개 글입니다. bloging.에서 확인해 주세요."
    : postDescription(source, data);
  const image = `/posts/${id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      locale: "ko_KR",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

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

  const renderSource = restoreCallouts(source, getPostBlocks(id));
  const { content, frontmatter } = await compileMDX<{ title: string; date: string; description?: string; publishedAt?: string; updatedAt?: string }>({ components: { Callout: PostCallout }, source: renderSource, options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [[rehypeShiki, { themes: { light: "github-light", dark: "github-dark" } }]] }, parseFrontmatter: true } });
  return (
    <><SiteHeader /><main className="article-shell"><article className="article">
      <header className="article-header"><h1>{frontmatter.title}</h1>
        <div className="article-meta-row"><div className="author-byline">{profile.image ? <img src={profile.image} alt="" /> : <span>{profile.name.slice(0, 1)}</span>}<p><strong>{profile.name}</strong><small>{formatPostDate(frontmatter.date)}{postWasUpdated(frontmatter.publishedAt ?? frontmatter.date, frontmatter.updatedAt) && <> · {formatPostUpdatedLabel(frontmatter.updatedAt)}</>}</small></p></div><PostLinkCopy /></div>
        {frontmatter.description && <p className="lede">{frontmatter.description}</p>}
      </header>
      <PostContent>{content}</PostContent>
      {authenticated && <PostAdminActions id={id} title={frontmatter.title} />}
      <CommentSection />
    </article></main></>
  );
}
