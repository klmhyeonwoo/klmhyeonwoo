"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import type { Series } from "@/lib/series";

function seriesId(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[가-힣]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || `series-${crypto.randomUUID().slice(0, 8)}`;
}

export function SeriesCreate({ series }: { series: Series[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = name.trim();
    if (!title || saving) return;
    if (series.some((item) => item.name.toLocaleLowerCase() === title.toLocaleLowerCase())) {
      setMessage("같은 이름의 시리즈가 이미 있습니다.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      let nextCoverImage = coverImage.trim();
      if (coverFile) {
        const form = new FormData();
        form.append("file", coverFile);
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: form });
        const uploadPayload = await uploadResponse.json() as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadPayload.url) throw new Error(uploadPayload.error ?? "표지 이미지를 업로드하지 못했습니다.");
        nextCoverImage = uploadPayload.url;
      }
      const response = await fetch("/api/series", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ series: [...series, { id: seriesId(title), name: title, description: description.trim(), ...(nextCoverImage ? { coverImage: nextCoverImage } : {}) }] }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "시리즈를 만들지 못했습니다.");
      setOpen(false);
      setName("");
      setDescription("");
      setCoverImage("");
      setCoverFile(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "시리즈를 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <Button className="series-card series-create-card" onClick={() => setOpen(true)}><div className="series-book" aria-hidden="true"><div className="series-book-spine" /><div className="series-book-cover"><span>+</span></div><div className="series-book-pages" /></div><h2>새 시리즈</h2></Button>;
  return <form className="series-card series-create-card series-create-form" onSubmit={create}><div className="series-book" aria-hidden="true"><div className="series-book-spine" /><div className="series-book-cover"><span>+</span></div><div className="series-book-pages" /></div><Input autoFocus value={name} onValueChange={setName} placeholder="시리즈 이름" aria-label="시리즈 이름" required /><Input value={description} onValueChange={setDescription} placeholder="소개 (선택)" aria-label="시리즈 소개" /><Input value={coverImage} onValueChange={(value) => { setCoverFile(null); setCoverImage(value); }} placeholder="표지 이미지 URL" aria-label="표지 이미지 URL" /><label className="series-cover-upload">GitHub에 업로드<input type="file" accept="image/*" onChange={(event) => setCoverFile(event.currentTarget.files?.[0] ?? null)} /><span>{coverFile ? coverFile.name : "파일 선택"}</span></label><div className="series-create-actions"><Button type="button" onClick={() => setOpen(false)}>취소</Button><Button type="submit" disabled={saving}>{saving ? "만드는 중…" : "만들기"}</Button></div>{message && <p className="notice error">{message}</p>}</form>;
}
