import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveAttachment } from "@/lib/github";
import { attachmentExtension } from "@/lib/editor-media";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !attachmentExtension(file.name, file.type)) return NextResponse.json({ error: "PDF, TXT, CSV, ZIP 또는 MP4, WebM, MOV 파일을 선택해 주세요." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "5MB 이하 파일을 선택하거나 URL로 연결해 주세요." }, { status: 413 });
    const url = await saveAttachment({ name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "첨부 파일을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  }
}
