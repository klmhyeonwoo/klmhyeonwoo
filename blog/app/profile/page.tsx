import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { ProfileEditor } from "@/components/profile-editor";
import { PostCallout } from "@/components/post-callout";
import { PostBookmark } from "@/components/post-bookmark";
import { PostGallery } from "@/components/post-gallery";
import { PostColumn, PostColumns } from "@/components/post-columns";
import { restoreBookmarks } from "@/lib/bookmark-markdown";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = getProfile();
  const authenticated = await isAdmin();
  if (authenticated) return <><SiteHeader /><ProfileEditor profile={profile} /></>;
  const source = restoreBookmarks(profile.markdown || "소개를 작성해 주세요.", profile.blocks);
  const { content } = await compileMDX({ components: { Callout: PostCallout, Bookmark: PostBookmark, Gallery: PostGallery, Columns: PostColumns, Column: PostColumn }, source, options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [[rehypeShiki, { themes: { light: "github-light", dark: "github-dark" } }]] } } });
  return <><SiteHeader /><main className="profile-page"><section className="profile-card">{profile.image ? <img src={profile.image} alt={`${profile.name} 프로필`} /> : <div className="profile-placeholder">{profile.name.slice(0, 1)}</div>}<div><h1>{profile.name}</h1><div className="prose">{content}</div></div></section></main></>;
}
