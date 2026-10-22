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
        <div className="kb-content-layout">
        <HomeFeed posts={posts} categories={categories} profile={profile} />
        <Suspense fallback={<RecentCommentsFallback />}>
          <RecentComments posts={posts} />
        </Suspense>
        </div>
        <footer className="kb-footer"><p>© 2026 wavy studio</p><a href="#top">맨 위로 ↑</a></footer>
      </main>
    </>
  );
}
