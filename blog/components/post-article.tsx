import { compileMDX } from "next-mdx-remote/rsc";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { SiteHeader } from "@/components/site-header";
import { PostAdminActions } from "@/components/post-admin-actions";
import { CommentSection } from "@/components/comment-section";
import { PostCallout } from "@/components/post-callout";
import { PostDiagram } from "@/components/post-diagram";
import { PostContent } from "@/components/post-content";
import { PostLinkCopy } from "@/components/post-link-copy";
import { ArticleTableOfContents } from "@/components/article-table-of-contents";
import { ArticleReadingProgress } from "@/components/article-reading-progress";
import { formatPostDate, formatPostUpdatedLabel, postPublishedAtValue, postWasUpdated } from "@/lib/post-date";
import { getCachedPosts } from "@/lib/post-cache";
import { getPostBlocks } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { restoreCallouts } from "@/lib/callout-markdown";
import { restoreBookmarks } from "@/lib/bookmark-markdown";
import { PostBookmark } from "@/components/post-bookmark";
import { PostGallery } from "@/components/post-gallery";
import { remarkPostImages } from "@/lib/remark-post-images";
import { PostCarousel } from "@/components/post-carousel";
import { PostImage } from "@/components/post-image";
import { PostColumn, PostColumns } from "@/components/post-columns";
import { getTableOfContents, rehypeHeadingIds } from "@/lib/table-of-contents";
import { absoluteUrl } from "@/lib/site-url";
import { convertBlocks, markdownFor } from "@/lib/slash-content";
import { postExcerpt } from "@/lib/post-excerpt";

import { shortPostId } from "@/lib/short-post-id";
import { createHash } from "node:crypto";
import { PrivatePostCode } from "@/components/private-post-code";

// Load only the grammars posts actually use. The plugin default registers every
// bundled language (hundreds of grammars) on each cold start, which dominated
// Fluid Active CPU. Any other language is loaded lazily on demand.
const shikiLanguages = ["javascript", "typescript", "jsx", "tsx", "json", "html", "css", "scss", "vue", "bash", "shell", "yaml", "markdown", "diff", "python", "sql", "java", "kotlin", "go", "rust", "c", "cpp", "xml", "ini", "toml", "dockerfile", "graphql"];
const shikiOptions = { themes: { light: "github-light", dark: "github-dark" }, langs: shikiLanguages, lazy: true, fallbackLanguage: "text" } as const;

type ArticleFrontmatter = { title: string; date: string; description?: string; publishedAt?: string; updatedAt?: string };
type CompiledArticle = {
  content: React.ReactElement;
  frontmatter: ArticleFrontmatter;
  tableOfContents: ReturnType<typeof getTableOfContents>;
};

// This cache lives only in one server instance, never in a shared HTTP cache.
// Bounded entries and input size limit the memory retained by private content.
const privateArticleCache = new Map<string, Promise<CompiledArticle>>();
const maxPrivateArticles = 8;
const maxCachedSourceBytes = 256 * 1024;

async function compileArticle(source: string, isPrivate = false): Promise<CompiledArticle> {
  const tableOfContents = getTableOfContents(source);
  const { content, frontmatter } = await compileMDX<ArticleFrontmatter>({ components: { Diagram: PostDiagram, Callout: PostCallout, Bookmark: PostBookmark, Gallery: PostGallery, PostCarousel, PostImage, img: PostImage, Columns: PostColumns, Column: PostColumn, ...(isPrivate ? { code: PrivatePostCode } : {}) }, source, options: { mdxOptions: { remarkPlugins: [remarkGfm, remarkPostImages], rehypePlugins: isPrivate ? [rehypeHeadingIds(tableOfContents)] : [[rehypeShiki, shikiOptions], rehypeHeadingIds(tableOfContents)] }, parseFrontmatter: true } });
  return { content, frontmatter, tableOfContents };
}

function compilePrivateArticle(source: string): Promise<CompiledArticle> {
  if (Buffer.byteLength(source, "utf8") > maxCachedSourceBytes) return compileArticle(source, true);
  const key = createHash("sha256").update(source).digest("hex");
  const cached = privateArticleCache.get(key);
  if (cached) {
    privateArticleCache.delete(key);
    privateArticleCache.set(key, cached);
    return cached;
  }

  const pending = compileArticle(source, true);
  privateArticleCache.set(key, pending);
  if (privateArticleCache.size > maxPrivateArticles) privateArticleCache.delete(privateArticleCache.keys().next().value!);
  void pending.catch(() => {
    if (privateArticleCache.get(key) === pending) privateArticleCache.delete(key);
  });
  return pending;
}

function postDescription(source: string, data: Record<string, unknown>) {
  if (typeof data.description === "string" && data.description.trim()) return postExcerpt(data.description) ?? "";
  return postExcerpt(matter(source).content) ?? "";
}

/**
 * Older saves can contain editor JSON while their MDX projection is empty.
 * Render from that JSON rather than presenting a blank published article.
 * New saves always persist both representations in the publish route.
 */
function sourceWithEditorFallback(source: string, blocks: unknown[]) {
  source = source.replace(/<div style=\{\{textAlign:\s*"(center|right)"\}\}>/g, '<div data-text-align="$1">');
  const parsed = matter(source);
  if (parsed.content.trim() || blocks.length === 0) return source;
  const body = markdownFor(convertBlocks(blocks));
  return body.trim() ? matter.stringify(body, parsed.data) : source;
}

export async function PostArticle({ id, source }: { id: string; source: string }) {
  const profile = getProfile();
  const { data } = matter(source);
  const blocks = getPostBlocks(id);
  const renderSource = restoreBookmarks(restoreCallouts(sourceWithEditorFallback(source, blocks), blocks), blocks);
  const { content, frontmatter, tableOfContents } = await (data.private === true ? compilePrivateArticle(renderSource) : compileArticle(renderSource));
  const post = (await getCachedPosts(true)).find((item) => item.id === id);
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
        <div className="article-meta-row"><div className="author-byline">{profile.image ? <img src={profile.image} alt="" /> : <span>{profile.name.slice(0, 1)}</span>}<p><strong>{profile.name}</strong><small>{formatPostDate(frontmatter.date)}{postWasUpdated(frontmatter.publishedAt ?? frontmatter.date, frontmatter.updatedAt) && <> · {formatPostUpdatedLabel(frontmatter.updatedAt)}</>}</small></p></div><PostLinkCopy sharePath={shortPostId(id) ? `/p/${shortPostId(id)}` : `/posts/${id}`} /></div>
      </header>
      <div className="article-content-layout">{tableOfContents.length > 0 && <ArticleTableOfContents items={tableOfContents} />}<PostContent postId={data.private === true ? undefined : id}>{content}</PostContent></div>
      <ArticleReadingProgress title={frontmatter.title} />
      <PostAdminActions id={id} title={frontmatter.title} />
      <CommentSection />
    </article></main></>
  );
}
