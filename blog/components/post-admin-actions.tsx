"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { waitForDeployment } from "./deployment-waiter";
import { ToastMessage } from "./toast-message";

type Props = { id: string; title: string };

export function PostAdminActions({ id, title }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [waitingForDeployment, setWaitingForDeployment] = useState(false);

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

    setWaitingForDeployment(true);
    setMessage("GitHub에서 삭제했습니다. 배포 완료를 확인하고 있습니다.");
    const deployed = await waitForDeployment({ id, deleted: true });
    setWaitingForDeployment(false);
    if (deployed) router.replace("/");
    else setMessage("배포 확인에 시간이 걸리고 있습니다. 잠시 후 목록에서 확인해 주세요.");
  }

  return (
    <aside className="post-admin-actions" aria-label="글 관리">
      <Link href={`/ykk?id=${id}`}>수정하기</Link>
      <Button type="button" onClick={removePost} disabled={deleting || waitingForDeployment}>{deleting ? "삭제 중…" : waitingForDeployment ? "배포 확인 중…" : "삭제하기"}</Button>
      <ToastMessage message={message} tone={message.startsWith("GitHub") || message.startsWith("배포가 완료") ? "success" : message.includes("확인하고") ? "info" : "error"} />
    </aside>
  );
}
