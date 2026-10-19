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
import { ArticleTableOfContents } from "@/components/article-table-of-contents";
import { isAdmin } from "@/lib/auth";
import { hasPostAccess } from "@/lib/post-access";
import { formatPostDate, formatPostUpdatedLabel, postPublishedAtValue, postWasUpdated } from "@/lib/post-date";
import { getPost, getPostBlocks, getPosts } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { restoreCallouts } from "@/lib/callout-markdown";
import { restoreBookmarks } from "@/lib/bookmark-markdown";
import { PostBookmark } from "@/components/post-bookmark";
import { PostGallery } from "@/components/post-gallery";
import { PostColumn, PostColumns } from "@/components/post-columns";
import { getTableOfContents, rehypeHeadingIds } from "@/lib/table-of-contents";
import { absoluteUrl } from "@/lib/site-url";

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
  const post = getPosts(true).find((item) => item.id === id);
  const profile = getProfile();
  const postTitle = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "글";
  const isPrivate = data.private === true;
  if (isPrivate) {
    return {
      title: "비공개 글",
      description: "비공개 글입니다.",
      robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
    };
  }

  const title = `${postTitle} | wavy studio`;
  const description = postDescription(source, data) || `${postTitle}에 관한 글입니다.`;
  const canonical = `/posts/${id}`;
  const publishedTime = postPublishedAtValue(data.publishedAt ?? data.date);
  const modifiedTime = postPublishedAtValue(data.updatedAt) ?? publishedTime;
  // Social platforms cache OG images aggressively. Tie the image URL to the
  // last published revision so an edited title or description gets a fresh
  // share preview without weakening the image route's own caching.
  const image = `${canonical}/opengraph-image?v=${encodeURIComponent(modifiedTime ?? postTitle)}`;
  const keywords = [post?.category, post?.series].filter((value): value is string => Boolean(value));

  return {
    title,
    description,
    keywords,
    authors: [{ name: profile.name, url: absoluteUrl("/profile") }],
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      title,
      description,
      url: canonical,
      siteName: "wavy studio",
      publishedTime,
      modifiedTime,
      authors: [profile.name],
      section: post?.category,
      tags: keywords,
      images: [{ url: image, width: 1200, height: 630, alt: postTitle }],
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

  const blocks = getPostBlocks(id);
  const renderSource = restoreBookmarks(restoreCallouts(source, blocks), blocks);
  const tableOfContents = getTableOfContents(renderSource);
  const { content, frontmatter } = await compileMDX<{ title: string; date: string; description?: string; publishedAt?: string; updatedAt?: string }>({ components: { Callout: PostCallout, Bookmark: PostBookmark, Gallery: PostGallery, Columns: PostColumns, Column: PostColumn }, source: renderSource, options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [[rehypeShiki, { themes: { light: "github-light", dark: "github-dark" } }], rehypeHeadingIds(tableOfContents)] }, parseFrontmatter: true } });
  const post = getPosts(true).find((item) => item.id === id);
  const description = postDescription(source, data) || `${frontmatter.title}에 관한 글입니다.`;
  const canonicalUrl = absoluteUrl(`/posts/${id}`);
  const publishedAt = postPublishedAtValue(frontmatter.publishedAt ?? frontmatter.date);
  const updatedAt = postPublishedAtValue(frontmatter.updatedAt) ?? publishedAt;
  const schemaKeywords = [post?.category, post?.series].filter((value): value is string => Boolean(value));
  const articleSchema = data.private === true ? null : {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: frontmatter.title,
    description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    inLanguage: "ko-KR",
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    ...(post?.category ? { articleSection: post.category } : {}),
    ...(schemaKeywords.length > 0 ? { keywords: schemaKeywords.join(", ") } : {}),
    author: { "@type": "Person", name: profile.name, url: absoluteUrl("/profile"), ...(profile.image ? { image: absoluteUrl(profile.image) } : {}) },
    publisher: { "@type": "Organization", name: "wavy studio", url: absoluteUrl("/") },
    image: [absoluteUrl(`/posts/${id}/opengraph-image`)],
  };
  return (
    <><SiteHeader /><main className="article-shell"><article className={`article${tableOfContents.length > 0 ? " article-with-toc" : ""}`}>
      {articleSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} />}
      <header className="article-header"><h1>{frontmatter.title}</h1>
        <div className="article-meta-row"><div className="author-byline">{profile.image ? <img src={profile.image} alt="" /> : <span>{profile.name.slice(0, 1)}</span>}<p><strong>{profile.name}</strong><small>{formatPostDate(frontmatter.date)}{postWasUpdated(frontmatter.publishedAt ?? frontmatter.date, frontmatter.updatedAt) && <> · {formatPostUpdatedLabel(frontmatter.updatedAt)}</>}</small></p></div><PostLinkCopy /></div>
        {frontmatter.description && <p className="lede">{frontmatter.description}</p>}
      </header>
      <div className="article-content-layout">{tableOfContents.length > 0 && <ArticleTableOfContents items={tableOfContents} />}<PostContent>{content}</PostContent></div>
      {authenticated && <PostAdminActions id={id} title={frontmatter.title} />}
      <CommentSection />
    </article></main></>
  );
}
