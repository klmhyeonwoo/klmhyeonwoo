"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@base-ui/react/button";
import type { PostMeta } from "@/lib/posts";
import { useAdminSession } from "./admin-session";
import { ToastMessage } from "./toast-message";

type Row = Pick<PostMeta, "id" | "title" | "description" | "thumbnail" | "showInList">;

export function SeriesArticleManager({ posts }: { posts: PostMeta[] }) {
  const router = useRouter();
  const { authenticated } = useAdminSession();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(posts.map(({ id, title, description, thumbnail, showInList }) => ({ id, title, description, thumbnail, showInList })));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (authenticated !== true) return null;

  function update(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function upload(id: string, file: File) {
    setSavingId(id);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "이미지를 업로드하지 못했습니다.");
      update(id, { thumbnail: payload.url });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  async function save(row: Row) {
    if (!row.title.trim()) { setMessage("아티클 제목을 입력해 주세요."); return; }
    setSavingId(row.id);
    setMessage("");
    try {
      const response = await fetch(`/api/posts/${row.id}/presentation`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: row.title, description: row.description ?? "", coverImage: row.thumbnail ?? "", showInList: row.showInList }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "아티클 정보를 저장하지 못했습니다.");
      setMessage("저장했습니다. 배포가 완료되면 공개 화면에 반영됩니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "아티클 정보를 저장하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  return <section className="series-article-manager" aria-label="시리즈 아티클 관리">
    <div className="series-manager-heading"><div><p>관리자 도구</p><h2>아티클 구성</h2></div><Button type="button" onClick={() => setOpen((value) => !value)}>{open ? "접기" : "아티클 편집"}</Button></div>
    {open && <div className="series-manager-list">
      {rows.map((row, index) => <article className="series-manager-row" key={row.id}>
        <div className="series-manager-index">{String(index + 1).padStart(2, "0")}</div>
        <div className="series-manager-image">
          {row.thumbnail ? <img src={row.thumbnail} alt="" /> : <span>{row.title.slice(0, 1)}</span>}
          <label>이미지 변경<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void upload(row.id, file); }} /></label>
        </div>
        <div className="series-manager-fields">
          <input value={row.title} onChange={(event) => update(row.id, { title: event.target.value })} aria-label={`${row.title} 제목`} placeholder="아티클 제목" />
          <textarea value={row.description ?? ""} onChange={(event) => update(row.id, { description: event.target.value })} aria-label={`${row.title} 소개`} placeholder="목록에 보일 짧은 소개" rows={3} />
          <label className="series-manager-visibility"><input type="checkbox" checked={row.showInList} onChange={(event) => update(row.id, { showInList: event.target.checked })} />전체 글 목록에 노출</label>
          <div className="series-manager-actions"><Link href={`/ykk?id=${row.id}`}>본문 편집</Link><Button type="button" onClick={() => void save(row)} disabled={savingId === row.id}>{savingId === row.id ? <><span className="async-spinner" aria-hidden="true" />저장 중</> : "저장"}</Button></div>
        </div>
      </article>)}
      {rows.length === 0 && <p className="series-empty">아직 시리즈에 담긴 글이 없습니다.</p>}
      <ToastMessage message={message} tone={message.startsWith("저장했") ? "success" : "error"} />
    </div>}
  </section>;
}
