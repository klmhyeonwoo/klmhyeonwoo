import { AdminClient } from "@/components/admin-client";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getCategories, getEditableDraft, getEditablePost, getDrafts, getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";

export const dynamic = "force-dynamic";

export default async function YkkPage({ searchParams }: { searchParams: Promise<{ id?: string; draft?: string; series?: string }> }) {
  const { id, draft, series } = await searchParams;
  const initialPost = id ? getEditablePost(id) : null;
  const initialDraft = draft ? getEditableDraft(draft) : null;
  const authenticated = await isAdmin();
  return <><SiteHeader /><AdminClient key={initialPost?.id ?? initialDraft?.id ?? series ?? "new"} authenticated={authenticated} showAlreadyLoggedIn={authenticated && !id && !draft && !series} initialPost={initialPost} initialDraft={initialDraft} defaultSeriesId={series} posts={getPosts(true)} drafts={getDrafts()} categories={getCategories()} series={getSeries()} /></>;
}
