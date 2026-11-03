import matter from "gray-matter";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostArticle } from "@/components/post-article";
import { isAdmin } from "@/lib/auth";
import { getPost } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "비공개 글",
  description: "비공개 글입니다.",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
};

export default async function PrivatePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getPost(id);
  if (!source) notFound();
  if (matter(source).data.private !== true) redirect(`/posts/${encodeURIComponent(id)}`);
  if (!(await isAdmin())) notFound();
  return <PostArticle id={id} source={source} />;
}
