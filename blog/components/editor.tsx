"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { useCreateBlockNote } from "@blocknote/react";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ToastMessage } from "./toast-message";

type Props = {
  initialBlocks?: unknown[];
  onChange: (blocks: unknown[], markdown: string) => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
}

export default function Editor({ initialBlocks, onChange }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");
    if (file.size > 5 * 1024 * 1024) throw new Error("이미지는 5MB 이하여야 합니다.");

    const form = new FormData();
    form.append("file", file);

    let response: Response;
    let body: { url?: string; error?: string } = {};
    try {
      response = await fetch("/api/upload", { method: "POST", body: form });
      body = await response.json() as { url?: string; error?: string };
    } catch {
      throw new Error("이미지 업로드 서버에 연결하지 못했습니다.");
    }

    if (!response.ok || !body.url) throw new Error(body.error ?? "이미지 업로드에 실패했습니다.");
    return body.url;
  }, []);
  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks as never : undefined,
    uploadFile,
  }, [uploadFile]);

  async function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadFile(file);
      editor.insertBlocks([{ type: "image", props: { url } }], editor.getTextCursorPosition().block, "after");
    } catch (error) {
      setUploadError(errorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  function turnCurrentBlockIntoCallout() {
    editor.updateBlock(editor.getTextCursorPosition().block, { type: "quote" });
  }

  useEffect(() => {
    onChange(editor.document, editor.blocksToMarkdownLossy(editor.document));
  }, [editor, onChange]);

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="editor" aria-label="본문 편집기">
      <div className="editor-actions">
        <input ref={imageInputRef} type="file" accept="image/*" onChange={insertImage} aria-label="이미지 파일 선택" tabIndex={-1} />
        <button type="button" className="editor-image-button" onClick={() => imageInputRef.current?.click()} disabled={uploading}>{uploading ? "이미지 업로드 중…" : "이미지 추가"}</button>
        <button type="button" className="editor-image-button" onClick={turnCurrentBlockIntoCallout}>콜아웃</button>
        <span className="editor-image-hint">이미지는 양쪽 핸들로 크기를 조절할 수 있어요.</span>
      </div>
      <BlockNoteView
        editor={editor}
        theme={theme}
        onChange={() => onChange(editor.document, editor.blocksToMarkdownLossy(editor.document))}
      />
      <ToastMessage message={uploadError} tone="error" />
    </section>
  );
}
