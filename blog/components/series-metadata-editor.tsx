"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@base-ui/react/button";
import type { Series } from "@/lib/series";
import { useAdminSession } from "./admin-session";
import { ToastMessage } from "./toast-message";

export function SeriesMetadataEditor({ series }: { series: Series }) {
  const router = useRouter();
  const { authenticated } = useAdminSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(series.name);
  const [description, setDescription] = useState(series.description);
  const [coverImage, setCoverImage] = useState(series.coverImage ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (authenticated !== true) return null;

  async function upload(file: File) {
    setSaving(true); setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "표지 이미지를 업로드하지 못했습니다.");
      setCoverImage(payload.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "표지 이미지를 업로드하지 못했습니다."); }
    finally { setSaving(false); }
  }

  async function save() {
    if (!name.trim()) { setMessage("시리즈 이름을 입력해 주세요."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/series/${series.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description, coverImage }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "시리즈 정보를 저장하지 못했습니다.");
      setMessage("저장했습니다. 배포가 완료되면 공개 화면에 반영됩니다.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "시리즈 정보를 저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  return <section className="series-metadata-editor" aria-label="시리즈 정보 편집">
    <Button type="button" className="series-edit-trigger" onClick={() => setOpen((value) => !value)}>{open ? "시리즈 편집 닫기" : "시리즈 편집"}</Button>
    {open && <div className="series-edit-panel">
      <div className="series-edit-cover">{coverImage ? <img src={coverImage} alt="" /> : <span>{name.slice(0, 1)}</span>}<label>표지 이미지 변경<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void upload(file); }} /></label></div>
      <div className="series-edit-fields"><label>시리즈 이름<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>시리즈 소개<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="이 시리즈를 소개하는 짧은 문장" /></label><label>표지 이미지 URL<input value={coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder="https://" /></label><div><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? <><span className="async-spinner" aria-hidden="true" />저장 중</> : "변경 저장"}</Button></div></div>
      <ToastMessage message={message} tone={message.startsWith("저장했") ? "success" : "error"} />
    </div>}
  </section>;
}
