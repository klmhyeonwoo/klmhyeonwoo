"use client";

import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec, type ReactCustomBlockFrameProps } from "@blocknote/react";

const createColumnListConfig = createBlockConfig(
  () => ({
    type: "columnList" as const,
    propSchema: { columns: { default: 2 } },
    content: "none" as const,
    layoutOnly: true,
    children: { allow: ["column"] as const, min: 2, dissolve: false },
  }),
);

const createColumnConfig = createBlockConfig(
  () => ({
    type: "column" as const,
    propSchema: {},
    content: "none" as const,
    layoutOnly: true,
    children: { allow: "blocks" as const, exclude: ["columnList"] as const },
    placeable: "namedOnly" as const,
  }),
);

function ColumnListFrame({ block, slotRef }: ReactCustomBlockFrameProps<typeof createColumnListConfig>) {
  const columns = Number(block.props.columns);
  return <section className="editor-columns" data-columns={Number.isInteger(columns) && columns > 1 ? columns : 2} ref={slotRef} />;
}

function ColumnFrame({ slotRef }: ReactCustomBlockFrameProps<typeof createColumnConfig>) {
  return <div className="editor-column" ref={slotRef} />;
}

export const ColumnList = createReactBlockSpec(createColumnListConfig, {
  meta: { isolating: true },
  renderFrame: ColumnListFrame,
  toExternalHTML: () => <div />,
});

export const Column = createReactBlockSpec(createColumnConfig, {
  meta: { isolating: true },
  renderFrame: ColumnFrame,
  toExternalHTML: () => <div />,
});

