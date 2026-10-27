"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core/blocks";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { ko } from "@blocknote/core/locales";
import { codeBlockOptions, syntaxHighlighter } from "@blocknote/code-block";
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  getDefaultReactSlashMenuItems,
  useBlockNoteEditor,
  useComponentsContext,
  usePortalElement,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { ChangeEvent, memo, useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { ToastMessage } from "./toast-message";
import { Bookmark } from "./bookmark-block";
import { Callout } from "./callout-block";
import { Column, ColumnList } from "./columns-block";
import { Gallery } from "./gallery-block";
import { Image } from "./editor-image-block";
import { bookmarkMarkdown, bookmarkTitle as savedBookmarkTitle } from "@/lib/bookmark-markdown";
import { galleryImages, galleryMarkdown } from "@/lib/gallery-markdown";
import { imageCropFrom, imageMarkdown } from "@/lib/image-crop";
import { imageFileAccept, uploadImage } from "@/lib/client-image-upload";

export type EditorMention = { title: string; href: string; description: string };
const noMentions: EditorMention[] = [];

type Props = {
  initialBlocks?: unknown[];
  mentions?: EditorMention[];
  onChange: (blocks: unknown[], markdown: string) => void;
};

type PendingLink = {
  url: string;
  blockId: string;
  left: number;
  top: number;
};

type FloatingPosition = { left: number; top: number };

type BlockTransform = {
  key: string;
  label: string;
  update: { type: string; props?: Record<string, string | number | boolean> };
};

const blockTransforms: BlockTransform[] = [
  { key: "paragraph", label: "문단", update: { type: "paragraph" } },
  { key: "heading-1", label: "제목 1", update: { type: "heading", props: { level: 1 } } },
  { key: "heading-2", label: "제목 2", update: { type: "heading", props: { level: 2 } } },
  { key: "heading-3", label: "제목 3", update: { type: "heading", props: { level: 3 } } },
  { key: "bulletListItem", label: "글머리 기호", update: { type: "bulletListItem" } },
  { key: "numberedListItem", label: "번호 목록", update: { type: "numberedListItem" } },
  { key: "checkListItem", label: "할 일", update: { type: "checkListItem" } },
  { key: "quote", label: "인용", update: { type: "quote" } },
  { key: "codeBlock", label: "코드 블록", update: { type: "codeBlock" } },
  { key: "callout", label: "콜아웃", update: { type: "callout", props: { emoji: "💡", fluent: "", fluentUrl: "" } } },
  { key: "gallery", label: "이미지 갤러리", update: { type: "gallery", props: { images: "[]" } } },
];

function blockTransformKey(block: { type: string; props: Record<string, unknown> }) {
  if (block.type === "heading") return `heading-${block.props.level ?? 1}`;
  return blockTransforms.some((transform) => transform.key === block.type) ? block.type : "other";
}

/**
 * BlockNote exposes the hovered block through the side-menu extension rather
 * than the text cursor. Listening to that store keeps the transform action
 * anchored to the block whose handle the author actually opened.
 */
function BlockTransformMenuItem() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const sideMenu = editor.getExtension(SideMenuExtension) as {
    store?: {
      state?: { block?: { type: string; props: Record<string, unknown> } };
      subscribe: (listener: () => void) => () => void;
    };
  } | undefined;

  const block = useSyncExternalStore(
    (notify) => sideMenu?.store?.subscribe(notify) ?? (() => undefined),
    () => sideMenu?.store?.state?.block,
    () => undefined,
  );

  if (!block) return null;

  const currentKey = blockTransformKey(block);

  return (
    <Components.Generic.Menu.Root portalElement={portalElement} position="right" sub>
      <Components.Generic.Menu.Trigger sub>
        <Components.Generic.Menu.Item className="bn-menu-item" subTrigger>
          블록 전환
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown className="bn-menu-dropdown" sub>
        {blockTransforms.map((transform) => (
          <Components.Generic.Menu.Item
            checked={currentKey === transform.key}
            className="bn-menu-item"
            key={transform.key}
            onClick={() => {
              editor.updateBlock(block as never, transform.update as never);
              window.requestAnimationFrame(() => editor.focus());
            }}
          >
            {transform.label}
          </Components.Generic.Menu.Item>
        ))}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}

function EditorDragHandleMenu() {
  return (
    <DragHandleMenu>
      <BlockTransformMenuItem />
      <BlockColorsItem>색상</BlockColorsItem>
      <RemoveBlockItem>삭제</RemoveBlockItem>
    </DragHandleMenu>
  );
}

function EditorSideMenu() {
  return <SideMenu dragHandleMenu={EditorDragHandleMenu} />;
}

const schema = BlockNoteSchema.create().extend({
  // Keep BlockNote's code-block model as the editing source of truth. It
  // serializes to fenced Markdown, which is then highlighted by Shiki on the
  // server-rendered page.
  blockSpecs: {
    codeBlock: createCodeBlockSpec(codeBlockOptions),
    image: Image(),
    bookmark: Bookmark(),
    callout: Callout(),
    gallery: Gallery(),
    columnList: ColumnList(),
    column: Column(),
  },
});

const koreanEditorDictionary = {
  ...ko,
  placeholders: {
    ...ko.placeholders,
    default: "내용을 입력하거나 '/'를 눌러 명령을 선택하세요.",
  },
};

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

function defaultBookmarkTitle(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function columnLayout(columns: number) {
  return {
    type: "columnList",
    props: { columns },
    children: Array.from({ length: columns }, () => ({
      type: "column",
      children: [{ type: "paragraph", content: [] }],
    })),
  };
}

function mentionForUrl(url: string, mentions: EditorMention[]) {
  try {
    const target = new URL(url, window.location.origin);
    return mentions.find((mention) => {
      const candidate = new URL(mention.href, window.location.origin);
      return candidate.origin === target.origin && candidate.pathname === target.pathname;
    });
  } catch {
    return undefined;
  }
}

function calloutMarkdown(markdown: string, props: { emoji?: unknown; fluent?: unknown; fluentUrl?: unknown }) {
  const emoji = typeof props.emoji === "string" ? props.emoji : "💡";
  const fluent = typeof props.fluent === "string" ? props.fluent : "";
  const fluentUrl = typeof props.fluentUrl === "string" ? props.fluentUrl : "";
  const body = markdown.trim().split("\n").map((line) => line.replace(/^>\s?/, "")).join("\n").replace(`${emoji} `, "").trim();
  const attributes = fluentUrl
    ? ` image="${fluentUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`
    : fluent ? ` icon="${fluent}"` : ` emoji="${emoji.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
  return `<Callout${attributes}>\n${body || " "}\n</Callout>\n`;
}

function Editor({ initialBlocks, mentions, onChange }: Props) {
  const mentionItems = mentions ?? noMentions;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [uploadError, setUploadError] = useState("");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [imagePropertiesPosition, setImagePropertiesPosition] = useState<FloatingPosition | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const isComposingRef = useRef(false);
  const uploadFile = useCallback(async (file: File) => {
    try {
      const { url } = await uploadImage(file);
      return url;
    } catch (error) {
      setUploadError(errorMessage(error));
      throw error;
    }
  }, []);
  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks as never : undefined,
    dictionary: koreanEditorDictionary,
    uploadFile,
    schema,
    extensions: [syntaxHighlighter],
  }, [uploadFile]);

  const getSlashMenuItems = useCallback(async (query: string) => [
    ...getDefaultReactSlashMenuItems(editor).map((item) => item.title === "Code Block"
      ? { ...item, title: "코드 블록", subtext: "언어를 선택해 코드를 작성합니다", aliases: [...(item.aliases ?? []), "코드", "code"] }
      : item),
    {
      key: "bookmark" as never,
      title: "링크 미리보기",
      subtext: "주소를 카드 형태로 보여줍니다",
      aliases: ["bookmark", "링크", "미리보기", "주소"],
      group: "기본",
      icon: <span aria-hidden="true">↗</span>,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "bookmark", props: { url: "" } } as never);
        // BlockNote returns focus to its contenteditable surface after a slash
        // selection. Hand it back to the new URL field on the next frame so the
        // link card remains open and ready to type into.
        window.requestAnimationFrame(() => editor.domElement?.querySelector<HTMLInputElement>(".editor-bookmark-empty input")?.focus());
      },
    },
    {
      key: "callout" as never,
      title: "콜아웃",
      subtext: "이모지로 중요한 내용을 강조합니다",
      aliases: ["callout", "콜아웃", "강조", "알림"],
      group: "기본",
      icon: <span aria-hidden="true">💡</span>,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout", props: { emoji: "💡", fluent: "", fluentUrl: "" } } as never),
    },
    {
      key: "two-columns" as never,
      title: "2열 레이아웃",
      subtext: "블록을 나란히 배치합니다",
      aliases: ["columns", "column", "2열", "나란히", "레이아웃"],
      group: "기본",
      icon: <span aria-hidden="true">▦</span>,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, columnLayout(2) as never),
    },
    {
      key: "three-columns" as never,
      title: "3열 레이아웃",
      subtext: "세 개의 블록을 나란히 배치합니다",
      aliases: ["3열", "세 칸", "three columns"],
      group: "기본",
      icon: <span aria-hidden="true">▦</span>,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, columnLayout(3) as never),
    },
    {
      key: "gallery" as never,
      title: "이미지 갤러리",
      subtext: "여러 이미지를 2열로 배치합니다",
      aliases: ["gallery", "갤러리", "이미지 모음", "사진"],
      group: "기본",
      icon: <span aria-hidden="true">▦</span>,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "gallery", props: { images: "[]" } } as never),
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
    // Do not force the parent to render while a Korean/Japanese/Chinese IME is
    // still composing a character. Interrupting that native composition causes
    // partially composed syllables to be committed more than once.
    if (isComposingRef.current) return;
    const document = editor.document;
    const serializeBlock = (block: (typeof document)[number]): string => {
      if (block.type === "columnList") {
        const columns = Number((block.props as { columns?: unknown }).columns);
        const columnCount = Number.isInteger(columns) && columns > 1 ? columns : block.children.length;
        const columnBlocks = block.children as Array<{ children: Array<(typeof document)[number]> }>;
        const contents = columnBlocks.map((column) => `<Column>\n${column.children.map(serializeBlock).filter(Boolean).join("\n\n")}\n</Column>`).join("\n\n");
        return `<Columns columns={${columnCount}}>\n${contents}\n</Columns>`;
      }
      const serialized = editor.blocksToMarkdownLossy([block]);
      if (block.type === "bookmark") {
        const props = block.props as { url?: unknown; description?: unknown; image?: unknown };
        if (typeof props.url === "string" && normalizedHttpUrl(props.url)) {
          return bookmarkMarkdown(
            props.url,
            savedBookmarkTitle(block.content) || defaultBookmarkTitle(props.url),
            typeof props.description === "string" ? props.description : "",
            typeof props.image === "string" ? props.image : "",
          );
        }
      }
      if (block.type === "gallery") {
        return galleryMarkdown(galleryImages((block.props as { images?: unknown }).images));
      }
      if (block.type === "image") {
        const props = block.props as Record<string, unknown>;
        const url = typeof props.url === "string" ? props.url : "";
        if (normalizedHttpUrl(url)) {
          return imageMarkdown({
            src: url,
            alt: typeof props.caption === "string" ? props.caption : "",
            width: props.previewWidth,
            crop: imageCropFrom(props),
          });
        }
      }
      return block.type === "callout"
        ? calloutMarkdown(serialized, block.props as { emoji?: unknown; fluent?: unknown; fluentUrl?: unknown })
        : serialized;
    };
    const markdown = document.map(serializeBlock).join("\n");
    onChange(copyBlocks(document), markdown);
  }, [editor, onChange]);

  const syncAfterComposition = useEffectEvent(() => {
    window.requestAnimationFrame(syncContent);
  });

  useEffect(() => {
    syncContent();
  }, [syncContent]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;

    const startComposition = () => {
      isComposingRef.current = true;
    };
    const endComposition = () => {
      isComposingRef.current = false;
      // BlockNote applies its final transaction after compositionend in some
      // browsers, so wait for the frame that contains the committed syllable.
      syncAfterComposition();
    };

    root.addEventListener("compositionstart", startComposition);
    root.addEventListener("compositionend", endComposition);
    return () => {
      root.removeEventListener("compositionstart", startComposition);
      root.removeEventListener("compositionend", endComposition);
    };
  }, [editor]);

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

    const positionImageProperties = (id: string) => {
      const image = root.querySelector<HTMLElement>(`[data-id="${id}"] .bn-visual-media`);
      const block = root.querySelector<HTMLElement>(`[data-id="${id}"]`);
      const rect = (image ?? block)?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(360, window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.left), window.innerWidth - panelWidth - 16);
      const below = rect.bottom + 10;
      const top = below + 116 < window.innerHeight ? below : Math.max(16, rect.top - 116);
      setImagePropertiesPosition({ left, top });
    };

    const openImageProperties = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".bn-visual-media")) return;
      if (target.closest(".bn-resize-handle")) return;
      // The visible edit control owns its dialog. Do not intercept its press
      // here, otherwise BlockNote's selection guard prevents the button click.
      if (target.closest("[data-image-crop-edit]")) return;

      const blockElement = target.closest<HTMLElement>("[data-id]");
      const id = blockElement?.dataset.id;
      if (!id) return;

      const block = editor.getBlock(id);
      const url = block && "url" in block.props && typeof block.props.url === "string" ? block.props.url : "";
      if (!url) return;

      // BlockNote's image selection moves focus back to the editor and can
      // dismiss a panel in the same interaction. Own a plain image tap before
      // its selection handler runs; resize handles keep their native behavior.
      event.preventDefault();
      event.stopPropagation();
      setSelectedImageId(id);
      setSelectedImageUrl(url);
      positionImageProperties(id);
    };

    root.addEventListener("pointerdown", openImageProperties, true);
    return () => root.removeEventListener("pointerdown", openImageProperties, true);
  }, [editor]);

  useEffect(() => {
    if (!selectedImageId) return;
    const root = editor.domElement;
    if (!root) return;

    const updatePosition = () => {
      const image = root.querySelector<HTMLElement>(`[data-id="${selectedImageId}"] .bn-visual-media`);
      const block = root.querySelector<HTMLElement>(`[data-id="${selectedImageId}"]`);
      const rect = (image ?? block)?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(360, window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.left), window.innerWidth - panelWidth - 16);
      const below = rect.bottom + 10;
      const top = below + 116 < window.innerHeight ? below : Math.max(16, rect.top - 116);
      setImagePropertiesPosition({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [editor, selectedImageId]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;

    // The language selector is created by BlockNote as a native DOM control,
    // outside React's event boundary. Stopping the event on the editor root
    // can also stop the select's own open behaviour; attach the guard to each
    // select instead, so it opens normally but never reaches ProseMirror's
    // focus-restoration handler.
    const protectedControls = new Set<HTMLSelectElement>();
    const stopEditorFocus = (event: MouseEvent) => event.stopPropagation();
    const protect = (element: HTMLSelectElement) => {
      if (protectedControls.has(element)) return;
      protectedControls.add(element);
      element.addEventListener("mousedown", stopEditorFocus);
    };
    const protectAll = () => root.querySelectorAll<HTMLSelectElement>('[data-content-type="codeBlock"] select').forEach(protect);
    protectAll();
    const observer = new MutationObserver(protectAll);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      protectedControls.forEach((element) => element.removeEventListener("mousedown", stopEditorFocus));
    };
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

  const hydrateBookmark = useCallback(async (blockId: string, url: string) => {
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) return;
      const preview = await response.json() as { title?: string; description?: string; image?: string };
      const block = editor.getBlock(blockId);
      if (!block || block.type !== "bookmark") return;

      const currentTitle = savedBookmarkTitle(block.content);
      const defaultTitle = defaultBookmarkTitle(url);
      editor.updateBlock(blockId, {
        props: { description: preview.description ?? "", image: preview.image ?? "" },
        // A title typed by the author wins over a delayed metadata response.
        ...(preview.title && (!currentTitle || currentTitle === defaultTitle)
          ? { content: [{ type: "text", text: preview.title, styles: {} }] }
          : {}),
      } as never);
    } catch {
      // The local card fallback remains useful when a site blocks metadata requests.
    }
  }, [editor]);

  const insertLinkPreview = useCallback(() => {
    if (!pendingLink) return;
    const currentBlock = editor.getBlock(pendingLink.blockId);
    if (!currentBlock) return setPendingLink(null);
    const bookmark = {
      type: "bookmark",
      props: { url: pendingLink.url, description: "", image: "" },
      content: [{ type: "text", text: defaultBookmarkTitle(pendingLink.url), styles: {} }],
    };
    const isEmptyParagraph = currentBlock.type === "paragraph" && Array.isArray(currentBlock.content) && currentBlock.content.length === 0;
    const bookmarkId = isEmptyParagraph
      ? editor.updateBlock(currentBlock, bookmark as never).id
      : editor.insertBlocks([bookmark as never], currentBlock, "after")[0]?.id;
    setPendingLink(null);
    if (bookmarkId) void hydrateBookmark(bookmarkId, pendingLink.url);
  }, [editor, hydrateBookmark, pendingLink]);

  const insertTextLink = useCallback(() => {
    if (!pendingLink) return;
    editor.insertInlineContent([{ type: "link", href: pendingLink.url, content: pendingLink.url }]);
    setPendingLink(null);
  }, [editor, pendingLink]);

  const insertMentionLink = useCallback(() => {
    if (!pendingLink) return;
    const mention = mentionForUrl(pendingLink.url, mentionItems);
    if (mention) editor.insertInlineContent([{ type: "link", href: mention.href, content: `@${mention.title}` }]);
    setPendingLink(null);
  }, [editor, mentionItems, pendingLink]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;

    const insertBookmarkFromPaste = (event: ClipboardEvent) => {
      const url = normalizedHttpUrl(event.clipboardData?.getData("text/plain") ?? "");
      if (!url) return;

      event.preventDefault();
      const currentBlock = editor.getTextCursorPosition().block;
      const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      const fallback = root.getBoundingClientRect();
      const maxLeft = Math.max(16, window.innerWidth - 336);
      const left = Math.min(Math.max(16, rect?.left ?? fallback.left), maxLeft);
      const top = Math.min((rect?.bottom ?? fallback.top) + 10, window.innerHeight - 248);
      setPendingLink({ url, blockId: currentBlock.id, left, top });
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
        sideMenu={false}
        theme={theme}
        onChange={syncContent}
      ><SideMenuController sideMenu={EditorSideMenu} /><SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} /><SuggestionMenuController triggerCharacter="@" getItems={getMentionItems} /></BlockNoteView>
      {pendingLink && <aside className="editor-link-choice" aria-label="링크 삽입 방식" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} style={{ left: pendingLink.left, top: pendingLink.top }}>
        <p>붙여넣기 형식</p>
        <div>
          {mentionForUrl(pendingLink.url, mentionItems) && <button type="button" onClick={insertMentionLink} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}><span>멘션</span><small>블로그 글을 참조합니다</small></button>}
          <button type="button" onClick={insertLinkPreview} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}><span>북마크</span><small>미리보기 카드로 표시합니다</small></button>
          <button type="button" onClick={insertTextLink} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}><span>URL</span><small>일반 텍스트 링크로 표시합니다</small></button>
          <button className="editor-link-choice-cancel" type="button" onClick={() => setPendingLink(null)} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}>취소</button>
        </div>
      </aside>}
      {selectedImageId && <aside className="image-properties" aria-label="이미지 속성" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.75rem", background: "var(--surface)", left: imagePropertiesPosition?.left ?? 16, position: "fixed", top: imagePropertiesPosition?.top ?? 16, zIndex: 30 }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1 1 20rem" }}>
          <span>이미지 주소</span>
          <input style={{ minWidth: 0, flex: 1 }} value={selectedImageUrl} onChange={(event) => setSelectedImageUrl(event.target.value)} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onBlur={() => updateSelectedImageUrl(selectedImageUrl)} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              updateSelectedImageUrl(selectedImageUrl);
            }
          }} />
        </label>
        <label className="image-properties-upload" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} style={{ cursor: "pointer" }}>
          이미지 바꾸기
          <input type="file" accept={imageFileAccept} onChange={replaceSelectedImage} />
        </label>
        <button type="button" onClick={() => { setSelectedImageId(null); setImagePropertiesPosition(null); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}>닫기</button>
      </aside>}
      <ToastMessage message={uploadError} tone="error" />
    </section>
  );
}

export default memo(Editor);
