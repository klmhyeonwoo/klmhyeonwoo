type SavedBlock = {
  type?: unknown;
  props?: { emoji?: unknown; fluent?: unknown };
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Restores custom callouts from saved editor blocks in posts published before MDX callouts were introduced. */
export function restoreCallouts(source: string, blocks: unknown[]) {
  return blocks.reduce<string>((result, value) => {
    if (typeof value !== "object" || value === null) return result;
    const block = value as SavedBlock;
    if (block.type !== "callout") return result;

    const emoji = typeof block.props?.emoji === "string" ? block.props.emoji : "💡";
    const fluent = typeof block.props?.fluent === "string" ? block.props.fluent : "";
    const firstLine = new RegExp(`^>\\s*${escapeRegExp(emoji)}(?:\\s+|$)([\\s\\S]*?)(?=\\n{2,}|$)`, "m");

    return result.replace(firstLine, (matched) => {
      const body = matched
        .split("\n")
        .map((line, index) => {
          const text = line.replace(/^>\s?/, "");
          return index === 0 ? text.replace(new RegExp(`^${escapeRegExp(emoji)}\\s*`), "") : text;
        })
        .join("\n")
        .trim();
      const attributes = fluent ? ` icon="${fluent}"` : ` emoji="${emoji.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
      return `<Callout${attributes}>\n${body || " "}\n</Callout>`;
    });
  }, source);
}
