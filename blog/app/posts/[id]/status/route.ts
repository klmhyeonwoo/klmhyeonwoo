import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getPost, postSourceVersion } from "@/lib/posts";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  if (!validPostId.test(id)) return NextResponse.json({ error: "잘못된 글 ID입니다." }, { status: 400 });

  const source = getPost(id);
  if (!source) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json(
    { version: postSourceVersion(source) },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
