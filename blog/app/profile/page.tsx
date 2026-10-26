import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { SiteHeader } from "@/components/site-header";
import { getProfile } from "@/lib/profile";
import { ProfilePageMode } from "@/components/profile-page-mode";
import { PostCallout } from "@/components/post-callout";
import { PostDiagram } from "@/components/post-diagram";
import { PostBookmark } from "@/components/post-bookmark";
import { PostGallery } from "@/components/post-gallery";
import { PostColumn, PostColumns } from "@/components/post-columns";
import { restoreBookmarks } from "@/lib/bookmark-markdown";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "프로필",
  description: "wavy studio를 운영하는 현우의 프로필과 기록입니다.",
  alternates: { canonical: "/profile" },
  openGraph: { title: "프로필", description: "wavy studio를 운영하는 현우의 프로필과 기록입니다.", url: "/profile", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "wavy studio 프로필" }] },
};

// Profile edits explicitly revalidate this page. Do not compile its MDX for
// every anonymous visit merely to determine whether the visitor is an admin.
export const revalidate = 3600;

export default async function ProfilePage() {
  const profile = getProfile();
  const source = restoreBookmarks(profile.markdown || "소개를 작성해 주세요.", profile.blocks);
  const { content } = await compileMDX({ components: { Diagram: PostDiagram, Callout: PostCallout, Bookmark: PostBookmark, Gallery: PostGallery, Columns: PostColumns, Column: PostColumn }, source, options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [[rehypeShiki, { themes: { light: "github-light", dark: "github-dark" } }]] } } });
  const personSchema = { "@context": "https://schema.org", "@type": "Person", name: profile.name, url: absoluteUrl("/profile"), ...(profile.image ? { image: profile.image } : {}) };
  return <><SiteHeader /><ProfilePageMode profile={profile}><main className="profile-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema).replace(/</g, "\\u003c") }} /><section className="profile-card">{profile.image ? <img src={profile.image} alt={`${profile.name} 프로필`} /> : <div className="profile-placeholder">{profile.name.slice(0, 1)}</div>}<div><h1>{profile.name}</h1><div className="prose">{content}</div></div></section></main></ProfilePageMode></>;
}
