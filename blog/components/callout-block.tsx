"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FluentEmoji, fluentEmojiOptions } from "./fluent-emoji";

const emojiGroups = [
  { label: "자주 사용", emojis: "💡📌✨✅⚠️🔍🧩📎💬🚀❤️👍👋🎉🔥💯" },
  { label: "표정", emojis: "😀😃😄😁😆🥹😊😇🙂🙃😉😍🥰😘😎🤓🫡🤔😮😢😭😤😡🤯😴🤩🤗🫶" },
  { label: "손·사람", emojis: "👋🤚✋🖐️👌🤏✌️🤞🤟🤘🤙👈👉👆👇☝️👍👎👏🙌🫶🙏💪🧠👀" },
  { label: "기호", emojis: "✅☑️❌❗❓⚠️🚫🔔🔕🔒🔓🔑📍🚩🏁⭐🌟💫🔖💎🎯🛠️⚙️🧪🧭" },
  { label: "업무·기술", emojis: "💻🖥️⌨️🖱️📱📷🎙️🎧💾📡🔋🔌🧮📈📊🗂️📁📝📚🗓️⏰⏳🔬🧬" },
  { label: "자연·사물", emojis: "☀️🌙⭐☁️🌈🌱🌳🌲🌸🍀🌊🔥💧❄️🍎🍋☕🍺🍞🎈🎁🏆🎵🎨" },
  { label: "동물", emojis: "🐶🐱🐭🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🦄🐝🦋🐢🐳🐬🦉🦄" },
  { label: "여행·장소", emojis: "🏠🏢🏫🏥🏖️🏕️🗺️🚗🚌🚇✈️🚀🚲🚢🛸🌍🌏🏔️🏝️🎪🏟️🏆" },
] as const;

const searchAliases: Record<string, string> = {
  "💡": "아이디어 생각", "📌": "중요 고정", "✨": "새로운 반짝", "✅": "완료 확인", "⚠️": "주의 경고", "🔍": "검색 확인", "🚀": "시작 배포 성장", "❤️": "좋아요 사랑", "👍": "좋아요 동의", "🔥": "인기 열정", "💬": "대화 댓글", "📝": "메모 작성", "💻": "개발 컴퓨터", "📈": "성장 그래프", "🎯": "목표", "🔒": "보안 비밀", "🧪": "실험", "🌱": "성장", "🎉": "축하", "☕": "커피 휴식",
};

function characters(value: string) {
  return value.match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*/gu) ?? [];
}

const createCalloutBlockConfig = createBlockConfig(
  () => ({
    type: "callout" as const,
    propSchema: { emoji: { default: "💡" }, fluent: { default: "" } },
    content: "inline" as const,
  }),
);

function CalloutBlock({ block, editor, contentRef }: ReactCustomBlockRenderProps<typeof createCalloutBlockConfig>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customEmoji, setCustomEmoji] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const groups = useMemo(() => emojiGroups.map((group) => ({
    ...group,
    emojis: characters(group.emojis).filter((emoji) => !normalizedQuery || `${emoji} ${searchAliases[emoji] ?? ""} ${group.label}`.toLocaleLowerCase().includes(normalizedQuery)),
  })).filter((group) => group.emojis.length > 0), [normalizedQuery]);
  const chooseEmoji = (emoji: string) => {
    editor.updateBlock(block, { props: { emoji, fluent: "" } });
    setPickerOpen(false);
    setQuery("");
    setCustomEmoji("");
  };
  const chooseFluentEmoji = (fluent: string) => {
    editor.updateBlock(block, { props: { fluent } });
    setPickerOpen(false);
    setQuery("");
    setCustomEmoji("");
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
      >{block.props.fluent ? <FluentEmoji name={block.props.fluent} /> : block.props.emoji}</button>
      {pickerOpen && <div aria-label="콜아웃 이모지 선택" className="editor-callout-emoji-menu" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} role="region">
        <div className="editor-callout-emoji-controls">
          <input aria-label="이모지 검색" autoFocus onChange={(event) => setQuery(event.target.value)} onMouseDown={(event) => event.stopPropagation()} placeholder="이모지 검색" value={query} />
          <button aria-label="이모지 선택 닫기" className="editor-callout-emoji-close" onClick={(event) => { event.stopPropagation(); setPickerOpen(false); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button">×</button>
        </div>
        <div className="editor-callout-emoji-custom">
          <input aria-label="직접 이모지 입력" onChange={(event) => setCustomEmoji(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && customEmoji.trim()) {
              event.preventDefault();
              chooseEmoji(customEmoji.trim());
            }
          }} placeholder="직접 입력하거나 붙여넣기" value={customEmoji} />
          <button disabled={!customEmoji.trim()} onClick={(event) => { event.stopPropagation(); chooseEmoji(customEmoji.trim()); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button">적용</button>
        </div>
        <p className="editor-callout-emoji-hint">시스템 이모지 패널에서 고르거나 이모지를 붙여넣을 수 있어요.</p>
        <div className="editor-callout-emoji-results">
          <section>
            <strong>Microsoft Fluent Emoji</strong>
            <div>{fluentEmojiOptions.filter((option) => !normalizedQuery || `${option.label} ${option.id}`.toLocaleLowerCase().includes(normalizedQuery)).map((option) => <button
              aria-label={`${option.label} 선택`}
              aria-pressed={option.id === block.props.fluent}
              className={option.id === block.props.fluent ? "is-selected" : undefined}
              key={option.id}
              onClick={(event) => { event.stopPropagation(); chooseFluentEmoji(option.id); }}
              onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
              title={option.label}
              type="button"
            ><FluentEmoji name={option.id} /></button>)}</div>
          </section>
          {groups.map((group) => <section key={group.label}>
            <strong>{group.label}</strong>
            <div>{group.emojis.map((emoji) => <button
              aria-label={`${emoji} 선택`}
              aria-pressed={emoji === block.props.emoji}
              className={emoji === block.props.emoji ? "is-selected" : undefined}
              key={emoji}
              onClick={(event) => { event.stopPropagation(); chooseEmoji(emoji); }}
              onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
              type="button"
            >{emoji}</button>)}</div>
          </section>)}
          {groups.length === 0 && <p className="editor-callout-emoji-empty">일치하는 이모지가 없어요. 위 입력칸에 직접 붙여넣어 보세요.</p>}
        </div>
      </div>}
    </div>
    <div className="editor-callout-content" ref={contentRef} />
  </div>;
}

function CalloutExternalHTML({ block, contentRef }: ReactCustomBlockRenderProps<typeof createCalloutBlockConfig>) {
  return <blockquote><span>{block.props.emoji} </span><span ref={contentRef} /></blockquote>;
}

export const Callout = createReactBlockSpec(createCalloutBlockConfig, {
  meta: { isolating: false },
  render: CalloutBlock,
  toExternalHTML: CalloutExternalHTML,
});
