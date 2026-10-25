import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { deletePost } from "@/lib/github";
import { getPosts } from "@/lib/posts";
import { postsCacheTag } from "@/lib/post-cache";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  if (!validPostId.test(id)) return NextResponse.json({ error: "잘못된 글 ID입니다." }, { status: 400 });

  const post = getPosts(true).find((item) => item.id === id);
  if (!post) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

  try {
    await deletePost(id, post.title);
    revalidateTag(postsCacheTag, "max");
    revalidatePath("/");
    revalidatePath(`/posts/${id}`);
    revalidatePath("/series");
    if (post.seriesId) revalidatePath(`/series/${post.seriesId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에서 글을 삭제하지 못했습니다." }, { status: 502 });
  }
}
