"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useCurrentEditor as useEditor } from "@slash-editor/react";

type Block = { from: number; to: number; element: HTMLElement };
type Position = { left: number; top: number };

// Resolve from document children, not nested paragraphs inside tables or lists.
function blocks(editor: Editor): Block[] {
  const result: Block[] = [];
  editor.state.doc.forEach((node, from) => {
    const element = editor.view.nodeDOM(from);
    if (element instanceof HTMLElement) result.push({ from, to: from + node.nodeSize, element });
  });
  return result;
}

function relocate(editor: Editor, block: Block, destination: number) {
  if (destination >= block.from && destination <= block.to) return;
  const content = editor.state.doc.slice(block.from, block.to).content;
  const position = destination > block.to ? destination - (block.to - block.from) : destination;
  const tr = editor.state.tr.delete(block.from, block.to).insert(position, content);
  tr.setSelection(NodeSelection.create(tr.doc, position));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

export function EditorBlockControls() {
  const { editor } = useEditor();
  const [block, setBlock] = useState<Block | null>(null);
  const [position, setPosition] = useState<Position>({ left: 0, top: 0 });
  const [open, setOpen] = useState(false);
  const [indicator, setIndicator] = useState<(Position & { width: number }) | null>(null);
  const controls = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const cleanupDrag = useRef<() => void>(() => {});
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    const shell = root.closest(".tiptap-editor-shell") ?? root;
    const reveal = (event: globalThis.PointerEvent) => {
      if (open || dragging.current || controls.current?.contains(event.target as globalThis.Node)) return;
      const target = event.target as globalThis.Node;
      const found = blocks(editor).find((item) => item.element.contains(target));
      if (found) setBlock(found);
      else if (!shell.contains(target)) setBlock(null);
    };
    const selection = () => {
      if (open || dragging.current || !editor.isFocused) return;
      const found = blocks(editor).find((item) => editor.state.selection.from >= item.from && editor.state.selection.from < item.to);
      if (found) setBlock(found);
    };
    const outside = (event: globalThis.PointerEvent) => {
      if (!controls.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    const changed = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) { setBlock(null); setOpen(false); }
    };
    document.addEventListener("pointermove", reveal);
    document.addEventListener("pointerdown", outside);
    editor.on("selectionUpdate", selection);
    editor.on("transaction", changed);
    return () => {
      document.removeEventListener("pointermove", reveal);
      document.removeEventListener("pointerdown", outside);
      editor.off("selectionUpdate", selection);
      editor.off("transaction", changed);
    };
  }, [editor, open]);

  useEffect(() => {
    if (!block) return;
    const sync = () => {
      const rect = block.element.getBoundingClientRect();
      setPosition({ left: Math.max(4, rect.left - 60), top: Math.max(4, Math.min(window.innerHeight - 40, rect.top + 2)) });
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => { window.removeEventListener("scroll", sync, true); window.removeEventListener("resize", sync); };
  }, [block]);

  useEffect(() => () => cleanupDrag.current(), []);

  if (!editor) return null;

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!block || event.button !== 0) return;
    event.preventDefault();
    // Freeze the target before leaving the handle, including the drag threshold.
    dragging.current = true;
    const button = event.currentTarget;
    button.setPointerCapture(event.pointerId);
    const initialDoc = editor.state.doc;
    const start = { x: event.clientX, y: event.clientY };
    let destination: number | null = null;
    let moved = false;
    const cleanup = () => {
      dragging.current = false;
      block.element.classList.remove("is-block-dragging");
      setIndicator(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", escape);
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
      moved = true;
      dragging.current = true;
      setOpen(false);
      block.element.classList.add("is-block-dragging");
      const root = editor.view.dom.getBoundingClientRect();
      if (e.clientX < root.left - 80 || e.clientX > root.right + 80) { destination = null; setIndicator(null); return; }
      const candidates = blocks(editor);
      const next = candidates.find((item) => {
        const rect = item.element.getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2;
      });
      const last = candidates.at(-1);
      destination = next?.from ?? last?.to ?? null;
      const rect = (next ?? last)?.element.getBoundingClientRect();
      setIndicator(rect && destination !== null ? { left: root.left, top: next ? rect.top - 3 : rect.bottom + 3, width: root.width } : null);
      if (e.clientY < 70) window.scrollBy(0, -16);
      if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 16);
    };
    const finish = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      cleanup();
      if (!moved) { setOpen((value) => !value); return; }
      // Cancel if another edit occurred while dragging rather than move stale offsets.
      if (destination !== null && initialDoc === editor.state.doc) {
        relocate(editor, block, destination);
        setAnnouncement("블록을 이동했습니다.");
        setBlock(null);
      }
    };
    const cancel = () => cleanup();
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") cleanup(); };
    cleanupDrag.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", escape);
  };

  const run = (action: () => void) => { action(); setOpen(false); setBlock(null); };
  const insert = () => {
    if (!block) return;
    editor.chain().focus().insertContentAt(block.to, { type: "paragraph", content: [{ type: "text", text: "/" }] }).setTextSelection(block.to + 2).run();
  };
  const convert = (type: string, level?: 1 | 2 | 3) => {
    if (!block) return;
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, block.from + 1)));
    const chain = editor.chain().focus();
    if (type === "heading" && level) chain.setHeading({ level }).run();
    else chain.setNode(type).run();
  };
  const siblings = blocks(editor);
  const index = siblings.findIndex((item) => item.from === block?.from);
  const node = block ? editor.state.doc.nodeAt(block.from) : null;
  const canConvert = node?.isTextblock && node.type.name !== "codeBlock";

  return createPortal(<>
    <span className="editor-sr-only" role="status">{announcement}</span>
    {block && <div className="editor-block-controls" ref={controls} style={position} onKeyDown={(event) => {
      if (event.key === "Escape") { setOpen(false); controls.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus(); }
    }}>
      <div className="editor-block-buttons">
        <button type="button" aria-label="아래에 블록 추가" title="블록 추가" onMouseDown={(e) => e.preventDefault()} onClick={() => run(insert)}>+</button>
        <button type="button" className="editor-block-grip" aria-label="블록 메뉴 및 드래그 이동" title="드래그하여 이동 · 클릭하여 메뉴" aria-haspopup="dialog" aria-expanded={open} onPointerDown={startDrag} onClick={(e) => { if (e.detail === 0) setOpen((value) => !value); }}><span className="editor-grip-dots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span></button>
      </div>
      {open && <div className="editor-block-menu" role="dialog" aria-label="블록 편집" style={{ maxHeight: Math.max(120, window.innerHeight - position.top - 44) }}>
        {canConvert && <><small>블록 전환</small>{[["paragraph", "텍스트"], ["heading", "제목 1", 1], ["heading", "제목 2", 2], ["heading", "제목 3", 3], ["callout", "콜아웃"]].map(([type, label, level]) => <button key={String(label)} type="button" onClick={() => run(() => convert(String(type), level as 1 | 2 | 3 | undefined))}>{label}</button>)}<hr /></>}
        <button type="button" disabled={index <= 0} onClick={() => run(() => relocate(editor, block, siblings[index - 1].from))}>위로 이동</button>
        <button type="button" disabled={index < 0 || index >= siblings.length - 1} onClick={() => run(() => relocate(editor, block, siblings[index + 1].to))}>아래로 이동</button>
        <button type="button" onClick={() => run(() => { if (node) editor.chain().focus().insertContentAt(block.to, node.toJSON()).run(); })}>복제</button>
        <button type="button" onClick={() => run(() => { editor.chain().focus().deleteRange({ from: block.from, to: block.to }).run(); })}>삭제</button>
      </div>}
    </div>}
    {indicator && <div className="editor-block-drop-indicator" style={indicator} />}
  </>, document.body);
}
