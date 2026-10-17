import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveCategories } from "@/lib/github";

type Category = { id: string; name: string };
const validId = /^[a-z0-9-]{1,64}$/;

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const categories = body?.categories;
  if (!Array.isArray(categories) || categories.length > 50 || categories.some((item) => !item || typeof item.id !== "string" || !validId.test(item.id) || typeof item.name !== "string" || !item.name.trim() || item.name.length > 40) || new Set(categories.map((item) => item.id)).size !== categories.length) {
    return NextResponse.json({ error: "카테고리 이름을 확인해 주세요." }, { status: 400 });
  }
  try {
    const normalized = categories.map((item) => ({ id: item.id, name: item.name.trim() }));
    await saveCategories(normalized);
    return NextResponse.json({ ok: true, categories: normalized });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "카테고리를 저장하지 못했습니다." }, { status: 502 });
  }
}
