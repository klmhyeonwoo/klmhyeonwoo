"use client";

import { useEffect, useRef, useState, type ReactNode, type ReactElement } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { BLOCK_GUTTER_WIDTH } from "@slash-editor/core";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { linkFormatEvent } from "./slash-link-blocks";
import { Type, Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote, Code, Image, Table, Columns, ChevronRight, MessageSquare, Minus, Link, SquareDashed, type LucideIcon } from "lucide-react";
import { useSlashMenu, useBlockDrag, useBlockMenu, useBlockTypes, useBubbleToolbar, useLinkEditor, useEmoji, useMention, useActiveItemScroll, type VirtualAnchor } from "@slash-editor/react";

const labels: Record<string, string> = { paragraph: "텍스트", "heading-1": "제목 1", "heading-2": "제목 2", "heading-3": "제목 3", "heading-4": "제목 4", "bullet-list": "기호 목록", "ordered-list": "번호 목록", "task-list": "할 일", blockquote: "인용", quote: "인용", callout: "콜아웃", "code-block": "코드", image: "이미지", table: "표", columns: "열 나누기", toggle: "토글", "horizontal-rule": "구분선", bold: "굵게", italic: "기울임", strike: "취소선", underline: "밑줄", code: "코드", link: "링크", duplicate: "복제", delete: "삭제", copy: "복사", "paste-below": "아래에 붙여넣기", "move-up": "위로 이동", "move-down": "아래로 이동" };
const extraLabels: Record<string, string> = { "toggle-heading-1": "토글 제목 1", "toggle-heading-2": "토글 제목 2", "toggle-heading-3": "토글 제목 3", mermaid: "다이어그램", file: "파일", video: "동영상", embed: "임베드", emoji: "이모지" };
export const slashLabel = (id: string, fallback: string) => labels[id] ?? extraLabels[id] ?? fallback;

const icons: Record<string, LucideIcon> = { text: Type, "heading-1": Heading1, "heading-2": Heading2, "heading-3": Heading3, "heading-4": Type, list: List, "list-ordered": ListOrdered, "list-checks": ListChecks, quote: Quote, code: Code, image: Image, table: Table, columns: Columns, "chevron-right": ChevronRight, "message-square": MessageSquare, minus: Minus, link: Link };
const groupLabels: Record<string, string> = { "Basic blocks": "기본 블록", Media: "미디어", "Advanced blocks": "고급 블록", Structure: "구조", Inline: "인라인" };

function HandleTip({ children, label, disabled }: { children: ReactElement; label: string; disabled: boolean }) {
  return <Tooltip.Root><Tooltip.Trigger render={children} delay={350} disabled={disabled}/><Tooltip.Portal><Tooltip.Positioner side="top" sideOffset={8} className="slash-handle-tooltip-positioner"><Tooltip.Popup className="slash-handle-tooltip">{label}<Tooltip.Arrow className="slash-handle-tooltip-arrow"><svg width="12" height="6" viewBox="0 0 12 6" aria-hidden="true"><path d="M0 0h12L6 6Z"/></svg></Tooltip.Arrow></Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root>;
}

function Floating({ anchor, children, className = "", gutter = false }: { anchor: VirtualAnchor; children: ReactNode; className?: string; gutter?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: -9999, top: -9999 });
  useEffect(() => {
    const sync = () => {
      const rect = anchor.getBoundingClientRect();
      const width = ref.current?.offsetWidth ?? 260;
      const height = ref.current?.offsetHeight ?? 0;
      setPosition({ left: gutter ? rect.left - BLOCK_GUTTER_WIDTH : Math.max(6, Math.min(rect.left, window.innerWidth - width - 6)), top: gutter || className === "slash-drop" ? rect.top : Math.max(6, Math.min(rect.bottom + 6, window.innerHeight - height - 6)) });
    };
    sync();
    const observer = new ResizeObserver(sync);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => { observer.disconnect(); window.removeEventListener("scroll", sync, true); window.removeEventListener("resize", sync); };
  }, [anchor, gutter, className]);
  return createPortal(<div ref={ref} data-slash-ui className={`slash-floating ${className}`} style={{ position: "fixed", ...position }}>{children}</div>, document.body);
}

export function SlashEditorTools({ editor }: { editor: Editor }) {
  const slash = useSlashMenu(editor);
  const drag = useBlockDrag(editor);
  const menu = useBlockMenu(editor);
  const types = useBlockTypes(editor);
  const bubble = useBubbleToolbar(editor);
  const link = useLinkEditor(editor);
  const emoji = useEmoji(editor);
  const mention = useMention(editor);
  const emojiListRef = useActiveItemScroll(emoji.activeItem?.name);
  const mentionListRef = useActiveItemScroll(mention.activeItem?.id);
  const listRef = useActiveItemScroll(slash.activeItem?.id);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if ((event.target as HTMLElement)?.closest?.("[data-slash-ui]")) return;
      menu.close(); link.close(); slash.close(); emoji.close(); mention.close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { menu.close(); link.close(); slash.close(); emoji.close(); mention.close(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [menu.close, link.close, slash.close, emoji.close, mention.close]);

  return <>
    {emoji.open && emoji.anchor && <Floating anchor={emoji.anchor} className="slash-menu"><div ref={emojiListRef} role="listbox" aria-label="이모지 선택">{!emoji.items.length && <p>일치하는 이모지가 없습니다.</p>}{emoji.items.map((item, index) => <button type="button" key={item.name} role="option" data-value={item.name} aria-selected={index === emoji.activeIndex} onMouseDown={e => e.preventDefault()} onMouseEnter={() => emoji.setActiveIndex(index)} onClick={() => emoji.select(index)}><span>{item.emoji || "◻"}</span><span>{item.shortcodes[0] || item.name}</span></button>)}</div></Floating>}
    {mention.open && mention.anchor && <Floating anchor={mention.anchor} className="slash-menu"><div ref={mentionListRef} role="listbox" aria-label="게시글 멘션">{!mention.items.length && <p>{mention.loading ? "검색 중…" : "일치하는 게시글이 없습니다."}</p>}{mention.items.map((item, index) => <button type="button" key={item.id} role="option" data-value={item.id} aria-selected={index === mention.activeIndex} onMouseDown={e => e.preventDefault()} onMouseEnter={() => mention.setActiveIndex(index)} onClick={() => mention.select(index)}>{item.label}</button>)}</div></Floating>}
    {slash.open && slash.anchor && <Floating anchor={slash.anchor} className="slash-menu"><div role="listbox" aria-label="블록 선택" ref={listRef}>
      {!slash.items.length && <p>일치하는 블록이 없습니다.</p>}
      {slash.items.map((item, index) => {
        const Icon = icons[item.icon ?? ""] ?? SquareDashed;
        return <div key={item.id} role="presentation">
          {(index === 0 || slash.items[index - 1].group !== item.group) && <div className="slash-group-label">{groupLabels[item.group] ?? item.group}</div>}
          <button type="button" role="option" title={item.description} aria-selected={slash.activeIndex === index} data-value={item.id} onMouseDown={event => event.preventDefault()} onMouseEnter={() => slash.setActiveIndex(index)} onClick={() => slash.select(index)}><Icon aria-hidden="true" size={16}/><span>{slashLabel(item.id, item.title)}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>
        </div>;
      })}
    </div></Floating>}
    {(menu.anchor ?? drag.hoverAnchor) && editor.isEditable && <Floating anchor={(menu.anchor ?? drag.hoverAnchor)!} gutter className="slash-gutter">
      <Tooltip.Provider>
        <HandleTip label="아래에 블록 추가" disabled={!!drag.dragging || !!menu.target}>
          <button type="button" aria-label="아래에 블록 추가" onMouseDown={e => e.preventDefault()} onClick={() => {
            const target = menu.target ?? drag.hovered;
            if (!target) return;
            const pos = target.pos + target.size;
            menu.close();
            editor.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
            editor.storage.slashCommand?.openAtCaret();
          }}><Plus size={20} strokeWidth={1.8} aria-hidden="true"/></button>
        </HandleTip>
        <HandleTip label="드래그하여 이동, 클릭하여 메뉴 열기" disabled={!!drag.dragging || !!menu.target}>
          <button type="button" aria-label="블록 이동 및 메뉴" aria-haspopup="dialog" aria-expanded={!!menu.target} className="slash-grip" {...menu.handleProps}><span className="editor-grip-dots" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i}/>)}</span></button>
        </HandleTip>
      </Tooltip.Provider>
    </Floating>}
    {drag.dropAnchor && <Floating anchor={drag.dropAnchor} className="slash-drop"><div style={{ width: drag.dropAnchor.getBoundingClientRect().width }} /></Floating>}
    {menu.target && menu.anchor && <Floating anchor={menu.anchor} className="slash-menu"><div role="dialog" aria-label="블록 메뉴">
      <small>블록 전환</small>
      {types.items.map(type => <button type="button" key={type.id} onMouseDown={e => e.preventDefault()} onClick={() => { types.convert(type, menu.target!.pos); menu.close(); }}>{slashLabel(type.id, type.title)}</button>)}
      <hr />
      {menu.items.map(item => <button type="button" key={item.id} onMouseDown={e => e.preventDefault()} onClick={() => { void item.run({ editor, target: menu.target! }); menu.close(); }}>{slashLabel(item.id, item.title)}</button>)}
    </div></Floating>}
    {bubble.open && bubble.anchor && !link.open && <Floating anchor={bubble.anchor} className="slash-bubble"><div role="toolbar" aria-label="텍스트 서식">{bubble.items.map(item => <button type="button" key={item.id} aria-pressed={item.isActive(editor)} onMouseDown={e => e.preventDefault()} onClick={() => item.run(editor)}>{slashLabel(item.id, item.label)}</button>)}{([["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]] as const).map(([textAlign, label]) => <button type="button" key={textAlign} aria-label={`${label} 정렬`} aria-pressed={editor.isActive("paragraph", { textAlign }) || editor.isActive("heading", { textAlign })} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().updateAttributes("paragraph", { textAlign }).updateAttributes("heading", { textAlign }).run()}>{label}</button>)}</div></Floating>}
    {link.open && link.anchor && <Floating anchor={link.anchor} className="slash-link-form"><form onSubmit={e => { e.preventDefault(); if (/^(https?:\/\/|\/|#|mailto:)/i.test(link.href.trim())) { link.confirm(); editor.view.dom.dispatchEvent(new Event(linkFormatEvent)); } }}><label>링크 주소<input autoFocus type="text" value={link.href} onChange={e => link.setHref(e.target.value)} placeholder="https://" /></label><button type="submit">적용</button><button type="button" onClick={link.remove}>링크 해제</button><button type="button" onClick={link.close}>닫기</button></form></Floating>}
  </>;
}
