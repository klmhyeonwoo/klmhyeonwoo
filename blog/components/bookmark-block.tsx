"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { useState } from "react";

function displayUrl(value: string) {
  try {
    const url = new URL(value);
    return { hostname: url.hostname.replace(/^www\./, ""), href: url.href };
  } catch {
    return { hostname: "링크 미리보기", href: "" };
  }
}

const createBookmarkBlockConfig = createBlockConfig(
  () => ({
    type: "bookmark" as const,
    propSchema: { url: { default: "" } },
    content: "inline" as const,
  }),
);

function BookmarkBlock({ block, editor, contentRef }: ReactCustomBlockRenderProps<typeof createBookmarkBlockConfig>) {
  const { hostname, href } = displayUrl(block.props.url);
  const [editingUrl, setEditingUrl] = useState(false);
  const updateUrl = (value: string) => editor.updateBlock(block, { props: { url: value.trim() } });

  if (!href) {
    return <div className="editor-bookmark editor-bookmark-empty" contentEditable={false}>
      <span aria-hidden="true">↗</span>
      <input aria-label="미리보기 링크 주소" onChange={(event) => updateUrl(event.currentTarget.value)} placeholder="https://…" value={block.props.url} />
      <div className="editor-bookmark-title" ref={contentRef} />
    </div>;
  }

  return <div className="editor-bookmark">
    <a aria-label={`${hostname} 열기`} className="editor-bookmark-mark" contentEditable={false} href={href} rel="noreferrer" target="_blank">↗</a>
    <div className="editor-bookmark-copy">
      <small>{hostname}</small>
      <div className="editor-bookmark-title" ref={contentRef} />
    </div>
    {editingUrl
      ? <input aria-label="미리보기 링크 주소" autoFocus className="editor-bookmark-url-input" onBlur={() => setEditingUrl(false)} onChange={(event) => updateUrl(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") setEditingUrl(false); }} value={block.props.url} />
      : <button aria-label="링크 주소 수정" className="editor-bookmark-edit" contentEditable={false} onClick={() => setEditingUrl(true)} onMouseDown={(event) => event.preventDefault()} type="button">⋯</button>}
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
