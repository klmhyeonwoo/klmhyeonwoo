import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/github";

const maxBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 올릴 수 있습니다." }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "이미지는 5MB 이하여야 합니다." }, { status: 413 });
  }

  try {
    const url = await saveImage({
      name: file.name,
      type: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "GitHub에 이미지를 저장하지 못했습니다." }, { status: 502 });
  }
}
