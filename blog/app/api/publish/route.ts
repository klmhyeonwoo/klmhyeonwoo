import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { isContentReferenceId } from "@/lib/content-reference";
import { deleteDraft, savePost } from "@/lib/github";
import { getPostPublishedAt, getPosts } from "@/lib/posts";
import { postsCacheTag } from "@/lib/post-cache";
import { convertBlocks, markdownFor } from "@/lib/slash-content";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { title, id: rawId, description, categoryId = "essay", seriesId = "", markdown, blocks, isPrivate = false, fromDraft = false } = body ?? {};
  const id = rawId ?? undefined;
  if (
    typeof title !== "string" || !title.trim() ||
    (id !== undefined && (typeof id !== "string" || !validPostId.test(id))) ||
    typeof description !== "string" ||
    typeof categoryId !== "string" ||
    typeof seriesId !== "string" ||
    typeof markdown !== "string" ||
    typeof isPrivate !== "boolean" || typeof fromDraft !== "boolean" ||
    !Array.isArray(blocks)
  ) {
    return NextResponse.json({ error: "제목, 본문, 카테고리 입력값을 확인해 주세요." }, { status: 400 });
  }

  const category = categoryId.trim();
  const series = seriesId.trim();
  if (!isContentReferenceId(category) || (series && !isContentReferenceId(series))) {
    return NextResponse.json({ error: "카테고리 또는 시리즈 선택값을 확인해 주세요." }, { status: 400 });
  }

  if (markdown.length > 1_000_000 || JSON.stringify(blocks).length > 1_000_000) {
    return NextResponse.json({ error: "글의 크기는 1MB 이하여야 합니다." }, { status: 413 });
  }

  // The editor document is the lossless source of truth.  The Markdown/MDX
  // string is its public rendering projection, so recover it here when a
  // browser has not received its first editor `onUpdate` yet.
  // Always regenerate the public projection from the editor document. The
  // client Markdown can be one update behind, which used to drop alignment
  // attributes when a post was published and then viewed while logged out.
  const generatedMarkdown = markdownFor(convertBlocks(blocks));
  const renderMarkdown = generatedMarkdown.trim() || markdown.trim();
  if (!renderMarkdown.trim()) {
    return NextResponse.json({ error: "본문을 입력해 주세요." }, { status: 400 });
  }

  const postId = id ?? randomUUID();
  const previousSeriesId = id ? getPosts(true).find((post) => post.id === id)?.seriesId : undefined;
  const publishedAt = id ? getPostPublishedAt(id) ?? new Date().toISOString() : new Date().toISOString();
  const updatedAt = new Date().toISOString();
  try {
    const version = await savePost({
      title: title.trim(),
      id: postId,
      description: description.trim(),
      categoryId: category,
      seriesId: series,
      publishedAt,
      updatedAt,
      markdown: renderMarkdown,
      blocks,
      isPrivate,
    });
    if (fromDraft) await deleteDraft(postId, title.trim());
    revalidateTag(postsCacheTag, "max");
    revalidatePath("/");
    revalidatePath(`/posts/${postId}`);
    revalidatePath("/series");
    if (previousSeriesId) revalidatePath(`/series/${previousSeriesId}`);
    if (series) revalidatePath(`/series/${series}`);
    return NextResponse.json({ ok: true, id: postId, version });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에 저장하지 못했습니다. 환경변수를 확인해 주세요." }, { status: 502 });
  }
}
