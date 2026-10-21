import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { saveProfile } from "@/lib/github";

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const { name, image, markdown, blocks } = body ?? {};
  if (typeof name !== "string" || !name.trim() || name.length > 40 || typeof image !== "string" || image.length > 2_000 || typeof markdown !== "string" || markdown.length > 200_000 || !Array.isArray(blocks) || JSON.stringify(blocks).length > 500_000) return NextResponse.json({ error: "프로필 내용을 확인해 주세요." }, { status: 400 });
  try {
    await saveProfile({ name: name.trim(), image: image.trim(), markdown, blocks });
    revalidatePath("/");
    revalidatePath("/profile");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "프로필을 저장하지 못했습니다." }, { status: 502 });
  }
}
