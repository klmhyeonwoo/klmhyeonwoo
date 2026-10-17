import { AdminClient } from "@/components/admin-client";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getCategories, getEditableDraft, getEditablePost, getDrafts, getPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function YkkPage({ searchParams }: { searchParams: Promise<{ id?: string; draft?: string }> }) {
  const { id, draft } = await searchParams;
  const initialPost = id ? getEditablePost(id) : null;
  const initialDraft = draft ? getEditableDraft(draft) : null;
  const authenticated = await isAdmin();
  return <><SiteHeader /><AdminClient key={initialPost?.id ?? initialDraft?.id ?? "new"} authenticated={authenticated} showAlreadyLoggedIn={authenticated && !id && !draft} initialPost={initialPost} initialDraft={initialDraft} posts={getPosts(true)} drafts={getDrafts()} categories={getCategories()} /></>;
}
