import { AdminClient } from "@/components/admin-client";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getCategories, getEditablePost, getPosts } from "@/lib/posts";
import { getRemoteDrafts } from "@/lib/github";
import { getSeries } from "@/lib/series";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function YkkPage({ searchParams }: { searchParams: Promise<{ id?: string; draft?: string; series?: string }> }) {
  const { id, draft, series } = await searchParams;
  const authenticated = await isAdmin();
  const drafts = authenticated ? await getRemoteDrafts() : [];
  const initialPost = authenticated && id ? getEditablePost(id) : null;
  const initialDraft = draft ? drafts.find((item) => item.id === draft) ?? null : null;
  return <><SiteHeader /><AdminClient key={initialPost?.id ?? initialDraft?.id ?? series ?? "new"} authenticated={authenticated} initialPost={initialPost} initialDraft={initialDraft} defaultSeriesId={series} posts={getPosts(authenticated)} drafts={drafts} categories={getCategories()} series={getSeries()} /></>;
}
