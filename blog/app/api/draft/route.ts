import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isContentReferenceId } from "@/lib/content-reference";
import { deleteDraft, saveDraft } from "@/lib/github";
import { getDrafts } from "@/lib/posts";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { id: rawId, title = "", description = "", categoryId = "essay", seriesId = "", markdown = "", blocks, isPrivate = false } = body ?? {};
  const id = rawId ?? undefined;
  if (
    (id !== undefined && (typeof id !== "string" || !validPostId.test(id))) ||
    typeof title !== "string" || typeof description !== "string" || typeof categoryId !== "string" || typeof seriesId !== "string" || typeof markdown !== "string" ||
    typeof isPrivate !== "boolean" || !Array.isArray(blocks)
  ) return NextResponse.json({ error: "임시 저장할 내용을 확인해 주세요." }, { status: 400 });

  const category = categoryId.trim();
  const series = seriesId.trim();
  if (!isContentReferenceId(category) || (series && !isContentReferenceId(series))) {
    return NextResponse.json({ error: "카테고리 또는 시리즈 선택값을 확인해 주세요." }, { status: 400 });
  }

  if (markdown.length > 1_000_000 || JSON.stringify(blocks).length > 1_000_000) {
    return NextResponse.json({ error: "글의 크기는 1MB 이하여야 합니다." }, { status: 413 });
  }

  const draftId = id ?? randomUUID();
  try {
    await saveDraft({ id: draftId, title: title.trim(), description: description.trim(), categoryId: category, seriesId: series, markdown, blocks, isPrivate, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, id: draftId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에 임시 저장하지 못했습니다." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!validPostId.test(id)) return NextResponse.json({ error: "삭제할 임시글을 확인해 주세요." }, { status: 400 });
  const draft = getDrafts().find((item) => item.id === id);
  if (!draft) return NextResponse.json({ error: "임시글을 찾을 수 없습니다." }, { status: 404 });
  try {
    await deleteDraft(id, draft.title);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "임시글을 삭제하지 못했습니다." }, { status: 502 });
  }
}
