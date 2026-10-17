"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";

type Props = {
  initialBlocks?: unknown[];
  onChange: (blocks: unknown[], markdown: string) => void;
};

export default function Editor({ initialBlocks, onChange }: Props) {
  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks as never : undefined,
    uploadFile: async (file) => {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "이미지 업로드에 실패했습니다.");
      return body.url as string;
    },
  });

  useEffect(() => {
    onChange(editor.document, editor.blocksToMarkdownLossy(editor.document));
  }, [editor, onChange]);

  return (
    <section className="editor" aria-label="본문 편집기">
      <BlockNoteView
        editor={editor}
        onChange={() => onChange(editor.document, editor.blocksToMarkdownLossy(editor.document))}
      />
    </section>
  );
}
