import { compileMDX } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getPost, getPosts } from "@/lib/posts";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getPosts().map(({ slug }) => ({ slug }));
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const source = getPost(slug);
  if (!source) notFound();

  const { content, frontmatter } = await compileMDX<{
    title: string;
    date: string;
    description?: string;
  }>({ source, options: { parseFrontmatter: true } });

  return (
    <>
      <SiteHeader />
      <main className="article-shell">
        <article className="article">
          <p className="eyebrow">{frontmatter.date}</p>
          <h1>{frontmatter.title}</h1>
          {frontmatter.description && <p className="lede">{frontmatter.description}</p>}
          <div className="prose">{content}</div>
        </article>
      </main>
    </>
  );
}
