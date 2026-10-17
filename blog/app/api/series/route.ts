import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveSeries } from "@/lib/github";

const validId = /^[a-z0-9-]{1,64}$/;

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const series = body?.series;
  if (!Array.isArray(series) || series.length > 50 || series.some((item) => !item || typeof item.id !== "string" || !validId.test(item.id) || typeof item.name !== "string" || !item.name.trim() || item.name.length > 80 || typeof item.description !== "string" || item.description.length > 300 || (item.coverImage !== undefined && (typeof item.coverImage !== "string" || item.coverImage.length > 2000))) || new Set(series.map((item) => item.id)).size !== series.length) {
    return NextResponse.json({ error: "시리즈 정보를 확인해 주세요." }, { status: 400 });
  }

  try {
    const normalized = series.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      description: item.description.trim(),
      ...(item.coverImage?.trim() ? { coverImage: item.coverImage.trim() } : {}),
    }));
    await saveSeries(normalized);
    return NextResponse.json({ ok: true, series: normalized });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "시리즈를 저장하지 못했습니다." }, { status: 502 });
  }
}
