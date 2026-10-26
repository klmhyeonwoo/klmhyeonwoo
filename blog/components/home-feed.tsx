"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { formatPostDate, formatPostUpdatedLabel, postPublishedToday, postWasUpdated } from "@/lib/post-date";
import type { Category, PostMeta } from "@/lib/posts";
import type { Profile } from "@/lib/profile";
import { PrefetchLink } from "./prefetch-link";
import { PostSearch } from "./post-search";

const postsPerPage = 8;
type Filters = { category?: string; page: number; query: string };

function fromLocation(): Filters {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get("page"));
  return {
    category: params.get("category") || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    query: (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
  };
}

function hrefFor(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.query) params.set("q", filters.query);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function matches(post: PostMeta, query: string) {
  if (!query) return true;
  const haystack = [post.title, post.description, post.excerpt, post.category, post.series]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

type Props = { posts: PostMeta[]; categories: Category[]; profile: Profile; children?: ReactNode };

/**
 * Query-string filtering intentionally runs in the browser so `/` remains an
 * ISR page. The server still sends the default feed as usable HTML; this only
 * changes the visible subset after a URL filter or search is requested.
 */
export function HomeFeed({ posts, categories, profile, children }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ page: 1, query: "" });
  const listedPosts = useMemo(() => posts.filter((post) => post.showInList), [posts]);

  useEffect(() => {
    const sync = () => setFilters(fromLocation());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const filteredPosts = useMemo(() => listedPosts.filter((post) => (!filters.category || post.categoryId === filters.category) && matches(post, filters.query)), [filters.category, filters.query, listedPosts]);
  const categoryCounts = useMemo(() => listedPosts.reduce((counts, post) => counts.set(post.categoryId, (counts.get(post.categoryId) ?? 0) + 1), new Map<string, number>()), [listedPosts]);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  const currentPage = Math.min(filters.page, totalPages);
  const pagedPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  function navigate(next: Filters) {
    const normalized = { ...next, page: Math.max(1, next.page) };
    setFilters(normalized);
    router.push(hrefFor(normalized), { scroll: false });
  }

  function intercept(event: MouseEvent<HTMLAnchorElement>, next: Filters) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(next);
  }

  function navigateHref(value: string) {
    const url = new URL(value, window.location.origin);
    const page = Number(url.searchParams.get("page"));
    navigate({
      category: url.searchParams.get("category") || undefined,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      query: (url.searchParams.get("q") ?? "").trim(),
    });
  }

  return <>
    <div className="kb-list-controls">
      <nav className="kb-category-nav" id="topics" aria-label="글 카테고리">
        <Link className={!filters.category ? "active" : ""} href={hrefFor({ page: 1, query: filters.query })} onClick={(event) => intercept(event, { page: 1, query: filters.query })}>전체 <span>{listedPosts.length}</span></Link>
        {categories.map((category) => <Link key={category.id} className={filters.category === category.id ? "active" : ""} href={hrefFor({ category: category.id, page: 1, query: filters.query })} onClick={(event) => intercept(event, { category: category.id, page: 1, query: filters.query })}>{category.name} <span>{categoryCounts.get(category.id) ?? 0}</span></Link>)}
      </nav>
      <PostSearch categoryId={filters.category} initialQuery={filters.query} posts={posts} onSearch={(query) => navigate({ category: filters.category, page: 1, query: query.trim() })} onNavigate={navigateHref} />
    </div>
    <div className="kb-content-layout">
    <section className="kb-feed" id="all" aria-label={filters.category ? categories.find((item) => item.id === filters.category)?.name ?? "미분류" : "전체 글"}>
      {filteredPosts.length > 0 ? pagedPosts.map((post) => (
        <article className="kb-post" key={post.id}>
          <PrefetchLink href={`/posts/${post.id}`}>
            <div className="kb-post-author">
              {profile.image ? <img src={profile.image} alt="" /> : <span className="kb-post-avatar">{profile.name.slice(0, 1)}</span>}
              <div><strong>{profile.name}</strong><p>{formatPostDate(post.date)}{postWasUpdated(post.publishedAt, post.updatedAt) && <><span>·</span> {formatPostUpdatedLabel(post.updatedAt)}</>}{post.series && <><span>·</span> {post.series}</>}{post.isPrivate && " 🔒"}</p></div>
            </div>
            <h2>{post.title}{postPublishedToday(post.publishedAt) && <span className="kb-post-new" aria-label="오늘 게시됨">NEW</span>}</h2>
            {post.excerpt && <p className="kb-post-description">{post.excerpt}</p>}
            <div className="kb-post-tags" aria-label="글 카테고리"><span>{post.category}</span></div>
          </PrefetchLink>
        </article>
      )) : <p className="kb-empty">{filters.query ? `“${filters.query}”에 맞는 글을 찾지 못했습니다.` : "아직 이 카테고리에 글이 없습니다."}</p>}
      {totalPages > 1 && <nav className="kb-pagination" aria-label="글 목록 페이지">
        <Link aria-disabled={currentPage === 1} className={currentPage === 1 ? "is-disabled" : ""} href={hrefFor({ ...filters, page: Math.max(1, currentPage - 1) })} onClick={(event) => intercept(event, { ...filters, page: Math.max(1, currentPage - 1) })}>이전</Link>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <Link aria-current={number === currentPage ? "page" : undefined} className={number === currentPage ? "active" : ""} href={hrefFor({ ...filters, page: number })} onClick={(event) => intercept(event, { ...filters, page: number })} key={number}>{number}</Link>)}
        <Link aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? "is-disabled" : ""} href={hrefFor({ ...filters, page: Math.min(totalPages, currentPage + 1) })} onClick={(event) => intercept(event, { ...filters, page: Math.min(totalPages, currentPage + 1) })}>다음</Link>
      </nav>}
    </section>
    {children}
    </div>
  </>;
}
