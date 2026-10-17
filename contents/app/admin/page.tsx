import { AdminClient } from "@/components/admin-client";
import { isAdmin } from "@/lib/auth";
import { getEditablePost, getPosts } from "@/lib/posts";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  const initialPost = slug ? getEditablePost(slug) : null;
  return (
    <>
      <SiteHeader />
      <AdminClient key={initialPost?.slug ?? "new"} authenticated={await isAdmin()} initialPost={initialPost} posts={getPosts()} />
    </>
  );
}
