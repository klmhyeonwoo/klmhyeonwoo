import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getPosts, type PostMeta } from "@/lib/posts";

function Visual({ post, priority = false }: { post: PostMeta; priority?: boolean }) {
  if (post.thumbnail) {
    return <img src={post.thumbnail} alt="" className="ff-image" loading={priority ? "eager" : "lazy"} />;
  }

  return <div className="ff-fallback" aria-hidden="true"><span>{post.category}</span></div>;
}

export default function HomePage() {
  const posts = getPosts();
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const categories = [...new Set(posts.map((post) => post.category))];

  return (
    <>
      <SiteHeader />
      <main className="fficial" id="top">

      {featured ? (
        <section className="ff-lead">
          <Link href={`/posts/${featured.slug}`} className="ff-lead-visual" aria-label={`${featured.title} 읽기`}>
            <Visual post={featured} priority />
            <span className="ff-label">NEW</span>
          </Link>
          <div className="ff-lead-copy">
            <p className="ff-meta">{featured.category} <span>·</span> {featured.date}</p>
            <h1><Link href={`/posts/${featured.slug}`}>{featured.title}</Link></h1>
            {featured.description && <p className="ff-summary">{featured.description}</p>}
            <Link href={`/posts/${featured.slug}`} className="ff-read">읽어보기 <span>→</span></Link>
          </div>
        </section>
      ) : (
        <section className="ff-empty-lead"><h1>아직 발행된 글이 없습니다.</h1><Link href="/admin">첫 글 작성하기 →</Link></section>
      )}

      <section className="ff-topics" id="topics">
        <div className="ff-heading"><p>주제별로 보기</p><span>{categories.length}개 주제</span></div>
        <div className="ff-topic-list">
          {categories.map((category) => <span key={category}>{category}</span>)}
        </div>
      </section>

      <section className="ff-feed" id="all">
        <div className="ff-heading"><p>모든 콘텐츠</p><span>{posts.length}개의 글</span></div>
        {posts.length > 0 ? (
          <div className="ff-grid">
            {posts.map((post) => (
              <article className="ff-card" key={post.slug}>
                <Link href={`/posts/${post.slug}`} className="ff-card-visual" aria-label={`${post.title} 읽기`}><Visual post={post} /></Link>
                <p className="ff-meta">{post.category} <span>·</span> {post.date}</p>
                <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
                {post.description && <p className="ff-card-summary">{post.description}</p>}
              </article>
            ))}
          </div>
        ) : null}
      </section>

        <footer className="ff-footer"><p>© 2026 현우의 기록</p><a href="#top">맨 위로 ↑</a></footer>
      </main>
    </>
  );
}
