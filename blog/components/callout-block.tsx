"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import type { EmojiType } from "ms-3d-emoji-picker";
import { useEffect, useRef, useState } from "react";
import { FluentEmoji } from "./fluent-emoji";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
const MicrosoftEmojiPicker = dynamic(
  () => import("ms-3d-emoji-picker").then((module) => module.Picker),
  { ssr: false },
);

const createCalloutBlockConfig = createBlockConfig(
  () => ({
    type: "callout" as const,
    propSchema: { emoji: { default: "💡" }, fluent: { default: "" }, fluentUrl: { default: "" } },
    content: "inline" as const,
  }),
);

function CalloutBlock({ block, editor, contentRef }: ReactCustomBlockRenderProps<typeof createCalloutBlockConfig>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"emoji" | "fluent">("emoji");
  const pickerRef = useRef<HTMLDivElement>(null);
  const chooseEmoji = (emoji: string) => {
    editor.updateBlock(block, { props: { emoji, fluent: "", fluentUrl: "" } });
    setPickerOpen(false);
  };
  const chooseMicrosoftEmoji = (emoji: EmojiType) => {
    editor.updateBlock(block, { props: { fluent: "", fluentUrl: emoji.url } });
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!pickerOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [pickerOpen]);

  return <div className="editor-callout">
    <div className="editor-callout-emoji-picker" contentEditable={false} ref={pickerRef}>
      <button
        aria-expanded={pickerOpen}
        aria-haspopup="dialog"
        aria-label="콜아웃 이모지 선택"
        className="editor-callout-emoji"
        onClick={(event) => {
          event.stopPropagation();
          setPickerOpen((open) => !open);
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        type="button"
      >{block.props.fluentUrl ? <img alt="" className="editor-callout-fluent-image" src={block.props.fluentUrl} /> : block.props.fluent ? <FluentEmoji name={block.props.fluent} /> : block.props.emoji}</button>
      {pickerOpen && <div aria-label="콜아웃 이모지 선택" className="editor-callout-emoji-menu" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} role="region">
        <div className="editor-callout-emoji-menu-header">
          <div>
            <p>콜아웃 아이콘</p>
            <div aria-label="이모지 종류" className="editor-callout-emoji-tabs" role="tablist">
              <button aria-selected={pickerMode === "emoji"} className={pickerMode === "emoji" ? "is-selected" : undefined} onClick={() => setPickerMode("emoji")} role="tab" type="button">기본 이모지</button>
              <button aria-selected={pickerMode === "fluent"} className={pickerMode === "fluent" ? "is-selected" : undefined} onClick={() => setPickerMode("fluent")} role="tab" type="button">Microsoft 3D</button>
            </div>
          </div>
          <button aria-label="이모지 선택 닫기" className="editor-callout-emoji-close" onClick={(event) => { event.stopPropagation(); setPickerOpen(false); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button">닫기</button>
        </div>
        {pickerMode === "emoji" ? <EmojiPicker
          autoFocusSearch
          emojiStyle="apple"
          height={390}
          lazyLoadEmojis
          onEmojiClick={(emojiData: EmojiClickData) => chooseEmoji(emojiData.emoji)}
          previewConfig={{ showPreview: false }}
          searchPlaceholder="이모지 검색"
          theme="auto"
          width="100%"
        /> : <div className="editor-callout-microsoft-picker"><MicrosoftEmojiPicker handleEmojiSelect={chooseMicrosoftEmoji} isOpen /></div>}</div>}
    </div>
    <div className="editor-callout-content" ref={contentRef} />
  </div>;
}

function CalloutExternalHTML({ block, contentRef }: ReactCustomBlockRenderProps<typeof createCalloutBlockConfig>) {
  return <blockquote>
    <span>{block.props.fluentUrl ? <img alt="" src={block.props.fluentUrl} /> : block.props.fluent ? <FluentEmoji name={block.props.fluent} /> : block.props.emoji} </span>
    <span ref={contentRef} />
  </blockquote>;
}

export const Callout = createReactBlockSpec(createCalloutBlockConfig, {
  meta: { isolating: false },
  render: CalloutBlock,
  toExternalHTML: CalloutExternalHTML,
});
