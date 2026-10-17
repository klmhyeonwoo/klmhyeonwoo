import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isContentReferenceId } from "@/lib/content-reference";
import { deleteDraft, savePost } from "@/lib/github";
import { hashPostPassword } from "@/lib/post-access";
import { getPostPasswordHash, getPostPublishedAt } from "@/lib/posts";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { title, id: rawId, description, categoryId = "essay", seriesId = "", markdown, blocks, isPrivate = false, fromDraft = false, password = "" } = body ?? {};
  const id = rawId ?? undefined;
  if (
    typeof title !== "string" || !title.trim() ||
    (id !== undefined && (typeof id !== "string" || !validPostId.test(id))) ||
    typeof description !== "string" ||
    typeof categoryId !== "string" ||
    typeof seriesId !== "string" ||
    typeof markdown !== "string" ||
    typeof isPrivate !== "boolean" || typeof fromDraft !== "boolean" || typeof password !== "string" ||
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

  const postId = id ?? randomUUID();
  const publishedAt = id ? getPostPublishedAt(id) ?? new Date().toISOString() : new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const existingPasswordHash = id ? getPostPasswordHash(id) : null;
  if (isPrivate && password.length === 0 && !existingPasswordHash) {
    return NextResponse.json({ error: "비밀번호 보호 글에는 비밀번호를 입력해 주세요." }, { status: 400 });
  }
  if (isPrivate && password.length > 0 && password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상 입력해 주세요." }, { status: 400 });
  }
  const passwordHash = isPrivate ? (password ? hashPostPassword(password) : existingPasswordHash ?? undefined) : undefined;

  try {
    const version = await savePost({
      title: title.trim(),
      id: postId,
      description: description.trim(),
      categoryId: category,
      seriesId: series,
      publishedAt,
      updatedAt,
      markdown,
      blocks,
      isPrivate,
      passwordHash,
    });
    if (fromDraft) await deleteDraft(postId, title.trim());
    return NextResponse.json({ ok: true, id: postId, version });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에 저장하지 못했습니다. 환경변수를 확인해 주세요." }, { status: 502 });
  }
}
