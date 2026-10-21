import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { formatPostDate, formatPostUpdatedLabel, postPublishedToday, postWasUpdated } from "@/lib/post-date";
import { getPosts } from "@/lib/posts";
import { getCategories } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { RecentComments, RecentCommentsFallback } from "@/components/recent-comments";
import { PrefetchLink } from "@/components/prefetch-link";
import { PostSearch } from "@/components/post-search";

export const revalidate = 300;

const postsPerPage = 8;

const getHomeContent = unstable_cache(
  async () => ({ posts: getPosts(true), categories: getCategories(), profile: getProfile() }),
  ["home-content"],
  { revalidate: 300 },
);

function normalizedSearchQuery(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
}

function matchesSearch(post: ReturnType<typeof getPosts>[number], query: string) {
  if (!query) return true;
  const haystack = [post.title, post.description, post.excerpt, post.category, post.series]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string; q?: string }> }) {
  const { posts, categories, profile } = await getHomeContent();
  const { category: selectedCategory, page, q } = await searchParams;
  const searchQuery = normalizedSearchQuery(q);
  const filteredPosts = posts.filter((post) => (!selectedCategory || post.categoryId === selectedCategory) && matchesSearch(post, searchQuery));
  const categoryCounts = posts.reduce((counts, post) => counts.set(post.categoryId, (counts.get(post.categoryId) ?? 0) + 1), new Map<string, number>());
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  const currentPage = Math.min(pageNumber(page), totalPages);
  const pagedPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (searchQuery) params.set("q", searchQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };
  const categoryHref = (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (searchQuery) params.set("q", searchQuery);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };

  return (
    <>
      <SiteHeader />
      <main className="kb-list-page" id="top">
        <div className="kb-list-controls">
          <nav className="kb-category-nav" id="topics" aria-label="글 카테고리"><Link className={!selectedCategory ? "active" : ""} href={categoryHref()}>전체 <span>{posts.length}</span></Link>{categories.map((category) => <Link key={category.id} className={selectedCategory === category.id ? "active" : ""} href={categoryHref(category.id)}>{category.name} <span>{categoryCounts.get(category.id) ?? 0}</span></Link>)}</nav>
          <PostSearch categoryId={selectedCategory} initialQuery={searchQuery} posts={posts} />
        </div>
        <div className="kb-content-layout">
        <section className="kb-feed" id="all" aria-label={selectedCategory ? categories.find((item) => item.id === selectedCategory)?.name ?? "미분류" : "전체 글"}>
          {filteredPosts.length > 0 ? pagedPosts.map((post) => (
            <article className="kb-post" key={post.id}>
              <PrefetchLink href={`/posts/${post.id}`}>
                <div className="kb-post-author">
                  {profile.image ? <img src={profile.image} alt="" /> : <span className="kb-post-avatar">{profile.name.slice(0, 1)}</span>}
                  <div>
                    <strong>{profile.name}</strong>
                    <p>{formatPostDate(post.date)}{postWasUpdated(post.publishedAt, post.updatedAt) && <><span>·</span> {formatPostUpdatedLabel(post.updatedAt)}</>}{post.series && <><span>·</span> {post.series}</>}{post.isPrivate && " 🔒"}</p>
                  </div>
                </div>
                <h2>{post.title}{postPublishedToday(post.publishedAt) && <span className="kb-post-new" aria-label="오늘 게시됨">NEW</span>}</h2>
                {post.excerpt && <p className="kb-post-description">{post.excerpt}</p>}
                <div className="kb-post-tags" aria-label="글 카테고리">
                  <span>{post.category}</span>
                </div>
              </PrefetchLink>
            </article>
          )) : <p className="kb-empty">{searchQuery ? `“${searchQuery}”에 맞는 글을 찾지 못했습니다.` : "아직 이 카테고리에 글이 없습니다."}</p>}
          {totalPages > 1 && <nav className="kb-pagination" aria-label="글 목록 페이지"><Link aria-disabled={currentPage === 1} className={currentPage === 1 ? "is-disabled" : ""} href={pageHref(Math.max(1, currentPage - 1))}>이전</Link>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <Link aria-current={number === currentPage ? "page" : undefined} className={number === currentPage ? "active" : ""} href={pageHref(number)} key={number}>{number}</Link>)}<Link aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? "is-disabled" : ""} href={pageHref(Math.min(totalPages, currentPage + 1))}>다음</Link></nav>}
        </section>
        <Suspense fallback={<RecentCommentsFallback />}>
          <RecentComments posts={posts} />
        </Suspense>
        </div>
        <footer className="kb-footer"><p>© 2026 wavy studio</p><a href="#top">맨 위로 ↑</a></footer>
      </main>
    </>
  );
}
