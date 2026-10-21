import { createHash } from "crypto";
import { isAdmin } from "@/lib/auth";
import { getPosts } from "@/lib/posts";
import { createInlineComment, deleteInlineComment, listInlineComments } from "@/lib/inline-comments";
import { validComment } from "@/lib/inline-comment-types";

type Context = { params: Promise<{ id: string }> };
const attempts = new Map<string, number>();
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

async function publicPost(context: Context) {
  const { id } = await context.params;
  return /^[a-z0-9][a-z0-9-]*$/.test(id) && getPosts().some(post => post.id === id) ? id : null;
}

export async function GET(_: Request, context: Context) {
  const id = await publicPost(context);
  if (!id) return json({ error: "글을 찾을 수 없습니다." }, 404);
  try { return json({ comments: await listInlineComments(id), canDelete: await isAdmin() }); }
  catch { return json({ error: "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }, 503); }
}

export async function POST(request: Request, context: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "허용되지 않은 요청입니다." }, 403);
  const id = await publicPost(context);
  if (!id) return json({ error: "글을 찾을 수 없습니다." }, 404);
  const key = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").digest("hex");
  const now = Date.now();
  for (const [key, expiry] of attempts) if (expiry <= now) attempts.delete(key);
  if (attempts.has(key) || attempts.size >= 10000) return json({ error: "잠시 후 다시 작성해주세요." }, 429);
  attempts.set(key, now + 30_000);
  try {
    // Read the stream with a hard limit, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "댓글을 입력해주세요." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) { await reader.cancel(); return json({ error: "댓글이 너무 깁니다." }, 413); }
      chunks.push(value);
    }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return json({ error: "잘못된 댓글 형식입니다." }, 400); }
    if (!validComment(value)) return json({ error: "이름, 본문 선택 영역과 댓글을 확인해주세요." }, 400);
    return json({ comment: await createInlineComment(id, { name: value.name.trim(), body: value.body.trim(), anchor: value.anchor }) }, 201);
  } catch { return json({ error: "댓글을 저장하지 못했습니다. 잠시 후 다시 시도해주세요." }, 503); }
}

export async function DELETE(request: Request, context: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "허용되지 않은 요청입니다." }, 403);
  if (!(await isAdmin())) return json({ error: "관리자 로그인이 필요합니다." }, 401);
  const id = await publicPost(context);
  if (!id) return json({ error: "글을 찾을 수 없습니다." }, 404);
  const commentId = Number(new URL(request.url).searchParams.get("commentId"));
  if (!Number.isSafeInteger(commentId) || commentId <= 0) return json({ error: "잘못된 댓글입니다." }, 400);
  try { return await deleteInlineComment(id, commentId) ? json({ ok: true }) : json({ error: "댓글을 찾을 수 없습니다." }, 404); }
  catch { return json({ error: "댓글을 삭제하지 못했습니다." }, 503); }
}
