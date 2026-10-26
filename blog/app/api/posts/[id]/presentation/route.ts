import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { updatePostPresentation } from "@/lib/github";
import { getPosts } from "@/lib/posts";
import { postsCacheTag } from "@/lib/post-cache";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

/** Updates only presentation metadata; the article document stays canonical. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { title, description, coverImage = "", showInList } = body ?? {};
  if (!validPostId.test(id) || typeof title !== "string" || !title.trim() || title.length > 180 || typeof description !== "string" || description.length > 500 || typeof coverImage !== "string" || coverImage.length > 2000 || typeof showInList !== "boolean") {
    return NextResponse.json({ error: "아티클 정보를 확인해 주세요." }, { status: 400 });
  }

  const post = getPosts(true).find((item) => item.id === id);
  if (!post) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

  try {
    const version = await updatePostPresentation({ id, title: title.trim(), description: description.trim(), coverImage: coverImage.trim(), showInList });
    revalidateTag(postsCacheTag, "max");
    revalidatePath("/");
    revalidatePath(`/posts/${id}`);
    if (post.seriesId) revalidatePath(`/series/${post.seriesId}`);
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "아티클 정보를 저장하지 못했습니다." }, { status: 502 });
  }
}
