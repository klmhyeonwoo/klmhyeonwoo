import type { TextAnchor } from "./inline-comment-types";

export function locateAnchor(text: string, anchor: TextAnchor): number | null {
  const matches: number[] = [];
  for (let from = 0; from <= text.length;) {
    const index = text.indexOf(anchor.quote, from);
    if (index < 0) break;
    matches.push(index);
    from = index + Math.max(1, anchor.quote.length);
  }
  const contextual = matches.filter(index => text.slice(Math.max(0, index - anchor.prefix.length), index) === anchor.prefix && text.slice(index + anchor.quote.length, index + anchor.quote.length + anchor.suffix.length) === anchor.suffix);
  if (contextual.length === 1) return contextual[0];
  return matches.length === 1 ? matches[0] : null;
}

export function anchorRange(root: HTMLElement, anchor: TextAnchor): Range | null {
  const start = locateAnchor(root.textContent ?? "", anchor);
  if (start === null) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let found = false;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const end = offset + (node.textContent?.length ?? 0);
    if (!found && start >= offset && start < end) { range.setStart(node, start - offset); found = true; }
    if (found && start + anchor.quote.length <= end) { range.setEnd(node, start + anchor.quote.length - offset); return range; }
    offset = end;
  }
  return null;
}
