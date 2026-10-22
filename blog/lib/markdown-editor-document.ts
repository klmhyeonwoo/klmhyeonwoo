import matter from "gray-matter";
import type { JsonNode } from "./slash-content";

function paragraph(text = ""): JsonNode {
  return { type: "paragraph", content: inlineMarkdown(text) };
}

function listItem(text: string): JsonNode {
  return { type: "listItem", content: [paragraph(text)] };
}

type Mark = NonNullable<JsonNode["marks"]>[number];

function withMark(nodes: JsonNode[], mark: Mark) {
  return nodes.map((node) => node.type === "text" ? { ...node, marks: [...(node.marks ?? []), mark] } : node);
}

function closingDelimiter(source: string, delimiter: string, from: number) {
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === "\\") { index += 1; continue; }
    if (source.startsWith(delimiter, index)) return index;
  }
  return -1;
}

/**
 * Small, deliberately conservative inline Markdown reader for legacy posts.
 * It converts only unambiguous notation and leaves unmatched punctuation as
 * normal text, so opening an old article cannot silently discard content.
 */
export function inlineMarkdown(source: string): JsonNode[] {
  const result: JsonNode[] = [];
  let text = "";
  const pushText = () => {
    if (text) result.push({ type: "text", text });
    text = "";
  };

  for (let index = 0; index < source.length;) {
    if (source[index] === "\\" && index + 1 < source.length) {
      text += source[index + 1]; index += 2; continue;
    }
    if (source[index] === "[") {
      const closeLabel = closingDelimiter(source, "]", index + 1);
      const closeUrl = closeLabel >= 0 && source[closeLabel + 1] === "(" ? closingDelimiter(source, ")", closeLabel + 2) : -1;
      if (closeLabel > index + 1 && closeUrl > closeLabel + 2) {
        pushText();
        const label = inlineMarkdown(source.slice(index + 1, closeLabel));
        const href = source.slice(closeLabel + 2, closeUrl).trim();
        result.push(...withMark(label, { type: "link", attrs: { href } }));
        index = closeUrl + 1; continue;
      }
    }
    const delimiter = source.startsWith("**", index) ? "**" : source.startsWith("~~", index) ? "~~" : source[index] === "`" ? "`" : source[index] === "*" || source[index] === "_" ? source[index] : "";
    if (delimiter) {
      const end = closingDelimiter(source, delimiter, index + delimiter.length);
      if (end > index + delimiter.length) {
        pushText();
        const value = source.slice(index + delimiter.length, end);
        const mark: Mark = delimiter === "**" ? { type: "bold" } : delimiter === "~~" ? { type: "strike" } : delimiter === "`" ? { type: "code" } : { type: "italic" };
        const nodes = delimiter === "`" ? [{ type: "text", text: value } satisfies JsonNode] : inlineMarkdown(value);
        result.push(...withMark(nodes, mark));
        index = end + delimiter.length; continue;
      }
    }
    text += source[index]; index += 1;
  }
  pushText();
  return result;
}

/**
 * Older posts predate editor-data files. This deliberately small Markdown
 * reader gives those posts a real editable document rather than opening an
 * empty editor. Unknown inline syntax stays visible as text, so content is
 * never silently discarded during the migration path.
 */
export function markdownEditorDocument(source: string): JsonNode {
  const lines = matter(source).content.replace(/\r\n/g, "\n").split("\n");
  const content: JsonNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const fence = line.match(/^(`{3,}|~{3,})([^\s]*)/);
    if (fence) {
      const token = fence[1];
      const language = fence[2] || "text";
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith(token)) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      content.push({ type: "codeBlock", attrs: { language }, content: code.length ? [{ type: "text", text: code.join("\n") }] : [] });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      content.push({ type: "heading", attrs: { level: Math.min(3, heading[1].length) }, content: inlineMarkdown(heading[2]) });
      index += 1;
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(line)) { content.push({ type: "horizontalRule" }); index += 1; continue; }

    const image = line.match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+[^)]*)?\)$/);
    if (image) { content.push({ type: "image", attrs: { src: image[2], alt: image[1] } }); index += 1; continue; }

    if (line.startsWith("> ")) {
      const quote: JsonNode[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) quote.push(paragraph(lines[index++].slice(2)));
      content.push({ type: "blockquote", content: quote });
      continue;
    }

    if (/^- \[[ xX]\]\s+/.test(line)) {
      const items: JsonNode[] = [];
      while (index < lines.length && /^- \[[ xX]\]\s+/.test(lines[index])) {
        const value = lines[index++].match(/^- \[([ xX])\]\s+(.+)$/)!;
        items.push({ type: "taskItem", attrs: { checked: value[1].toLowerCase() === "x" }, content: [paragraph(value[2])] });
      }
      content.push({ type: "taskList", content: items });
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: JsonNode[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) items.push(listItem(lines[index++].replace(/^[-*+]\s+/, "")));
      content.push({ type: "bulletList", content: items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: JsonNode[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index])) items.push(listItem(lines[index++].replace(/^\d+[.)]\s+/, "")));
      content.push({ type: "orderedList", content: items });
      continue;
    }

    const body: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(`{3,}|~{3,}|#{1,6}\s+|> |[-*+]\s+|\d+[.)]\s+|- \[[ xX]\]\s+|!\[|([-*_])(?:\s*\2){2,}\s*$)/.test(lines[index])) body.push(lines[index++]);
    if (body.length) content.push(paragraph(body.join("\n")));
    else index += 1;
  }

  return { type: "doc", content: content.length ? content : [paragraph()] };
}
