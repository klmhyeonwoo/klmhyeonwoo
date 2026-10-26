import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getCachedPosts, postsCacheTag } from "@/lib/post-cache";
import { getCategories } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { RecentComments, RecentCommentsFallback } from "@/components/recent-comments";
import { HomeFeed } from "@/components/home-feed";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "wavy studio",
  description: "개발과 일상, 배움을 기록하는 현우의 개인 블로그입니다.",
  alternates: { canonical: "/" },
  openGraph: { title: "wavy studio", description: "개발과 일상, 배움을 기록하는 현우의 개인 블로그입니다.", url: "/", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "wavy studio" }] },
  twitter: { card: "summary_large_image", title: "wavy studio", description: "개발과 일상, 배움을 기록하는 현우의 개인 블로그입니다.", images: ["/opengraph-image"] },
};

// Content changes explicitly invalidate this route in the publishing APIs.
// A longer fallback window keeps ordinary reads on the CDN instead of
// repeatedly parsing every post on a serverless function.
export const revalidate = 3600;

const getHomeContent = unstable_cache(
  async () => ({ posts: await getCachedPosts(true), categories: getCategories(), profile: getProfile() }),
  ["home-content-v2"],
  { revalidate: 3600, tags: [postsCacheTag] },
);

export default async function HomePage() {
  const { posts, categories, profile } = await getHomeContent();
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "wavy studio",
    url: absoluteUrl("/"),
    description: "개발과 일상, 배움을 기록하는 현우의 개인 블로그입니다.",
    author: { "@type": "Person", name: profile.name, url: absoluteUrl("/profile") },
  };

  return (
    <>
      <SiteHeader />
      <main className="kb-list-page" id="top">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c") }} />
        <HomeFeed posts={posts} categories={categories} profile={profile}>
          <Suspense fallback={<RecentCommentsFallback />}>
            <RecentComments posts={posts} />
          </Suspense>
        </HomeFeed>
        <footer className="kb-footer"><div><p>© 2026 wavy studio</p><small>이 제작물은 아모레퍼시픽의 아리따글꼴을 사용하여 디자인 되었습니다.</small></div></footer>
      </main>
    </>
  );
}
