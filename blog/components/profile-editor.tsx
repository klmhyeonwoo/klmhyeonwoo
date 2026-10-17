"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import type { Profile } from "@/lib/profile";

const Editor = dynamic(() => import("./editor"), { ssr: false });

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [image, setImage] = useState(profile.image);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(profile.image);
  const [markdown, setMarkdown] = useState(profile.markdown);
  const [blocks, setBlocks] = useState<unknown[]>(profile.blocks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const updateContent = useCallback((nextBlocks: unknown[], nextMarkdown: string) => { setBlocks(nextBlocks); setMarkdown(nextMarkdown); }, []);

  useEffect(() => {
    if (!pendingImage) {
      setImagePreview(image);
      return;
    }

    const previewUrl = URL.createObjectURL(pendingImage);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [image, pendingImage]);

  function selectProfileImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("이미지는 5MB 이하여야 합니다.");
      return;
    }
    setPendingImage(file);
    setMessage("이미지를 선택했습니다. 저장하기를 누르면 GitHub에 업로드됩니다.");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      let nextImage = image;
      if (pendingImage) {
        const form = new FormData();
        form.append("file", pendingImage);
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: form });
        const uploadPayload = await uploadResponse.json() as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadPayload.url) throw new Error(uploadPayload.error ?? "이미지 업로드에 실패했습니다.");
        nextImage = uploadPayload.url;
      }

      const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, image: nextImage, markdown, blocks }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "프로필을 저장하지 못했습니다.");
      setImage(nextImage);
      setPendingImage(null);
      setMessage("GitHub에 저장했습니다. 배포 후 프로필에 반영됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로필 저장 중 연결 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="profile-editor-shell"><header><div><p className="eyebrow">PROFILE</p><h1>프로필 관리</h1></div><Button onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장하기"}</Button></header><div className="profile-fields"><Input value={name} onValueChange={setName} placeholder="이름" aria-label="이름" /><label className="profile-image-upload">프로필 이미지<input type="file" accept="image/*" onChange={(event) => selectProfileImage(event.currentTarget.files?.[0])} disabled={saving} /><span>{pendingImage ? "새 이미지 선택됨" : "이미지 선택"}</span></label>{imagePreview && <div className="profile-image-preview"><img src={imagePreview} alt="프로필 미리보기" /><Button onClick={() => { setPendingImage(null); setImage(""); }}>이미지 제거</Button></div>}</div><section className="profile-editor-intro"><p className="eyebrow">ABOUT</p><p>경력, 작업 방식, 관심사처럼 방문자에게 소개할 내용을 블록으로 자유롭게 작성하세요.</p></section><Editor initialBlocks={profile.blocks} onChange={updateContent} />{message && <p className="notice success">{message}</p>}</main>;
}
