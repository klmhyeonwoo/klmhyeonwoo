import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { getPosts } from "@/lib/posts";
import { getCategories } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { RecentComments, RecentCommentsFallback } from "@/components/recent-comments";
import { HomeFeed } from "@/components/home-feed";

// Content changes explicitly invalidate this route in the publishing APIs.
// A longer fallback window keeps ordinary reads on the CDN instead of
// repeatedly parsing every post on a serverless function.
export const revalidate = 3600;

const getHomeContent = unstable_cache(
  async () => ({ posts: getPosts(true), categories: getCategories(), profile: getProfile() }),
  ["home-content"],
  { revalidate: 3600 },
);

export default async function HomePage() {
  const { posts, categories, profile } = await getHomeContent();

  return (
    <>
      <SiteHeader />
      <main className="kb-list-page" id="top">
        <HomeFeed posts={posts} categories={categories} profile={profile}>
          <Suspense fallback={<RecentCommentsFallback />}>
            <RecentComments posts={posts} />
          </Suspense>
        </HomeFeed>
        <footer className="kb-footer"><div><p>© 2026 wavy studio</p><small>이 제작물은 아모레퍼시픽의 아리따글꼴을 사용하여 디자인 되었습니다.</small></div><a href="#top">맨 위로 ↑</a></footer>
      </main>
    </>
  );
}
