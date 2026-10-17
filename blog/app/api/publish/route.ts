import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { savePost } from "@/lib/github";

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { title, slug, description, markdown, blocks } = body ?? {};
  if (
    typeof title !== "string" || !title.trim() ||
    typeof slug !== "string" || !validSlug.test(slug) ||
    typeof description !== "string" ||
    typeof markdown !== "string" ||
    !Array.isArray(blocks)
  ) {
    return NextResponse.json({ error: "제목과 영문 slug, 본문을 확인해 주세요." }, { status: 400 });
  }

  if (markdown.length > 1_000_000 || JSON.stringify(blocks).length > 1_000_000) {
    return NextResponse.json({ error: "글의 크기는 1MB 이하여야 합니다." }, { status: 413 });
  }

  try {
    await savePost({
      title: title.trim(),
      slug,
      description: description.trim(),
      markdown,
      blocks,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에 저장하지 못했습니다. 환경변수를 확인해 주세요." }, { status: 502 });
  }
}
