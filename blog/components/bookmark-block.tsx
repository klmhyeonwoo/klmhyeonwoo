"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { useEffect, useRef, useState } from "react";

function displayUrl(value: string) {
  try {
    const url = new URL(value);
    return { hostname: url.hostname.replace(/^www\./, ""), href: url.href, label: url.hostname.replace(/^www\./, "").slice(0, 1).toUpperCase() };
  } catch {
    return { hostname: "링크 미리보기", href: "", label: "↗" };
  }
}

const createBookmarkBlockConfig = createBlockConfig(
  () => ({
    type: "bookmark" as const,
    propSchema: { url: { default: "" }, description: { default: "" }, image: { default: "" } },
    content: "inline" as const,
  }),
);

function BookmarkBlock({ block, editor, contentRef }: ReactCustomBlockRenderProps<typeof createBookmarkBlockConfig>) {
  const { hostname, href, label } = displayUrl(block.props.url);
  const [editingUrl, setEditingUrl] = useState(!href);
  const [urlDraft, setUrlDraft] = useState(block.props.url);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingUrl) setUrlDraft(block.props.url);
  }, [block.props.url, editingUrl]);

  useEffect(() => {
    if (!editingUrl) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [editingUrl]);

  const stopEditorEvent = (event: React.MouseEvent | React.PointerEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest("input, button, label")) event.stopPropagation();
  };
  const updatePreview = async (url: string) => {
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) return;
      const preview = await response.json() as { description?: string; image?: string };
      const current = editor.getBlock(block.id);
      if (current?.type === "bookmark" && current.props.url === url) {
        editor.updateBlock(current, { props: { description: preview.description ?? "", image: preview.image ?? "" } } as never);
      }
    } catch {
      // A plain link card is still useful when the source blocks previews.
    }
  };
  const commitUrl = () => {
    const nextUrl = displayUrl(urlDraft.trim()).href;
    if (!nextUrl) return;
    if (nextUrl !== block.props.url) {
      editor.updateBlock(block, { props: { url: nextUrl, description: "", image: "" } } as never);
      void updatePreview(nextUrl);
    }
    setUrlDraft(nextUrl);
    setEditingUrl(false);
  };
  const cancelEditing = () => {
    setUrlDraft(block.props.url);
    setEditingUrl(false);
  };

  if (!href) {
    return <div className="editor-bookmark editor-bookmark-empty is-editing" contentEditable={false}>
      <span aria-hidden="true">↗</span>
      <input aria-label="미리보기 링크 주소" onBlur={commitUrl} onChange={(event) => setUrlDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitUrl(); } if (event.key === "Escape") cancelEditing(); }} onMouseDown={stopEditorEvent} onPointerDown={stopEditorEvent} placeholder="https://…" ref={inputRef} value={urlDraft} />
      <div className="editor-bookmark-title" ref={contentRef} />
    </div>;
  }

  return <div className={`editor-bookmark${editingUrl ? " is-editing" : ""}`}>
    <div aria-hidden="true" className="editor-bookmark-visual">{block.props.image ? <img alt="" src={block.props.image} referrerPolicy="no-referrer" /> : <span>{label}</span>}</div>
    <div className="editor-bookmark-copy">
      <small>링크 · {hostname}</small>
      <div className="editor-bookmark-title" ref={contentRef} />
      {block.props.description && <span className="editor-bookmark-description">{block.props.description}</span>}
      <span className="editor-bookmark-url">{href}</span>
    </div>
    {editingUrl
      ? <input aria-label="미리보기 링크 주소" className="editor-bookmark-url-input" onBlur={commitUrl} onChange={(event) => setUrlDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitUrl(); } if (event.key === "Escape") cancelEditing(); }} onMouseDown={stopEditorEvent} onPointerDown={stopEditorEvent} ref={inputRef} value={urlDraft} />
      : <button aria-label="링크 주소 수정" className="editor-bookmark-edit" contentEditable={false} onClick={() => { setUrlDraft(block.props.url); setEditingUrl(true); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button">⋯</button>}
  </div>;
}

function BookmarkExternalHTML({ block, contentRef }: ReactCustomBlockRenderProps<typeof createBookmarkBlockConfig>) {
  return <a href={block.props.url} rel="noreferrer" target="_blank"><span ref={contentRef} /></a>;
}

export const Bookmark = createReactBlockSpec(createBookmarkBlockConfig, {
  meta: { isolating: false },
  render: BookmarkBlock,
  toExternalHTML: BookmarkExternalHTML,
});
