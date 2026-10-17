"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

export function PostUnlockForm({ id }: { id: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlocking(true);
    setMessage("");
    const response = await fetch(`/api/posts/${id}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    setUnlocking(false);
    if (!response.ok) {
      setMessage((await response.json()).error ?? "글을 열지 못했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="post-lock" aria-labelledby="locked-post-title">
      <h1 id="locked-post-title">비밀번호가 필요한 글입니다.</h1>
      <p>글을 작성한 사람에게 받은 비밀번호를 입력해 주세요.</p>
      <form onSubmit={unlock}>
        <Input type="password" value={password} onValueChange={setPassword} placeholder="비밀번호" aria-label="글 비밀번호" required />
        <Button type="submit" disabled={unlocking}>{unlocking ? "확인 중…" : "글 열기"}</Button>
      </form>
      {message && <p className="notice error">{message}</p>}
    </section>
  );
}
