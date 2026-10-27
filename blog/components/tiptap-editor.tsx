"use client";

import { Extension, InputRule } from "@tiptap/core";
import { EditorFileDrop } from "./editor-file-drop";
import { ImageCarousel } from "./image-carousel";
import { imageFileAccept, imageUploadStatus, uploadImage as uploadOptimizedImage, type ImageUploadProgress } from "@/lib/client-image-upload";
import { cropRatio, imageCropAspects, imageCropFrom, type ImageCropAspect } from "@/lib/image-crop";
import { SlashEditorTools, slashLabel } from "./slash-editor-tools";
import { BookmarkNode, LinkMentionNode, LinkPasteTools, linkFormatEvent } from "./slash-link-blocks";
import { createPortal } from "react-dom";
import "./editor-interactions.css";
import { convertBlocks, markdownFor } from "@/lib/slash-content";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { createBlockKit, defaultBlockTypes, defaultSlashItems, type BlockType, type SlashItem } from "@slash-editor/core";
import { emoji } from "@slash-editor/core/emoji";
import { nativeMediaNodes } from "./slash-media-blocks";
import { EditorContent, EditorContext, useCurrentEditor, useSlashEditor } from "@slash-editor/react";
import TiptapImage from "@tiptap/extension-image";
import { memo, type ChangeEvent, type CSSProperties, type FormEvent, type MouseEvent as ReactMouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const lowlight = createLowlight(common);

export type EditorMention = { title: string; href: string; description: string };
type Props = { initialBlocks?: unknown[]; mentions?: EditorMention[]; onChange: (blocks: unknown[], markdown: string) => void };
type JsonNode = { type?: string; attrs?: Record<string, unknown>; content?: JsonNode[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }>; [key: string]: unknown };
type ImageRequestDetail = { onSelect?: (url: string, alt: string) => void };

const imageUrlRequestEvent = "wavy:editor-image-url-request";
const linkRequestEvent = "wavy:editor-link-request";

// Heading 4 is intentionally a quiet, non-outline heading: useful for a
// small section label, but not prominent enough to add noise to the article
// table of contents.
const headingFourBlockType: BlockType = {
  id: "heading-4",
  title: "제목 4",
  group: "Basic blocks",
  description: "작은 보조 제목",
  aliases: ["h4", "heading4", "제목4"],
  keywords: ["####"],
  shortcut: "####",
  icon: "heading-4",
  when: (editor) => Boolean(editor.schema.nodes.heading),
  isActive: (editor) => editor.isActive("heading", { level: 4 }),
  convert: ({ editor, pos }) => {
    const chain = editor.chain().focus();
    if (typeof pos === "number") chain.setTextSelection(pos + 1);
    return chain.setNode("heading", { level: 4 }).run();
  },
};

const headingFourSlashItem: SlashItem = {
  id: "heading-4",
  title: "제목 4",
  group: "Basic blocks",
  description: "작은 보조 제목",
  aliases: ["h4", "heading4", "제목4"],
  keywords: ["####"],
  shortcut: "####",
  icon: "heading-4",
  when: (editor) => Boolean(editor.schema.nodes.heading),
  run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 4 }).run(),
};

const blockTypesWithHeadingFour = defaultBlockTypes.flatMap((item) => item.id === "heading-3" ? [item, headingFourBlockType] : [item]);
const carouselSlashItem: SlashItem = {
  id: "image-carousel", title: "이미지 캐러셀", group: "Media", description: "여러 사진을 넘겨볼 수 있습니다", aliases: ["캐러셀", "사진 모음", "carousel", "gallery"], icon: "image",
  when: (editor) => Boolean(editor.schema.nodes.imageCarousel),
  run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: "imageCarousel", content: [{ type: "image", attrs: { src: "" } }] }).run(),
};
const slashItemsWithHeadingFour = defaultSlashItems.flatMap((item) => item.id === "paragraph" ? [item, carouselSlashItem] : item.id === "heading-3" ? [item, headingFourSlashItem] : [item]);

// Keep small, familiar writing shortcuts in prose without changing code or
// URLs. The rule runs as soon as `->` is complete; undo restores the source
// characters as a single edit.
const TypographicShortcuts = Extension.create({
  name: "typographicShortcuts",
  addInputRules() {
    return [new InputRule({
      // Start of a block or whitespace avoids rewriting an identifier such as
      // `foo->bar`, where the ASCII characters can be meaningful.
      find: /(?<!\S)->$/,
      handler: ({ state, range, commands }) => {
        if (state.selection.$from.parent.type.spec.code) return null;
        commands.insertContentAt(range, "→");
      },
    })];
  },
});

// Preserve legacy presentation metadata when old posts are edited with the native callout.
const LegacyCalloutMetadata = Extension.create({
  name: "legacyCalloutMetadata",
  addGlobalAttributes() {
    return [{ types: ["paragraph", "heading"], attributes: {
      textAlign: { default: "left", parseHTML: (element: HTMLElement) => element.style.textAlign || "left", renderHTML: (attrs: Record<string, unknown>) => ({ style: `text-align: ${["center", "right"].includes(String(attrs.textAlign)) ? attrs.textAlign : "left"}` }) },
    } }, { types: ["column"], attributes: {
      verticalAlign: { default: "top", parseHTML: (element: HTMLElement) => element.getAttribute("data-vertical-align") || "top", renderHTML: (attrs: Record<string, unknown>) => ({ "data-vertical-align": attrs.verticalAlign }) },
    } }, { types: ["callout"], attributes: {
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

function TiptapImageCropDialog({ src, crop, updateAttributes, onClose }: {
  src: string;
  crop: ReturnType<typeof imageCropFrom>;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [aspect, setAspect] = useState<ImageCropAspect>(crop.aspect);
  const [focusX, setFocusX] = useState(crop.focusX);
  const [focusY, setFocusY] = useState(crop.focusY);
  const [zoom, setZoom] = useState(crop.zoom);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(448);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; focusX: number; focusY: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  useEffect(() => {
    const updateCanvasHeight = () => setCanvasHeight(Math.min(window.innerHeight * 0.56, 560));
    updateCanvasHeight();
    window.addEventListener("resize", updateCanvasHeight);
    return () => window.removeEventListener("resize", updateCanvasHeight);
  }, []);

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (aspect === "original") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, focusX, focusY };
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!state || state.pointerId !== event.pointerId || !bounds) return;
    setFocusX(Math.min(100, Math.max(0, state.focusX - ((event.clientX - state.x) / bounds.width) * 100)));
    setFocusY(Math.min(100, Math.max(0, state.focusY - ((event.clientY - state.y) / bounds.height) * 100)));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => { if (drag.current?.pointerId === event.pointerId) drag.current = null; };
  const reset = () => { setAspect("original"); setFocusX(50); setFocusY(50); setZoom(1); };
  const apply = () => { updateAttributes({ cropAspect: aspect, cropX: focusX, cropY: focusY, cropZoom: zoom }); onClose(); };
  const fixedAspect = cropRatio(aspect);
  const [aspectWidth, aspectHeight] = fixedAspect?.split("/").map(Number) ?? [];
  const previewAspect = aspectWidth && aspectHeight ? aspectWidth / aspectHeight : naturalAspect ?? (9 / 16);
  const isPortraitPreview = previewAspect < 1;
  const portraitWidth = Math.round(Math.min(320, canvasHeight * previewAspect));

  if (typeof document === "undefined") return null;

  return createPortal(<div className="image-crop-backdrop" onMouseDown={onClose} role="presentation">
    <dialog aria-describedby="image-crop-description" aria-labelledby="image-crop-title" className="image-crop-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }} onMouseDown={(event) => event.stopPropagation()} open>
      <header><div><p>이미지 편집</p><h2 id="image-crop-title">사진 자르기</h2></div><button aria-label="사진 편집 닫기" onClick={onClose} type="button">×</button></header>
      <p id="image-crop-description">비율을 고른 뒤 사진을 직접 드래그해 보여줄 영역을 맞추세요.</p>
      <div aria-label="사진 자르기 영역" className={`image-crop-canvas${aspect === "original" ? " is-original" : ""}${isPortraitPreview ? " is-portrait" : ""}`} onPointerCancel={endDrag} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} ref={canvasRef} style={{ aspectRatio: previewAspect, ...(isPortraitPreview ? { width: `${portraitWidth}px` } : {}) }}>
        <img alt="" draggable={false} onLoad={(event) => { const { naturalHeight, naturalWidth } = event.currentTarget; if (naturalWidth && naturalHeight) setNaturalAspect(naturalWidth / naturalHeight); }} src={src} style={{ objectPosition: `${focusX}% ${focusY}%`, transform: `scale(${zoom})`, transformOrigin: `${focusX}% ${focusY}%` }} />
        <span aria-hidden="true" className="image-crop-grid" />
      </div>
      <div className="image-crop-options">
        <div aria-label="자르기 비율" className="image-crop-aspects" role="group">
          {imageCropAspects.map((option) => <button className={aspect === option ? "is-selected" : undefined} key={option} onClick={() => { setAspect(option); if (option === "original") reset(); }} type="button">{option === "original" ? "원본" : option}</button>)}
        </div>
        <div className="image-crop-zoom"><label>확대 <input aria-label="이미지 확대" disabled={aspect === "original"} max="3" min="1" onChange={(event) => setZoom(Number(event.currentTarget.value))} step="0.01" type="range" value={zoom} /></label><span aria-live="polite" className="image-crop-zoom-value">{Math.round(zoom * 100)}%</span></div>
      </div>
      <footer><button onClick={reset} type="button">원본으로</button><span /><button onClick={onClose} type="button">취소</button><button className="is-primary" onClick={apply} type="button">적용</button></footer>
    </dialog>
  </div>, document.body);
}

type ImageUploadState = { file: File; progress?: ImageUploadProgress; error?: string };
type UpdateImageAttributes = (attrs: Record<string, unknown>) => void;

function useImageUploader(updateAttributes: UpdateImageAttributes) {
  const [upload, setUpload] = useState<ImageUploadState | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const updateAttributesRef = useRef(updateAttributes);
  useEffect(() => { updateAttributesRef.current = updateAttributes; }, [updateAttributes]);
  const uploadFile = useCallback(async (file: File) => {
    setUpload({ file, progress: { stage: "converting", progress: 0 } });
    try {
      const result = await uploadOptimizedImage(file, (progress) => setUpload((current) => current?.file === file ? { ...current, progress } : current));
      updateAttributesRef.current({ src: result.url, alt: file.name, width: null, cropAspect: "original", cropX: 50, cropY: 50, cropZoom: 1 });
      setUpload(null);
    } catch (error) {
      setUpload({ file, error: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다." });
    }
  }, []);
  const onFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void uploadFile(file);
  }, [uploadFile]);
  const requestFile = useCallback(() => imageInput.current?.click(), []);
  const retry = useCallback(() => { if (upload) void uploadFile(upload.file); }, [upload, uploadFile]);
  return { imageInput, onFileChange, requestFile, retry, setUpload, upload };
}

function ImageUploadCard({ upload, retry, dismiss }: { upload: ImageUploadState; retry: () => void; dismiss: () => void }) {
  const status = imageUploadStatus(upload.progress);
  const progress = upload.progress?.stage === "converting" ? status.progress : undefined;
  return <div className="editor-upload-status" data-state={upload.error ? "error" : "loading"} data-stage={upload.progress?.stage ?? "error"} aria-live={upload.error ? "assertive" : "polite"}>
    <span className="editor-upload-status__indicator" aria-hidden="true" />
    <div className="editor-upload-status__content">
      <strong>{upload.error ? "사진을 올리지 못했어요" : status.title}</strong>
      <span className="editor-upload-status__filename" title={upload.file.name}>{upload.file.name}</span>
      <span className="editor-upload-status__detail">{upload.error ?? status.detail}</span>
      {!upload.error && <span className="editor-upload-status__progress" aria-hidden="true"><span style={{ "--upload-progress": `${progress ?? 20}%` } as CSSProperties} /></span>}
    </div>
    {upload.error && <div className="editor-upload-status__actions"><button type="button" onClick={retry}>다시 시도</button><button type="button" onClick={dismiss}>닫기</button></div>}
  </div>;
}

type ImageBlockContentProps = {
  src: string;
  alt: string;
  crop: ReturnType<typeof imageCropFrom>;
  upload: ImageUploadState | null;
  requestFile: () => void;
  requestUrl: () => void;
  openCrop: () => void;
  retry: () => void;
  dismiss: () => void;
};

const ImageBlockContent = memo(function ImageBlockContent({ src, alt, crop, upload, requestFile, requestUrl, openCrop, retry, dismiss }: ImageBlockContentProps) {
  const keepImageSelection = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  if (upload) return <ImageUploadCard upload={upload} retry={retry} dismiss={dismiss} />;
  if (src) {
    const imageStyle = crop.aspect === "original" ? undefined : { objectPosition: `${crop.focusX}% ${crop.focusY}%`, transform: `scale(${crop.zoom})`, transformOrigin: `${crop.focusX}% ${crop.focusY}%` };
    return <><img draggable={false} src={src} alt={alt} style={imageStyle} /><div className="tiptap-image-actions"><button type="button" onPointerDown={keepImageSelection} onClick={(event) => { event.stopPropagation(); requestFile(); }}>파일 변경</button><button type="button" onPointerDown={keepImageSelection} onClick={(event) => { event.stopPropagation(); requestUrl(); }}>링크 변경</button><button type="button" onPointerDown={keepImageSelection} onClick={(event) => { event.stopPropagation(); openCrop(); }}>사진 편집</button></div></>;
  }
  return <div className="tiptap-image-empty"><span aria-hidden="true">▧</span><strong>이미지</strong><small>파일을 올리거나 이미지 주소를 입력하세요.</small><div><button type="button" onPointerDown={keepImageSelection} onClick={(event) => { event.stopPropagation(); requestFile(); }}>파일 선택</button><button type="button" onPointerDown={keepImageSelection} onClick={(event) => { event.stopPropagation(); requestUrl(); }}>링크 입력</button></div></div>;
}, (previous, next) => previous.src === next.src
  && previous.alt === next.alt
  && previous.upload === next.upload
  && previous.crop.aspect === next.crop.aspect
  && previous.crop.focusX === next.crop.focusX
  && previous.crop.focusY === next.crop.focusY
  && previous.crop.zoom === next.crop.zoom
  && previous.requestFile === next.requestFile
  && previous.requestUrl === next.requestUrl
  && previous.openCrop === next.openCrop
  && previous.retry === next.retry
  && previous.dismiss === next.dismiss);

const imageWidthPresets = [
  { id: "small", label: "S", ratio: 1 / 3, tooltip: "작게 · 본문 폭 1/3" },
  { id: "medium", label: "M", ratio: 1 / 2, tooltip: "중간 · 본문 폭 1/2" },
  { id: "large", label: "L", ratio: 2 / 3, tooltip: "크게 · 본문 폭 2/3" },
  { id: "full", label: "↔", ratio: null, tooltip: "본문 너비에 맞춤" },
] as const;

function imageWidthContainer(element: HTMLElement | null) {
  const renderer = element?.closest<HTMLElement>(".react-renderer");
  return (renderer?.closest(".editor-carousel") ? renderer : renderer?.parentElement) ?? element?.parentElement;
}

function imageAvailableWidth(element: HTMLElement | null) {
  const parent = imageWidthContainer(element);
  if (!element || !parent) return element?.getBoundingClientRect().width ?? 0;
  const parentStyle = getComputedStyle(parent);
  return Math.max(48, parent.clientWidth - parseFloat(parentStyle.paddingLeft || "0") - parseFloat(parentStyle.paddingRight || "0"));
}

function ImageBlockView({ node, selected, updateAttributes, editor, getPos }: NodeViewProps) {
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const width = typeof node.attrs.width === "number" && node.attrs.width > 0 ? node.attrs.width : null;
  const crop = imageCropFrom(node.attrs);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);
  const [editing, setEditing] = useState(false);
  const { imageInput, onFileChange, requestFile, retry, setUpload, upload } = useImageUploader(updateAttributes);
  const updateAttributesRef = useRef(updateAttributes);
  const blockRef = useRef<HTMLElement>(null);
  const resizeCleanup = useRef<() => void>(() => {});
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => { updateAttributesRef.current = updateAttributes; }, [updateAttributes]);
  useEffect(() => () => resizeCleanup.current(), []);
  useEffect(() => {
    const element = blockRef.current;
    const parent = imageWidthContainer(element);
    if (!element) return;
    const updateAvailableWidth = () => {
      const nextWidth = imageAvailableWidth(element);
      setAvailableWidth((currentWidth) => Math.abs(currentWidth - nextWidth) < 1 ? currentWidth : nextWidth);
    };
    updateAvailableWidth();
    if (!parent || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateAvailableWidth);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  // NodeView's updateAttributes function can receive a new identity whenever
  // a parent grid updates its selection. Keep a stable action callback so its
  // hover controls do not get replaced while the pointer is over the image.
  const requestUrl = useCallback(() => window.dispatchEvent(new CustomEvent<ImageRequestDetail>(imageUrlRequestEvent, { detail: { onSelect: (url) => updateAttributesRef.current({ src: url, alt: "", width: null, cropAspect: "original", cropX: 50, cropY: 50, cropZoom: 1 }) } })), []);
  const dismissUpload = useCallback(() => setUpload(null), [setUpload]);
  const openCrop = useCallback(() => setEditing(true), []);

  const isolateImagePointer = useCallback((event: PointerEvent<HTMLElement>) => {
    // The block-drag plugin listens on document. Its gutter can overlap the
    // neighbouring column's image and repeatedly steal its hover target.
    if (editor.storage.blockDrag?.state.dragging) return;
    event.stopPropagation();
    editor.storage.blockDrag?.setHovered(null);
  }, [editor]);

  // Explicitly select the image node before ProseMirror can move selection to
  // an enclosing column/table. This keeps resize handles stable in grids.
  const selectImageNode = useCallback(() => {
    const position = getPos();
    if (typeof position !== "number") return;
    editor.chain().setNodeSelection(position).focus(undefined, { scrollIntoView: false }).run();
  }, [editor, getPos]);

  const selectImage = useCallback((event: PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a, label")) return;
    event.preventDefault();
    event.stopPropagation();
    selectImageNode();
  }, [selectImageNode]);

  // ProseMirror still receives a compatibility `mousedown` after pointerdown
  // on some browsers. Prevent it from selecting the preceding columns node.
  const preserveImageSelection = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a, label")) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const setWidthPreset = (ratio: number | null) => {
    // Presets are interactive controls, so they bypass the wrapper's pointer
    // handler. Select the image here as well to prevent a grid from taking the
    // selection when its child image is resized.
    selectImageNode();
    if (ratio === null) {
      updateAttributes({ width: null });
      return;
    }
    updateAttributes({ width: Math.round(imageAvailableWidth(blockRef.current) * ratio) });
  };

  const visibleWidth = dragWidth ?? width;
  const isPresetActive = (ratio: number | null) => ratio === null
    ? visibleWidth === null
    : availableWidth > 0 && visibleWidth !== null && Math.abs(visibleWidth - availableWidth * ratio) <= Math.max(4, availableWidth * 0.025);

  const resize = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // A resize handle is outside the image frame, and was previously excluded
    // from the wrapper's selection handler. Pin the image selection first so
    // an enclosing columns/grid block cannot replace it while dragging.
    selectImageNode();
    const handle = event.currentTarget as HTMLElement;
    const element = handle.closest<HTMLElement>(".tiptap-image-block");
    if (!element) return;
    setResizing(true);
    handle.setPointerCapture?.(event.pointerId);
    const startX = event.clientX;
    const startWidth = element.getBoundingClientRect().width;
    const maxWidth = imageAvailableWidth(element);
    const fromLeft = handle.dataset.edge === "left";
    let nextWidth = startWidth;
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.stopPropagation();
      // Allow compact inline images too. 48px preserves a usable resize handle
      // while removing the old 152px floor that made thumbnails impossible.
      nextWidth = Math.round(Math.min(maxWidth, Math.max(48, startWidth + 2 * (fromLeft ? startX - moveEvent.clientX : moveEvent.clientX - startX))));
      setDragWidth(nextWidth);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", finish, true);
      window.removeEventListener("pointercancel", cancel, true);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    const finish = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      upEvent.stopPropagation();
      cleanup();
      updateAttributes({ width: nextWidth });
      setDragWidth(null);
      setResizing(false);
    };
    const cancel = (cancelEvent: globalThis.PointerEvent) => {
      if (cancelEvent.pointerId !== event.pointerId) return;
      cancelEvent.stopPropagation();
      cleanup(); setDragWidth(null); setResizing(false);
    };
    resizeCleanup.current = cleanup;
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("pointercancel", cancel, true);
  };

  const cropStyle = crop.aspect === "original" ? undefined : { aspectRatio: cropRatio(crop.aspect) };

  const imageInteractionActive = selected || resizing;

  return <NodeViewWrapper as="figure" className={`tiptap-image-block${imageInteractionActive ? " is-selected" : ""}${resizing ? " is-resizing" : ""}`} onPointerMove={isolateImagePointer} onPointerEnter={isolateImagePointer} onMouseDownCapture={preserveImageSelection} onPointerDownCapture={selectImage} ref={blockRef} style={{ width: (dragWidth ?? width) ? `${dragWidth ?? width}px` : "100%", minWidth: 48 }}>
    <input ref={imageInput} className="tiptap-file-input" type="file" accept={imageFileAccept} onChange={onFileChange} />
    <div className={`tiptap-image-frame${crop.aspect !== "original" ? " is-cropped" : ""}`} contentEditable={false} style={cropStyle}>
      <ImageBlockContent alt={typeof node.attrs.alt === "string" ? node.attrs.alt : ""} crop={crop} dismiss={dismissUpload} openCrop={openCrop} requestFile={requestFile} requestUrl={requestUrl} retry={retry} src={src} upload={upload} />
    </div>
    <div className="tiptap-image-size-presets" role="group" aria-label="이미지 고정 크기">{imageWidthPresets.map((preset) => <button type="button" aria-label={preset.tooltip} aria-pressed={isPresetActive(preset.ratio)} className={isPresetActive(preset.ratio) ? "is-active" : undefined} key={preset.id} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); selectImageNode(); }} onClick={(event) => { event.stopPropagation(); setWidthPreset(preset.ratio); }} title={preset.tooltip}>{preset.label}</button>)}</div>
    <button type="button" className="tiptap-image-resize top-left" data-edge="left" aria-label="이미지 너비 조절" onPointerDown={resize} />
    <button type="button" className="tiptap-image-resize top-right" data-edge="right" aria-label="이미지 너비 조절" onPointerDown={resize} />
    <button type="button" className="tiptap-image-resize bottom-left" data-edge="left" aria-label="이미지 너비 조절" onPointerDown={resize} />
    <button type="button" className="tiptap-image-resize bottom-right" data-edge="right" aria-label="이미지 너비 조절" onPointerDown={resize} />
    {editing && src && <TiptapImageCropDialog crop={crop} onClose={() => setEditing(false)} src={src} updateAttributes={updateAttributes} />}
  </NodeViewWrapper>;
}

const ImageBlock = TiptapImage.extend({
  draggable: false,
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
      cropAspect: { default: "original", rendered: false },
      cropX: { default: 50, rendered: false },
      cropY: { default: 50, rendered: false },
      cropZoom: { default: 1, rendered: false },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView, {
      // Keep ProseMirror from resetting image selection to an enclosing column,
      // table, or preceding grid block during pointer and mouse compatibility events.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return Boolean(target?.closest(".tiptap-image-block, .tiptap-image-frame, .tiptap-image-resize, .tiptap-image-size-presets, .tiptap-image-actions, .tiptap-image-empty, .editor-upload-status"));
      },
    });
  },
});



function EditorButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} data-active={active || undefined} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</button>;
}

function NovelEditorChrome() {
  const { editor } = useCurrentEditor();
  const urlInput = useRef<HTMLInputElement>(null);
  const pendingImageTarget = useRef<ImageRequestDetail["onSelect"] | undefined>(undefined);
  const linkRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [urlDialog, setUrlDialog] = useState<"image" | "link" | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const requestImageUrl = (event: Event) => { pendingImageTarget.current = (event as CustomEvent<ImageRequestDetail>).detail?.onSelect; setUrl(""); setUrlDialog("image"); };
    const requestLink = (event: Event) => {
      const detail = (event as CustomEvent<{ href?: string; from?: number; to?: number }>).detail;
      linkRangeRef.current = typeof detail?.from === "number" && typeof detail.to === "number" ? { from: detail.from, to: detail.to } : null;
      setUrl(detail?.href ?? "");
      setUrlDialog("link");
    };
    window.addEventListener(imageUrlRequestEvent, requestImageUrl);
    window.addEventListener(linkRequestEvent, requestLink);
    return () => { window.removeEventListener(imageUrlRequestEvent, requestImageUrl); window.removeEventListener(linkRequestEvent, requestLink); };
  }, []);
  useEffect(() => { if (urlDialog) window.requestAnimationFrame(() => urlInput.current?.focus()); }, [urlDialog]);

  if (!editor) return null;
  const insertImage = (src: string, alt = "") => {
    const target = pendingImageTarget.current;
    pendingImageTarget.current = undefined;
    if (target) target(src, alt);
    else editor.chain().focus().setImage({ src, alt }).run();
  };
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
  return <>{urlDialog && <div className="tiptap-url-dialog-backdrop" role="presentation" onMouseDown={() => setUrlDialog(null)}><form className="tiptap-url-dialog" role="dialog" aria-modal="true" aria-label={urlDialog === "image" ? "이미지 주소 입력" : "링크 주소 입력"} onMouseDown={(event) => event.stopPropagation()} onSubmit={submitUrl}><label>{urlDialog === "image" ? "이미지 주소" : "링크 주소"}<input ref={urlInput} value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="https://" /></label><div><button type="button" onClick={() => setUrlDialog(null)}>취소</button><button type="submit">삽입</button></div></form></div>}<TableControls editor={editor} /></>;
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
    headingLevels: [1, 2, 3, 4],
    blockTypes: blockTypesWithHeadingFour,
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
    slash: {},
    extend: [EditorFileDrop, LegacyCalloutMetadata, TypographicShortcuts, ImageBlock.configure({ inline: false, allowBase64: false }), ImageCarousel, BookmarkNode, LinkMentionNode],
  }).map(extension => {
    if (extension.name === "slashCommand") return extension.configure({ items: slashItemsWithHeadingFour.map(item => ({ ...item, title: slashLabel(item.id, item.title), aliases: [...(item.aliases ?? []), item.title], ...(item.id === "image" ? { run: ({ editor, range }: Parameters<typeof item.run>[0]) => { editor.chain().focus().deleteRange(range).setImage({ src: "" }).run(); } } : {}) })) });
    return nativeMediaNodes.find(node => node.name === extension.name) ?? extension;
  }), []);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const editor = useSlashEditor({ blockKit: false, extensions, content: initial,
    editorProps: { attributes: { class: "tiptap-prose slash-content", "aria-label": "게시글 본문" } },
    // `onUpdate` is intentionally only fired after an edit. Sync once as the
    // editor is created so the visible document and publish payload start in
    // the same state, including when an existing post is saved unchanged.
    onCreate: ({ editor }) => onChangeRef.current(editor.getJSON() as JsonNode),
    onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON() as JsonNode),
  });

  return <section className="tiptap-editor-shell" data-editor="slash-editor"><EditorContext.Provider value={{ editor }}><EditorContent editor={editor} />{editor && <><SlashEditorTools editor={editor} /><NovelEditorChrome /><LinkPasteTools editor={editor} /></>}</EditorContext.Provider></section>;
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
