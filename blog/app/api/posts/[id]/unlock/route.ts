import { NextResponse } from "next/server";
import { getPostPasswordHash } from "@/lib/posts";
import { grantPostAccess, passwordMatches } from "@/lib/post-access";

const validPostId = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (!validPostId.test(id) || typeof password !== "string") return NextResponse.json({ error: "요청을 확인해 주세요." }, { status: 400 });

  const passwordHash = getPostPasswordHash(id);
  if (!passwordHash || !passwordMatches(password, passwordHash)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  grantPostAccess(response, id, passwordHash);
  return response;
}
