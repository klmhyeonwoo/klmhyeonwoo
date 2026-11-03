import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers });
  const { id } = await params;
  if (!getSeries().some((series) => series.id === id)) return NextResponse.json({ error: "시리즈를 찾을 수 없습니다." }, { status: 404, headers });
  const posts = getPosts(true).filter((post) => post.seriesId === id && post.isPrivate && !post.showInList);
  return NextResponse.json({ posts }, { headers });
}
