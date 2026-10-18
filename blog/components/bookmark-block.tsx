"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { useState } from "react";

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
  const [editingUrl, setEditingUrl] = useState(false);
  const updateUrl = (value: string) => editor.updateBlock(block, { props: { url: value.trim() } });

  if (!href) {
    return <div className="editor-bookmark editor-bookmark-empty" contentEditable={false} onPointerDown={(event) => event.stopPropagation()}>
      <span aria-hidden="true">↗</span>
      <input aria-label="미리보기 링크 주소" onChange={(event) => updateUrl(event.currentTarget.value)} onMouseDown={(event) => event.stopPropagation()} placeholder="https://…" value={block.props.url} />
      <div className="editor-bookmark-title" ref={contentRef} />
    </div>;
  }

  return <div className="editor-bookmark" onPointerDown={(event) => event.stopPropagation()}>
    <div aria-hidden="true" className="editor-bookmark-visual">{block.props.image ? <img alt="" src={block.props.image} /> : <span>{label}</span>}</div>
    <div className="editor-bookmark-copy">
      <small>링크 · {hostname}</small>
      <div className="editor-bookmark-title" ref={contentRef} />
      {block.props.description && <span className="editor-bookmark-description">{block.props.description}</span>}
      <span className="editor-bookmark-url">{href}</span>
    </div>
    {editingUrl
      ? <input aria-label="미리보기 링크 주소" autoFocus className="editor-bookmark-url-input" onBlur={() => setEditingUrl(false)} onChange={(event) => updateUrl(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") setEditingUrl(false); }} onMouseDown={(event) => event.stopPropagation()} value={block.props.url} />
      : <button aria-label="링크 주소 수정" className="editor-bookmark-edit" contentEditable={false} onClick={() => setEditingUrl(true)} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button">⋯</button>}
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
