import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { formatPostDate } from "@/lib/post-date";
import { getPosts } from "@/lib/posts";
import { getCategories } from "@/lib/posts";
import { getProfile } from "@/lib/profile";

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
        <section className="kb-intro"><p className="eyebrow">ENGINEERING NOTES</p><h1>기술로 쌓아가는<br />나의 기록.</h1><p>만들고, 배우고, 고민한 순간을 남깁니다.</p></section>
        <nav className="kb-category-nav" id="topics" aria-label="글 카테고리"><Link className={!selectedCategory ? "active" : ""} href="/">전체 <span>{posts.length}</span></Link>{categories.map((category) => <Link key={category.id} className={selectedCategory === category.id ? "active" : ""} href={`/?category=${category.id}`}>{category.name}</Link>)}</nav>
        <section className="kb-feed" id="all"><div className="kb-feed-heading"><p>{selectedCategory ? categories.find((item) => item.id === selectedCategory)?.name ?? "미분류" : "전체 글"}</p><span>{filteredPosts.length}개의 글</span></div>
          {filteredPosts.length > 0 ? filteredPosts.map((post) => <article className="kb-post" key={post.id}><Link href={`/posts/${post.id}`}><div className="kb-post-author">{profile.image ? <img src={profile.image} alt="" /> : <span className="kb-post-avatar">{profile.name.slice(0, 1)}</span>}<div><strong>{profile.name}</strong><p>{formatPostDate(post.date)} <span>·</span> {post.isPrivate && "🔒 "}{post.category}</p></div></div><h2>{post.title}</h2>{post.excerpt && <p className="kb-post-description">{post.excerpt}</p>}<div className="kb-post-tags"><span>{post.category}</span></div><span className="kb-arrow" aria-hidden="true">→</span></Link></article>) : <p className="kb-empty">아직 이 카테고리에 글이 없습니다.{authenticated && <Link href="/ykk"> 글 작성하기 →</Link>}</p>}
        </section>
        <footer className="kb-footer"><p>© 2026 현우의 기록</p><a href="#top">맨 위로 ↑</a></footer>
      </main>
    </>
  );
}
