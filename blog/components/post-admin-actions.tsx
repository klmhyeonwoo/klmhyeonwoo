"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@base-ui/react/button";

type Props = { id: string; title: string };

export function PostAdminActions({ id, title }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function removePost() {
    if (!window.confirm(`“${title}” 글을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;

    setDeleting(true);
    setMessage("");
    const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setDeleting(false);

    if (!response.ok) {
      setMessage((await response.json()).error ?? "글을 삭제하지 못했습니다.");
      return;
    }

    setMessage("GitHub에서 삭제했습니다. 배포가 끝나면 목록에서 사라집니다.");
    router.refresh();
  }

  return (
    <aside className="post-admin-actions" aria-label="글 관리">
      <Link href={`/ykk?id=${id}`}>수정하기</Link>
      <Button type="button" onClick={removePost} disabled={deleting}>{deleting ? "삭제 중…" : "삭제하기"}</Button>
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
