export type TableOfContentsItem = {
  id: string;
  level: 2 | 3;
  title: string;
};

function headingTitle(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[~*_]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function headingId(title: string) {
  const normalized = title
    .toLocaleLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return normalized || "section";
}

export function getTableOfContents(markdown: string): TableOfContentsItem[] {
  const counts = new Map<string, number>();
  const items: TableOfContentsItem[] = [];
  let inCodeFence = false;

  for (const line of markdown.replace(/^---[\s\S]*?---\s*/, "").split("\n")) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = /^(#{2,3})\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
    if (!match) continue;

    const title = headingTitle(match[2]);
    if (!title) continue;
    const baseId = headingId(title);
    const count = (counts.get(baseId) ?? 0) + 1;
    counts.set(baseId, count);
    items.push({ id: count === 1 ? baseId : `${baseId}-${count}`, level: match[1].length as 2 | 3, title });
  }

  return items;
}

export function rehypeHeadingIds(items: TableOfContentsItem[]) {
  return () => {
    let index = 0;

    return (tree: unknown) => {
      const visit = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        const element = node as { type?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[] };
        if (element.type === "element" && (element.tagName === "h2" || element.tagName === "h3")) {
          const item = items[index];
          if (item) element.properties = { ...element.properties, id: item.id };
          index += 1;
        }
        element.children?.forEach(visit);
      };

      visit(tree);
    };
  };
}
