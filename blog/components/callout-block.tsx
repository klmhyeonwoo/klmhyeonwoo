"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";

const createCalloutBlockConfig = createBlockConfig(
  () => ({
    type: "callout" as const,
    propSchema: { emoji: { default: "💡" } },
    content: "inline" as const,
  }),
);

function CalloutBlock({ block, editor, contentRef }: ReactCustomBlockRenderProps<typeof createCalloutBlockConfig>) {
  return <div className="editor-callout">
    <input
      aria-label="콜아웃 이모지"
      className="editor-callout-emoji"
      contentEditable={false}
      maxLength={8}
      onChange={(event) => editor.updateBlock(block, { props: { emoji: event.target.value || "💡" } })}
      value={block.props.emoji}
    />
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
