"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { BlockNoteSchema } from "@blocknote/core/blocks";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { ToastMessage } from "./toast-message";
import { Bookmark } from "./bookmark-block";
import { Callout } from "./callout-block";

export type EditorMention = { title: string; href: string; description: string };
const noMentions: EditorMention[] = [];

type Props = {
  initialBlocks?: unknown[];
  mentions?: EditorMention[];
  onChange: (blocks: unknown[], markdown: string) => void;
};

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { bookmark: Bookmark(), callout: Callout() },
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
}

function copyBlocks(blocks: unknown[]) {
  return structuredClone(blocks);
}

function normalizedHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function bookmarkTitle(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function calloutMarkdown(markdown: string, props: { emoji?: unknown; fluent?: unknown }) {
  const emoji = typeof props.emoji === "string" ? props.emoji : "💡";
  const fluent = typeof props.fluent === "string" ? props.fluent : "";
  const body = markdown.trim().split("\n").map((line) => line.replace(/^>\s?/, "")).join("\n").replace(`${emoji} `, "").trim();
  const attributes = fluent ? ` icon="${fluent}"` : ` emoji="${emoji.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
  return `<Callout${attributes}>\n${body || " "}\n</Callout>\n`;
}

export default function Editor({ initialBlocks, mentions, onChange }: Props) {
  const mentionItems = mentions ?? noMentions;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [uploadError, setUploadError] = useState("");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const uploadFile = useCallback(async (file: File) => {
    try {
      if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");
      if (file.size > 5 * 1024 * 1024) throw new Error("이미지는 5MB 이하여야 합니다.");

      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = await response.json() as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "이미지 업로드에 실패했습니다.");
      return body.url;
    } catch (error) {
      setUploadError(errorMessage(error));
      throw error;
    }
  }, []);
  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks as never : undefined,
    uploadFile,
    schema,
  }, [uploadFile]);

  const getSlashMenuItems = useCallback(async (query: string) => [
    ...getDefaultReactSlashMenuItems(editor),
    {
      key: "bookmark" as never,
      title: "링크 미리보기",
      subtext: "주소를 카드 형태로 보여줍니다",
      aliases: ["bookmark", "링크", "미리보기", "주소"],
      group: "기본",
      icon: <span aria-hidden="true">↗</span>,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "bookmark", props: { url: "" } } as never),
    },
    {
      key: "callout" as never,
      title: "콜아웃",
      subtext: "이모지로 중요한 내용을 강조합니다",
      aliases: ["callout", "콜아웃", "강조", "알림"],
      group: "기본",
      icon: <span aria-hidden="true">💡</span>,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout", props: { emoji: "💡", fluent: "LightBulb" } } as never),
    },
  ].filter((item) => [item.title, item.subtext, ...(item.aliases ?? [])].some((value) => value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()))), [editor]);

  const getMentionItems = useCallback(async (query: string) => mentionItems
    .filter((mention) => `${mention.title} ${mention.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .slice(0, 8)
    .map((mention) => ({
      key: `mention-${mention.href}` as never,
      title: mention.title,
      subtext: mention.description,
      aliases: [mention.href],
      group: "멘션",
      icon: <span aria-hidden="true">@</span>,
      onItemClick: () => editor.insertInlineContent([{ type: "link", href: mention.href, content: `@${mention.title}` }]),
    })), [editor, mentionItems]);

  const syncContent = useCallback(() => {
    const document = editor.document;
    const markdown = document.map((block) => {
      const serialized = editor.blocksToMarkdownLossy([block]);
      return block.type === "callout"
        ? calloutMarkdown(serialized, block.props as { emoji?: unknown; fluent?: unknown })
        : serialized;
    }).join("\n");
    onChange(copyBlocks(document), markdown);
  }, [editor, onChange]);

  useEffect(() => {
    syncContent();
  }, [syncContent]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;

    type ResizeState = {
      handleUsed: "left" | "right";
      id: string;
      initialClientX: number;
      initialWidth: number;
      lastClientX: number;
    };
    let resized: ResizeState | null = null;
    const clientX = (event: Event) => {
      if (event instanceof MouseEvent) return event.clientX;
      if (event instanceof TouchEvent) return event.changedTouches[0]?.clientX ?? event.touches[0]?.clientX;
      return undefined;
    };
    const startResize = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".bn-resize-handle")) return;

      const id = target.closest<HTMLElement>("[data-id]")?.dataset.id;
      const wrapper = target.closest<HTMLElement>(".bn-file-block-content-wrapper");
      const handle = target.closest<HTMLElement>(".bn-resize-handle");
      const startX = clientX(event);
      if (!id || !wrapper || !handle || startX === undefined) {
        resized = null;
        return;
      }
      resized = {
        handleUsed: handle.style.left ? "left" : "right",
        id,
        initialClientX: startX,
        initialWidth: wrapper.clientWidth,
        lastClientX: startX,
      };
    };
    const trackResize = (event: Event) => {
      const nextClientX = clientX(event);
      if (resized && nextClientX !== undefined) resized.lastClientX = nextClientX;
    };
    const finishResize = (event: Event) => {
      const activeResize = resized;
      resized = null;
      if (!activeResize) return;

      window.requestAnimationFrame(() => {
        const block = editor.getBlock(activeResize.id);
        const endClientX = clientX(event) ?? activeResize.lastClientX;
        const delta = activeResize.handleUsed === "left"
          ? activeResize.initialClientX - endClientX
          : endClientX - activeResize.initialClientX;
        const multiplier = block && "textAlignment" in block.props && block.props.textAlignment === "center" ? 2 : 1;
        const editorWidth = editor.domElement?.firstElementChild?.clientWidth ?? Number.MAX_VALUE;
        const previewWidth = Math.round(Math.min(Math.max(activeResize.initialWidth + delta * multiplier, 64), editorWidth));
        editor.updateBlock(activeResize.id, { props: { previewWidth } } as never);
      });
    };

    root.addEventListener("mousedown", startResize);
    root.addEventListener("touchstart", startResize, { passive: true });
    window.addEventListener("mousemove", trackResize);
    window.addEventListener("touchmove", trackResize, { passive: true });
    window.addEventListener("mouseup", finishResize);
    window.addEventListener("touchend", finishResize);
    return () => {
      root.removeEventListener("mousedown", startResize);
      root.removeEventListener("touchstart", startResize);
      window.removeEventListener("mousemove", trackResize);
      window.removeEventListener("touchmove", trackResize);
      window.removeEventListener("mouseup", finishResize);
      window.removeEventListener("touchend", finishResize);
    };
  }, [editor]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;

    const openImageProperties = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".bn-visual-media")) return;

      const blockElement = target.closest<HTMLElement>("[data-id]");
      const id = blockElement?.dataset.id;
      if (!id) return;

      const block = editor.getBlock(id);
      const url = block && "url" in block.props && typeof block.props.url === "string" ? block.props.url : "";
      if (!url) return;

      // BlockNote closes its floating file panel whenever the editor selection
      // changes. Keep this editor-owned panel independent from that selection
      // so an image click does not make the controls disappear immediately.
      setSelectedImageId(id);
      setSelectedImageUrl(url);
    };

    root.addEventListener("click", openImageProperties);
    return () => root.removeEventListener("click", openImageProperties);
  }, [editor]);

  const updateSelectedImageUrl = useCallback((url: string) => {
    if (!selectedImageId || !normalizedHttpUrl(url)) return;
    editor.updateBlock(selectedImageId, { props: { url } } as never);
    setSelectedImageUrl(url);
  }, [editor, selectedImageId]);

  const replaceSelectedImage = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedImageId) return;

    const url = await uploadFile(file);
    editor.updateBlock(selectedImageId, { props: { url, name: file.name } } as never);
    setSelectedImageUrl(url);
    event.target.value = "";
  }, [editor, selectedImageId, uploadFile]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;

    const insertBookmarkFromPaste = (event: ClipboardEvent) => {
      const url = normalizedHttpUrl(event.clipboardData?.getData("text/plain") ?? "");
      if (!url) return;

      event.preventDefault();
      const currentBlock = editor.getTextCursorPosition().block;
      const bookmark = {
        type: "bookmark",
        props: { url },
        content: [{ type: "text", text: bookmarkTitle(url), styles: {} }],
      };
      const isEmptyParagraph = currentBlock.type === "paragraph" && Array.isArray(currentBlock.content) && currentBlock.content.length === 0;
      if (isEmptyParagraph) editor.updateBlock(currentBlock, bookmark as never);
      else editor.insertBlocks([bookmark as never], currentBlock, "after");
    };

    root.addEventListener("paste", insertBookmarkFromPaste);
    return () => root.removeEventListener("paste", insertBookmarkFromPaste);
  }, [editor]);

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="editor" aria-label="본문 편집기">
      <BlockNoteView
        editor={editor}
        slashMenu={false}
        theme={theme}
        onChange={syncContent}
      ><SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} /><SuggestionMenuController triggerCharacter="@" getItems={getMentionItems} /></BlockNoteView>
      {selectedImageId && <aside className="image-properties" aria-label="이미지 속성" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.75rem", background: "var(--surface)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1 1 20rem" }}>
          <span>이미지 주소</span>
          <input style={{ minWidth: 0, flex: 1 }} value={selectedImageUrl} onChange={(event) => setSelectedImageUrl(event.target.value)} onBlur={() => updateSelectedImageUrl(selectedImageUrl)} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              updateSelectedImageUrl(selectedImageUrl);
            }
          }} />
        </label>
        <label className="image-properties-upload" style={{ cursor: "pointer" }}>
          이미지 바꾸기
          <input type="file" accept="image/*" onChange={replaceSelectedImage} />
        </label>
        <button type="button" onClick={() => setSelectedImageId(null)}>닫기</button>
      </aside>}
      <ToastMessage message={uploadError} tone="error" />
    </section>
  );
}
