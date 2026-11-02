import { redirect } from "next/navigation";
import { BlogSettingsEditor } from "@/components/blog-settings-editor";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RecentComments, RecentCommentsFallback } from "@/components/recent-comments";
import { getCachedPosts } from "@/lib/post-cache";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  if (!(await isAdmin())) redirect("/");
  const posts = await getCachedPosts();
  return <><SiteHeader /><BlogSettingsEditor initialSettings={getSiteSettings()}><Suspense fallback={<RecentCommentsFallback />}><RecentComments posts={posts} /></Suspense></BlogSettingsEditor></>;
}
