import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { formatPostDate, formatPostUpdatedLabel, postWasUpdated } from "@/lib/post-date";
import { getPosts } from "@/lib/posts";
import { getCategories } from "@/lib/posts";
import { getProfile } from "@/lib/profile";
import { RecentComments } from "@/components/recent-comments";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const posts = getPosts(true);
  const categories = getCategories();
  const { category: selectedCategory } = await searchParams;
  const filteredPosts = selectedCategory ? posts.filter((post) => post.categoryId === selectedCategory) : posts;
  const authenticated = await isAdmin();
  const profile = getProfile();

  return (
    <>
      <SiteHeader />
      <main className="kb-list-page" id="top">
        <nav className="kb-category-nav" id="topics" aria-label="글 카테고리"><Link className={!selectedCategory ? "active" : ""} href="/">전체 <span>{posts.length}</span></Link>{categories.map((category) => <Link key={category.id} className={selectedCategory === category.id ? "active" : ""} href={`/?category=${category.id}`}>{category.name}</Link>)}</nav>
        <div className="kb-content-layout">
        <section className="kb-feed" id="all" aria-label={selectedCategory ? categories.find((item) => item.id === selectedCategory)?.name ?? "미분류" : "전체 글"}>
          {filteredPosts.length > 0 ? filteredPosts.map((post) => (
            <article className="kb-post" key={post.id}>
              <Link href={`/posts/${post.id}`}>
                <div className="kb-post-author">
                  {profile.image ? <img src={profile.image} alt="" /> : <span className="kb-post-avatar">{profile.name.slice(0, 1)}</span>}
                  <div>
                    <strong>{profile.name}</strong>
                    <p>{formatPostDate(post.date)}{postWasUpdated(post.publishedAt, post.updatedAt) && <><span>·</span> {formatPostUpdatedLabel(post.updatedAt)}</>}{post.series && <><span>·</span> {post.series}</>}{post.isPrivate && " 🔒"}</p>
                  </div>
                </div>
                <h2>{post.title}</h2>
                {post.excerpt && <p className="kb-post-description">{post.excerpt}</p>}
                <div className="kb-post-tags" aria-label="글 카테고리">
                  <span>{post.category}</span>
                </div>
              </Link>
            </article>
          )) : <p className="kb-empty">아직 이 카테고리에 글이 없습니다.{authenticated && <Link href="/ykk"> 글 작성하기</Link>}</p>}
        </section>
        <RecentComments />
        </div>
        <footer className="kb-footer"><p>© 2026 bloging.</p><a href="#top">맨 위로 ↑</a></footer>
      </main>
    </>
  );
}
