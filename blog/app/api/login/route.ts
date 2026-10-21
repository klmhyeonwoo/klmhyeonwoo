import { NextResponse } from "next/server";
import { isAdmin, login, passwordsMatch } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !passwordsMatch(password)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await login();
  return NextResponse.json({ ok: true });
}
