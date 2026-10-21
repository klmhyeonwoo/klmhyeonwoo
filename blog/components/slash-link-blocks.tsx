"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function httpUrl(value: string) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
async function preview(url: string) {
  const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
  if (!response.ok) return null;
  return await response.json() as { title?: string; description?: string; image?: string };
}

function BookmarkView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(node.attrs.url ?? ""));
  const [error, setError] = useState("");
  const url = httpUrl(String(node.attrs.url ?? ""));
  useEffect(() => {
    if (!url || node.attrs.resolved) return;
    let cancelled = false;
    void preview(url).then(data => {
      if (cancelled || editor.isDestroyed) return;
      const pos = getPos();
      if (typeof pos !== "number" || editor.state.doc.nodeAt(pos)?.attrs.url !== url) return;
      updateAttributes({ title: data?.title || new URL(url).hostname, description: data?.description ?? "", image: httpUrl(data?.image ?? "") ?? "", resolved: true });
    }).catch(() => { if (!cancelled) setError("미리보기를 가져오지 못했습니다. 링크는 사용할 수 있습니다."); });
    return () => { cancelled = true; };
  }, [url, node.attrs.resolved, editor, getPos, updateAttributes]);
  return <NodeViewWrapper className="slash-bookmark" data-layout={node.attrs.layout === "card" ? "card" : "bookmark"} contentEditable={false}>
    <div className="slash-bookmark-image">{node.attrs.image ? <img src={node.attrs.image} alt="" referrerPolicy="no-referrer" /> : <span>↗</span>}</div>
    <div className="slash-bookmark-copy"><small>{url ? new URL(url).hostname : "링크"}</small><strong>{node.attrs.title || url}</strong><p>{node.attrs.description}</p></div>
    <div className="slash-bookmark-edit"><select aria-label="링크 표시 방식" value={node.attrs.layout || "bookmark"} onChange={event => updateAttributes({ layout: event.target.value })}><option value="bookmark">북마크</option><option value="card">카드</option></select><button type="button" onClick={() => { setValue(node.attrs.url); setEditing(!editing); }}>링크 수정</button></div>
    {editing && <form onSubmit={event => { event.preventDefault(); const next = httpUrl(value); if (!next) { setError("http 또는 https 주소를 입력해 주세요."); return; } updateAttributes({ url: next, title: "", description: "", image: "", resolved: false }); setError(""); setEditing(false); }}><label>링크 주소<input autoFocus value={value} onChange={e => setValue(e.target.value)} /></label><button type="submit">적용</button><button type="button" onClick={() => setEditing(false)}>취소</button></form>}
    {error && <small role="status">{error}</small>}
  </NodeViewWrapper>;
}

export const BookmarkNode = Node.create({
  name: "bookmark", group: "block", atom: true, draggable: true,
  addAttributes() { return { url: { default: "" }, title: { default: "" }, description: { default: "" }, image: { default: "" }, layout: { default: "bookmark" }, resolved: { default: false } }; },
  parseHTML() { return [{ tag: "div[data-bookmark]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-bookmark": "" }), HTMLAttributes.title || HTMLAttributes.url]; },
  addNodeView() { return ReactNodeViewRenderer(BookmarkView); },
});

export const LinkMentionNode = Node.create({
  name: "linkMention", group: "inline", inline: true, atom: true,
  addAttributes() { return { url: { default: "" }, title: { default: "" } }; },
  parseHTML() { return [{ tag: "a[data-link-mention]", getAttrs: el => ({ url: el.getAttribute("href"), title: el.textContent }) }]; },
  renderHTML({ node }) { return ["a", { href: httpUrl(node.attrs.url) ?? "#", "data-link-mention": "", class: "post-link-mention" }, node.attrs.title || node.attrs.url]; },
});

export const linkFormatEvent = "wavy:link-format";
type Pending = { url: string; text: string; from: number; to: number; left: number; top: number };
export function LinkPasteTools({ editor }: { editor: Editor }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const range = useRef<Pending | null>(null);
  useEffect(() => {
    const show = (url: string, from: number, to: number) => {
      const rect = editor.view.coordsAtPos(from);
      const next = { url, text: editor.state.doc.textBetween(from, to), from, to, left: Math.max(8, Math.min(rect.left, window.innerWidth - 304)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 240)) };
      range.current = next; setPending(next);
    };
    const showSelection = () => {
      const { from } = editor.state.selection;
      let match: { url: string; from: number; to: number } | null = null;
      editor.state.doc.descendants((node, pos) => {
        const href = node.marks.find(mark => mark.type.name === "link")?.attrs.href;
        const url = typeof href === "string" ? httpUrl(href) : null;
        if (node.isText && url && pos <= from && pos + node.nodeSize >= from) match = { url, from: pos, to: pos + node.nodeSize };
      });
      if (match) { const selected = match as { url: string; from: number; to: number }; show(selected.url, selected.from, selected.to); }
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("data-link-mention")) return;
      const url = httpUrl(anchor.getAttribute("href") ?? "");
      if (!url) return;
      event.preventDefault(); event.stopPropagation();
      const from = editor.view.posAtDOM(anchor, 0);
      show(url, from, from + (anchor.textContent?.length ?? 0));
    };
    const paste = (event: ClipboardEvent) => {
      if (editor.isActive("codeBlock")) return;
      const url = httpUrl(event.clipboardData?.getData("text/plain").trim() ?? "");
      if (!url) return;
      event.preventDefault(); event.stopPropagation();
      const { from, to } = editor.state.selection;
      editor.chain().insertContentAt({ from, to }, { type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
      show(url, from, from + url.length);
    };
    const changed = ({ transaction }: { transaction: import("@tiptap/pm/state").Transaction }) => {
      if (!transaction.docChanged || !range.current) return;
      const current = range.current;
      const from = transaction.mapping.map(current.from, 1);
      const to = transaction.mapping.map(current.to, -1);
      if (from >= to || editor.state.doc.textBetween(from, to) !== current.text) { range.current = null; setPending(null); }
      else { range.current = { ...current, from, to }; }
    };
    const close = (event: PointerEvent) => { if (!(event.target as HTMLElement)?.closest?.(".slash-paste-menu")) { range.current = null; setPending(null); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { range.current = null; setPending(null); } };
    editor.view.dom.addEventListener("paste", paste, true);
    editor.view.dom.addEventListener("click", click, true);
    editor.view.dom.addEventListener(linkFormatEvent, showSelection);
    editor.on("transaction", changed);
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { editor.view.dom.removeEventListener("paste", paste, true); editor.view.dom.removeEventListener("click", click, true); editor.view.dom.removeEventListener(linkFormatEvent, showSelection); editor.off("transaction", changed); document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [editor]);
  const choose = (type: "link" | "bookmark" | "linkMention", layout = "bookmark") => {
    const target = range.current;
    range.current = null; setPending(null);
    if (!target || editor.state.doc.textBetween(target.from, target.to) !== target.text || type === "link") return;
    editor.chain().focus().insertContentAt({ from: target.from, to: target.to }, { type, attrs: { url: target.url, title: new URL(target.url).hostname, layout } }).run();
    if (type === "linkMention") {
      // Labels can be fetched without retaining a stale document position.
      void preview(target.url).then(data => {
        if (!data?.title || editor.isDestroyed) return;
        const tr = editor.state.tr;
        editor.state.doc.descendants((node, pos) => { if (node.type.name === "linkMention" && node.attrs.url === target.url && node.attrs.title === new URL(target.url).hostname) tr.setNodeMarkup(pos, undefined, { ...node.attrs, title: data.title }); });
        if (tr.docChanged) editor.view.dispatch(tr);
      }).catch(() => {});
    }
  };
  return pending ? createPortal(<div data-slash-ui className="slash-floating slash-menu slash-paste-menu" onMouseDown={event => event.preventDefault()} style={{ position: "fixed", left: pending.left, top: pending.top }} role="dialog" aria-label="링크 표시 방식"><small>표시 방식</small><button type="button" onClick={() => choose("link")}>링크 그대로</button><button type="button" onClick={() => choose("bookmark")}>북마크</button><button type="button" onClick={() => choose("bookmark", "card")}>카드 미리보기</button><button type="button" onClick={() => choose("linkMention")}>멘션</button></div>, document.body) : null;
}
