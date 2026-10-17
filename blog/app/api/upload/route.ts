import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/github";

const maxBytes = 5 * 1024 * 1024;

function uploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("environment variables are missing")) return "GitHub 환경변수를 찾을 수 없습니다. blog/.env.local에 설정해 주세요.";
  if (message.includes("GitHub write failed: 404")) return "GitHub 저장소 또는 브랜치를 찾지 못했습니다. GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH를 확인해 주세요.";
  if (message.includes("GitHub write failed: 401") || message.includes("GitHub write failed: 403")) return "GitHub 토큰에 저장소 쓰기 권한이 없습니다. PAT 권한을 확인해 주세요.";
  return "GitHub에 이미지를 저장하지 못했습니다.";
}

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
    return NextResponse.json({ error: uploadErrorMessage(error) }, { status: 502 });
  }
}
