import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveDraft } from "@/lib/github";
import { getCategories } from "@/lib/posts";
import { getSeries } from "@/lib/series";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { id, title = "", description = "", categoryId = "essay", seriesId = "", markdown = "", blocks, isPrivate = false } = body ?? {};
  if (
    (id !== undefined && (typeof id !== "string" || !validPostId.test(id))) ||
    typeof title !== "string" || typeof description !== "string" || typeof categoryId !== "string" || typeof seriesId !== "string" || typeof markdown !== "string" ||
    typeof isPrivate !== "boolean" || !Array.isArray(blocks)
  ) return NextResponse.json({ error: "임시 저장할 내용을 확인해 주세요." }, { status: 400 });

  const category = getCategories().find((item) => item.id === categoryId || item.name === categoryId);
  const series = seriesId ? getSeries().find((item) => item.id === seriesId || item.name === seriesId) : undefined;
  if (!category || (seriesId && !series)) {
    return NextResponse.json({ error: "선택한 카테고리 또는 시리즈를 찾을 수 없습니다. 다시 선택해 주세요." }, { status: 400 });
  }

  if (markdown.length > 1_000_000 || JSON.stringify(blocks).length > 1_000_000) {
    return NextResponse.json({ error: "글의 크기는 1MB 이하여야 합니다." }, { status: 413 });
  }

  const draftId = id ?? randomUUID();
  try {
    await saveDraft({ id: draftId, title: title.trim(), description: description.trim(), categoryId: category.id, seriesId: series?.id ?? "", markdown, blocks, isPrivate, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, id: draftId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에 임시 저장하지 못했습니다." }, { status: 502 });
  }
}
