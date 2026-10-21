"use client";

import { Extension } from "@tiptap/core";
import { SlashEditorTools, slashLabel } from "./slash-editor-tools";
import { BookmarkNode, LinkMentionNode, LinkPasteTools, linkFormatEvent } from "./slash-link-blocks";
import { createPortal } from "react-dom";
import "./editor-interactions.css";
import { convertBlocks, markdownFor } from "@/lib/slash-content";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { createBlockKit, defaultSlashItems } from "@slash-editor/core";
import { emoji } from "@slash-editor/core/emoji";
import { nativeMediaNodes } from "./slash-media-blocks";
import { EditorContent, EditorContext, useCurrentEditor, useSlashEditor } from "@slash-editor/react";
import TiptapImage from "@tiptap/extension-image";
import { type FormEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const lowlight = createLowlight(common);

export type EditorMention = { title: string; href: string; description: string };
type Props = { initialBlocks?: unknown[]; mentions?: EditorMention[]; onChange: (blocks: unknown[], markdown: string) => void };
type JsonNode = { type?: string; attrs?: Record<string, unknown>; content?: JsonNode[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }>; [key: string]: unknown };
type ImageRequestDetail = { onSelect?: (url: string, alt: string) => void };

const imageRequestEvent = "wavy:editor-image-request";

const imageUrlRequestEvent = "wavy:editor-image-url-request";
const linkRequestEvent = "wavy:editor-link-request";

// Preserve legacy presentation metadata when old posts are edited with the native callout.
const LegacyCalloutMetadata = Extension.create({
  name: "legacyCalloutMetadata",
  addGlobalAttributes() {
    return [{ types: ["callout"], attributes: {
      fluentUrl: { default: "", rendered: false },
      background: { default: "default", rendered: false },
    } }, { types: ["table"], attributes: {
      fullWidth: { default: true, parseHTML: (element: HTMLElement) => element.getAttribute("data-full-width") !== "false", renderHTML: (attrs: Record<string, unknown>) => ({ "data-full-width": String(attrs.fullWidth) }) },
    } }];
  },
});

const codeLanguages = [
  ["text", "Plain text"], ["typescript", "TypeScript"], ["javascript", "JavaScript"], ["tsx", "TSX / React"],
  ["jsx", "JSX"], ["json", "JSON"], ["html", "HTML"], ["css", "CSS"], ["scss", "SCSS"], ["bash", "Bash"],
  ["shell", "Shell"], ["sql", "SQL"], ["python", "Python"], ["java", "Java"], ["go", "Go"], ["rust", "Rust"],
] as const;

function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = typeof node.attrs.language === "string" && node.attrs.language ? node.attrs.language : "text";
  return <NodeViewWrapper as="div" className="tiptap-code-block">
    <div className="tiptap-code-block-header" contentEditable={false}>
      <label>코드 언어<select value={language} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => updateAttributes({ language: event.target.value })}>{codeLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <span>Tab으로 들여쓰기</span>
    </div>
    <pre><NodeViewContent<"code"> as="code" /></pre>
  </NodeViewWrapper>;
}

const BlogCodeBlock = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    return {
      ...(this.parent?.() ?? {}),
      Tab: () => this.editor.isActive(this.name) ? this.editor.commands.insertContent("\t") : false,
    };
  },
  addNodeView() { return ReactNodeViewRenderer(CodeBlockView); },
});

function ImageBlockView({ node, selected, updateAttributes }: NodeViewProps) {
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const width = typeof node.attrs.width === "number" && node.attrs.width > 0 ? node.attrs.width : null;
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const resizeCleanup = useRef<() => void>(() => {});
  useEffect(() => () => resizeCleanup.current(), []);
  const requestFile = () => window.dispatchEvent(new CustomEvent<ImageRequestDetail>(imageRequestEvent, { detail: { onSelect: (url, alt) => updateAttributes({ src: url, alt, width: null }) } }));
  const requestUrl = () => window.dispatchEvent(new CustomEvent<ImageRequestDetail>(imageUrlRequestEvent, { detail: { onSelect: (url) => updateAttributes({ src: url, alt: "", width: null }) } }));

  const resize = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget as HTMLElement;
    const element = handle.closest<HTMLElement>(".tiptap-image-block");
    if (!element) return;
    handle.setPointerCapture?.(event.pointerId);
    const startX = event.clientX;
    const startWidth = element.getBoundingClientRect().width;
    const parent = element.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    const maxWidth = parent ? parent.clientWidth - parseFloat(parentStyle?.paddingLeft ?? "0") - parseFloat(parentStyle?.paddingRight ?? "0") : startWidth;
    const fromLeft = handle.dataset.edge === "left";
    let nextWidth = startWidth;
    const move = (moveEvent: globalThis.PointerEvent) => {
      nextWidth = Math.round(Math.min(maxWidth, Math.max(9.5 * 16, startWidth + 2 * (fromLeft ? startX - moveEvent.clientX : moveEvent.clientX - startX))));
      setDragWidth(nextWidth);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    const finish = () => { cleanup(); updateAttributes({ width: nextWidth }); setDragWidth(null); };
    const cancel = () => { cleanup(); setDragWidth(null); };
    resizeCleanup.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
  };

  return <NodeViewWrapper as="figure" className={`tiptap-image-block${selected ? " is-selected" : ""}`} style={{ width: (dragWidth ?? width) ? `${dragWidth ?? width}px` : undefined }}>
    <div className="tiptap-image-frame" contentEditable={false}>
      {src ? <img src={src} alt={typeof node.attrs.alt === "string" ? node.attrs.alt : ""} /> : <div className="tiptap-image-empty"><span aria-hidden="true">▧</span><strong>이미지</strong><small>파일을 올리거나 이미지 주소를 입력하세요.</small><div><button type="button" onPointerDown={(event) => event.preventDefault()} onClick={requestFile}>파일 선택</button><button type="button" onPointerDown={(event) => event.preventDefault()} onClick={requestUrl}>링크 입력</button></div></div>}
      {src && <div className="tiptap-image-actions"><button type="button" onPointerDown={(event) => event.preventDefault()} onClick={requestFile}>파일 변경</button><button type="button" onPointerDown={(event) => event.preventDefault()} onClick={requestUrl}>링크 변경</button></div>}
    </div>
    {selected && <><button type="button" className="tiptap-image-resize top-left" data-edge="left" aria-label="이미지 너비 조절" onPointerDown={resize} /><button type="button" className="tiptap-image-resize top-right" data-edge="right" aria-label="이미지 너비 조절" onPointerDown={resize} /><button type="button" className="tiptap-image-resize bottom-left" data-edge="left" aria-label="이미지 너비 조절" onPointerDown={resize} /><button type="button" className="tiptap-image-resize bottom-right" data-edge="right" aria-label="이미지 너비 조절" onPointerDown={resize} /></>}
  </NodeViewWrapper>;
}

const ImageBlock = TiptapImage.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = Number(element.getAttribute("data-width") ?? element.getAttribute("width"));
          return Number.isFinite(value) && value > 0 ? value : null;
        },
        renderHTML: (attributes) =>
          typeof attributes.width === "number" && attributes.width > 0
            ? { "data-width": String(attributes.width) }
            : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView, {
      // Keep ProseMirror from resetting the node selection before a resize drag begins.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return Boolean(target?.closest(".tiptap-image-resize, .tiptap-image-actions, .tiptap-image-empty"));
      },
    });
  },
});



function EditorButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} data-active={active || undefined} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</button>;
}

function NovelEditorChrome({ onUpload }: { onUpload: (file: File) => Promise<string | undefined> }) {
  const { editor } = useCurrentEditor();
  const imageInput = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const pendingImageTarget = useRef<ImageRequestDetail["onSelect"] | undefined>(undefined);
  const linkRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [urlDialog, setUrlDialog] = useState<"image" | "link" | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => { editorRef.current = editor; }, [editor]);
  useEffect(() => {
    const requestImage = (event: Event) => { pendingImageTarget.current = (event as CustomEvent<ImageRequestDetail>).detail?.onSelect; imageInput.current?.click(); };
    const requestImageUrl = (event: Event) => { pendingImageTarget.current = (event as CustomEvent<ImageRequestDetail>).detail?.onSelect; setUrl(""); setUrlDialog("image"); };
    const requestLink = (event: Event) => {
      const detail = (event as CustomEvent<{ href?: string; from?: number; to?: number }>).detail;
      linkRangeRef.current = typeof detail?.from === "number" && typeof detail.to === "number" ? { from: detail.from, to: detail.to } : null;
      setUrl(detail?.href ?? "");
      setUrlDialog("link");
    };
    window.addEventListener(imageRequestEvent, requestImage);
    window.addEventListener(imageUrlRequestEvent, requestImageUrl);
    window.addEventListener(linkRequestEvent, requestLink);
    return () => { window.removeEventListener(imageRequestEvent, requestImage); window.removeEventListener(imageUrlRequestEvent, requestImageUrl); window.removeEventListener(linkRequestEvent, requestLink); };
  }, []);
  useEffect(() => { if (urlDialog) window.requestAnimationFrame(() => urlInput.current?.focus()); }, [urlDialog]);

  if (!editor) return null;
  const insertImage = (src: string, alt = "") => {
    const target = pendingImageTarget.current;
    pendingImageTarget.current = undefined;
    if (target) target(src, alt);
    else editorRef.current?.chain().focus().setImage({ src, alt }).run();
  };
  const addImage = async (file: File) => { const url = await onUpload(file); if (url) insertImage(url, file.name); };
  const submitUrl = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = url.trim();
    if (!target) return;
    if (urlDialog === "image") insertImage(target);
    if (urlDialog === "link") {
      const range = linkRangeRef.current;
      const chain = editor.chain().focus();
      if (range) chain.setTextSelection(range);
      chain.extendMarkRange("link").setLink({ href: target }).run();
      editor.view.dom.dispatchEvent(new Event(linkFormatEvent));
    }
    setUrlDialog(null);
  };
  return <><input ref={imageInput} className="tiptap-file-input" type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void addImage(file); }} />{urlDialog && <div className="tiptap-url-dialog-backdrop" role="presentation" onMouseDown={() => setUrlDialog(null)}><form className="tiptap-url-dialog" role="dialog" aria-modal="true" aria-label={urlDialog === "image" ? "이미지 주소 입력" : "링크 주소 입력"} onMouseDown={(event) => event.stopPropagation()} onSubmit={submitUrl}><label>{urlDialog === "image" ? "이미지 주소" : "링크 주소"}<input ref={urlInput} value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="https://" /></label><div><button type="button" onClick={() => setUrlDialog(null)}>취소</button><button type="submit">삽입</button></div></form></div>}<TableControls editor={editor} /></>;
}

function TableControls({ editor }: { editor: Editor }) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const sync = () => {
      if (!editor.isActive("table")) { setPosition(null); return; }
      const dom = editor.view.domAtPos(editor.state.selection.from).node;
      const element = dom instanceof HTMLElement ? dom : dom.parentElement;
      const table = element?.closest("table");
      if (!table) { setPosition(null); return; }
      const rect = table.getBoundingClientRect();
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)), top: Math.max(8, rect.top - 44) });
    };
    sync();
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => { editor.off("selectionUpdate", sync); editor.off("transaction", sync); window.removeEventListener("scroll", sync, true); window.removeEventListener("resize", sync); };
  }, [editor]);

  if (!position) return null;
  const action = (run: () => void) => () => run();
    return createPortal(<div className="tiptap-table-controls" style={{ position: "fixed", ...position, zIndex: 45, maxWidth: "calc(100vw - 16px)" }} role="toolbar" aria-label="표 편집 도구">
      <EditorButton
        label={editor.getAttributes("table").fullWidth === false ? "본문 너비로" : "전체 너비"}
        onClick={() => editor.chain().focus().updateAttributes("table", { fullWidth: editor.getAttributes("table").fullWidth === false }).run()}
      >
        {editor.getAttributes("table").fullWidth === false ? "전체 너비" : "본문 너비"}
      </EditorButton>
    <span>표</span>
    <EditorButton label="왼쪽 열 추가" onClick={action(() => editor.chain().focus().addColumnBefore().run())}>←열</EditorButton>
    <EditorButton label="오른쪽 열 추가" onClick={action(() => editor.chain().focus().addColumnAfter().run())}>열→</EditorButton>
    <EditorButton label="위 행 추가" onClick={action(() => editor.chain().focus().addRowBefore().run())}>↑행</EditorButton>
    <EditorButton label="아래 행 추가" onClick={action(() => editor.chain().focus().addRowAfter().run())}>행↓</EditorButton>
    <EditorButton label="현재 열 삭제" onClick={action(() => editor.chain().focus().deleteColumn().run())}>열−</EditorButton>
    <EditorButton label="현재 행 삭제" onClick={action(() => editor.chain().focus().deleteRow().run())}>행−</EditorButton>
    <EditorButton label="셀 병합 또는 분할" onClick={action(() => editor.chain().focus().mergeOrSplit().run())}>병합/분할</EditorButton>
    <EditorButton label="제목 행 전환" onClick={action(() => editor.chain().focus().toggleHeaderRow().run())}>제목 행</EditorButton>
    <EditorButton label="제목 열 전환" onClick={action(() => editor.chain().focus().toggleHeaderColumn().run())}>제목 열</EditorButton>
    <EditorButton label="표 삭제" onClick={action(() => editor.chain().focus().deleteTable().run())}>표 삭제</EditorButton>
  </div>, document.body);
}

function TiptapSurface({ initial, mentions, onChange }: { initial: JsonNode; mentions?: EditorMention[]; onChange: (document: JsonNode) => void }) {
  const mentionsRef = useRef(mentions);
  useEffect(() => { mentionsRef.current = mentions; }, [mentions]);
  const extensions = useMemo(() => createBlockKit({
    image: false,
    emoji: emoji(),
    mention: { items: query => (mentionsRef.current ?? []).filter(item => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 20).map(item => ({ id: item.href, label: item.title, description: item.description })) },
    codeBlock: BlogCodeBlock.configure({ lowlight, defaultLanguage: "text" }),
    link: { openOnClick: false },
    toggle: { renderToggleButton: ({ element, isOpen }) => {
      if (!element.firstChild) element.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
      element.dataset.state = isOpen ? "open" : "closed";
      element.setAttribute("aria-label", isOpen ? "내용 접기" : "내용 펼치기");
      element.setAttribute("aria-expanded", String(isOpen));
    } },
    placeholder: { text: { paragraph: "내용을 입력하거나 '/'로 블록을 추가하세요", heading1: "제목 1", heading2: "제목 2", heading3: "제목 3", callout: "강조할 내용을 입력하세요", listItem: "목록", taskItem: "할 일" } },
    slash: { items: defaultSlashItems.map(item => ({ ...item, title: slashLabel(item.id, item.title), aliases: [...(item.aliases ?? []), item.title], ...(item.id === "image" ? { run: ({ editor, range }: Parameters<typeof item.run>[0]) => { editor.chain().focus().deleteRange(range).setImage({ src: "" }).run(); } } : {}) })) },
    extend: [LegacyCalloutMetadata, ImageBlock.configure({ inline: false, allowBase64: false }), BookmarkNode, LinkMentionNode],
  }).map(extension => nativeMediaNodes.find(node => node.name === extension.name) ?? extension), []);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const [uploadError, setUploadError] = useState("");
  const uploadImage = useCallback(async (file: File) => {
    try {
      if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");
      if (file.size > 5 * 1024 * 1024) throw new Error("이미지는 5MB 이하여야 합니다.");
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = await response.json() as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "이미지 업로드에 실패했습니다.");
      return body.url;
    } catch (error) { setUploadError(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다."); }
  }, []);
  const editor = useSlashEditor({ blockKit: false, extensions, content: initial,
    editorProps: { attributes: { class: "tiptap-prose slash-content", "aria-label": "게시글 본문" } },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON() as JsonNode),
  });
  return <section className="tiptap-editor-shell" data-editor="slash-editor"><EditorContext.Provider value={{ editor }}><EditorContent editor={editor} />{editor && <><SlashEditorTools editor={editor} /><NovelEditorChrome onUpload={uploadImage} /><LinkPasteTools editor={editor} /></>}</EditorContext.Provider>{uploadError && <p className="tiptap-editor-error" role="alert">{uploadError}</p>}</section>;
}

export default function TiptapBlogEditor({ initialBlocks, mentions, onChange }: Props) {
  const initial = useMemo(() => convertBlocks(initialBlocks), [initialBlocks]);
  const persistContent = useCallback((document: JsonNode) => onChange([{ type: "slash-content", version: 1, content: document }], markdownFor(document)), [onChange]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ProseMirror owns and mutates its DOM. Delaying that initialization until
  // after hydration guarantees React never reconciles against editor markup.
  if (!mounted) return <section className="tiptap-editor-shell" aria-busy="true" />;
  return <TiptapSurface key={JSON.stringify(initial)} initial={initial} mentions={mentions} onChange={persistContent} />;
}
