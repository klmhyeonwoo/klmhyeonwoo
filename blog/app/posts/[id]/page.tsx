import matter from "gray-matter";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostArticle } from "@/components/post-article";
import { getCachedPosts } from "@/lib/post-cache";
import { getPost } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { postExcerpt } from "@/lib/post-excerpt";
import { postPublishedAtValue } from "@/lib/post-date";
import { absoluteUrl } from "@/lib/site-url";

// Public articles are prerendered at build and only change through a new
// deployment (publishing commits to GitHub), so never regenerate them on a timer.
// Hourly regeneration re-ran MDX + syntax highlighting and burned Active CPU.
export const revalidate = false;
type Params = Promise<{ id: string }>;

function postDescription(source: string, data: Record<string, unknown>) {
  if (typeof data.description === "string" && data.description.trim()) return postExcerpt(data.description) ?? "";
  return postExcerpt(matter(source).content) ?? "";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const source = getPost(id);
  if (!source) return {};

  const { data } = matter(source);
  const post = (await getCachedPosts(true)).find((item) => item.id === id);
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

  const title = postTitle;
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

export async function generateStaticParams() {
  return (await getCachedPosts()).map(({ id }) => ({ id }));
}

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const source = getPost(id);
  if (!source) notFound();
  if (matter(source).data.private === true) redirect(`/private-posts/${encodeURIComponent(id)}`);
  return <PostArticle id={id} source={source} />;
}
