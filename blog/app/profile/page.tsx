import { compileMDX } from "next-mdx-remote/rsc";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { ProfileEditor } from "@/components/profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = getProfile();
  const authenticated = await isAdmin();
  if (authenticated) return <><SiteHeader /><ProfileEditor profile={profile} /></>;
  const { content } = await compileMDX({ source: profile.markdown || "소개를 작성해 주세요." });
  return <><SiteHeader /><main className="profile-page"><section className="profile-card">{profile.image ? <img src={profile.image} alt={`${profile.name} 프로필`} /> : <div className="profile-placeholder">{profile.name.slice(0, 1)}</div>}<div><h1>{profile.name}</h1><div className="prose">{content}</div></div></section></main></>;
}
