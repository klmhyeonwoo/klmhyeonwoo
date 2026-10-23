import { bookmarkMarkdown } from "./bookmark-markdown";
import { emoji } from "@slash-editor/core/emoji";
import { mediaUrl } from "./editor-media";
import { inlineMarkdown } from "./markdown-editor-document";
const emojiGlyphs = new Map(emoji().options.emojis.map(item => [item.name, item.emoji]));
export type JsonNode = { type?: string; attrs?: Record<string, unknown>; content?: JsonNode[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }>; [key: string]: unknown };

function textNodes(value: unknown): JsonNode[] {
  if (typeof value === "string") return value ? [{ type: "text", text: value }] : [];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): JsonNode[] => {
    if (!item || typeof item !== "object") return [];
    const node = item as { text?: unknown; children?: unknown; content?: unknown; styles?: Record<string, unknown>; bold?: unknown; italic?: unknown; underline?: unknown; strikethrough?: unknown; code?: unknown };
    if (typeof node.text !== "string") return textNodes(node.children ?? node.content);
    const styles = node.styles ?? {};
    const marks = [node.bold || styles.bold ? { type: "bold" } : null, node.italic || styles.italic ? { type: "italic" } : null, node.underline || styles.underline ? { type: "underline" } : null, node.strikethrough || styles.strike ? { type: "strike" } : null, node.code || styles.code ? { type: "code" } : null].filter(Boolean) as Array<{ type: string }>;
    return node.text ? [{ type: "text", text: node.text, ...(marks.length ? { marks } : {}) }] : [];
  });
}

function paragraph(content: JsonNode[] = []): JsonNode { return { type: "paragraph", content }; }

function normalize(document: JsonNode): JsonNode {
  const content = document.content?.flatMap((child) => {
    // Early editor migrations stored Markdown punctuation in a plain text node.
    // Recover it here before making a fresh Markdown projection on publish.
    if (document.type !== "codeBlock" && child.type === "text" && typeof child.text === "string" && !child.marks?.length) return inlineMarkdown(child.text);
    return [normalize(child)];
  });
  if (document.type === "callout") {
    const { emoji, ...attrs } = document.attrs ?? {};
    return { ...document, attrs: { ...attrs, icon: attrs.icon ?? emoji ?? "💡" }, content: !content?.length || content.some(n => ["text", "hardBreak"].includes(n.type ?? "")) ? [paragraph(content)] : content };
  }
  return { ...document, ...(content ? { content } : {}) };
}
function attribute(value: unknown) { return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export function convertBlocks(blocks?: unknown[]): JsonNode {
  const first = blocks?.[0] as { type?: unknown; content?: unknown } | undefined;
  if ((first?.type === "tiptap-content" || first?.type === "slash-content") && first.content && typeof first.content === "object") return normalize(first.content as JsonNode);
  const yoopta = first?.type === "yoopta-content" && first.content && typeof first.content === "object" ? first.content as Record<string, { type?: unknown; value?: Array<{ children?: unknown; content?: unknown; props?: Record<string, unknown> }>; meta?: { order?: number } }> : null;
  if (yoopta) {
    const content = Object.values(yoopta).sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0)).map((block) => {
      const element = block.value?.[0]; const children = textNodes(element?.children ?? element?.content); const props = element?.props ?? {};
      const types: Record<string, JsonNode> = { Paragraph: paragraph(children), HeadingOne: { type: "heading", attrs: { level: 1 }, content: children }, HeadingTwo: { type: "heading", attrs: { level: 2 }, content: children }, HeadingThree: { type: "heading", attrs: { level: 3 }, content: children }, BulletedList: { type: "bulletList", content: [{ type: "listItem", content: [paragraph(children)] }] }, NumberedList: { type: "orderedList", content: [{ type: "listItem", content: [paragraph(children)] }] }, TodoList: { type: "taskList", content: [{ type: "taskItem", attrs: { checked: props.checked === true }, content: [paragraph(children)] }] }, Blockquote: { type: "blockquote", content: [paragraph(children)] }, Code: { type: "codeBlock", attrs: { language: props.language ?? "text" }, content: children }, Callout: { type: "callout", attrs: { emoji: props.emoji ?? "💡", fluentUrl: props.fluentUrl ?? "" }, content: children }, Divider: { type: "horizontalRule" } };
      return block.type === "Image" ? { type: "image", attrs: { src: props.src ?? "", alt: props.alt ?? "" } } : types[String(block.type)] ?? paragraph(children);
    });
    return normalize({ type: "doc", content: content.length ? content : [paragraph()] });
  }
  const plate = first?.type === "plate-content" && Array.isArray(first.content) ? first.content as JsonNode[] : Array.isArray(blocks) ? blocks as JsonNode[] : [];
  const content = plate.flatMap((node): JsonNode[] => {
    const type = node.type ?? "paragraph"; const children = textNodes(node.children ?? node.content); const props = (node.props ?? {}) as Record<string, unknown>;
    if (["table", "tr", "td", "th"].includes(type)) {
      const legacy = node.content as unknown as { type?: string; headerRows?: number; columnWidths?: (number | null)[]; rows?: { cells: unknown[] }[] } | undefined;
      if (type === "table" && legacy?.type === "tableContent" && legacy.rows) {
        return [{ type: "table", content: legacy.rows.map((row, rowIndex) => ({
          type: "tableRow", content: row.cells.map((value, column) => {
            const cell = value as { content?: unknown; props?: { colspan?: number; rowspan?: number } };
            const colspan = cell.props?.colspan ?? 1;
            const widths = legacy.columnWidths?.slice(column, column + colspan);
            return { type: rowIndex < (legacy.headerRows ?? 0) ? "tableHeader" : "tableCell", attrs: { colspan, rowspan: cell.props?.rowspan ?? 1, colwidth: widths?.every(width => typeof width === "number" && width > 0) ? widths : null }, content: [paragraph(textNodes(Array.isArray(value) ? value : cell.content))] };
          }),
        })) }];
      }
      const nested = Array.isArray(node.children) ? convertBlocks(node.children).content ?? [] : [paragraph(children)];
      return [{ type: ({ table: "table", tr: "tableRow", td: "tableCell", th: "tableHeader" } as Record<string, string>)[type], attrs: { colspan: node.colSpan ?? 1, rowspan: node.rowSpan ?? 1 }, content: nested }];
    }
    if (type === "bookmark") return [{ type: "bookmark", attrs: { url: props.url ?? node.url, title: children.map(n => n.text ?? "").join(""), description: props.description, image: props.image, resolved: true } }];
    if (type === "h1" || type === "h2" || type === "h3" || type === "h4") return [{ type: "heading", attrs: { level: Number(type.slice(1)) }, content: children }];
    if (type === "heading") return [{ type: "heading", attrs: { level: Math.min(4, Math.max(1, Number(props.level) || 2)) }, content: children }];
    if (type === "bulletListItem" || node.listStyleType === "ul") return [{ type: "bulletList", content: [{ type: "listItem", content: [paragraph(children)] }] }];
    if (type === "numberedListItem" || node.listStyleType === "ol") return [{ type: "orderedList", content: [{ type: "listItem", content: [paragraph(children)] }] }];
    if (type === "checkListItem" || node.listStyleType === "todo") return [{ type: "taskList", content: [{ type: "taskItem", attrs: { checked: props.checked === true || node.checked === true }, content: [paragraph(children)] }] }];
    if (type === "quote" || type === "blockquote") return [{ type: "blockquote", content: [paragraph(children)] }];
    if (type === "codeBlock" || type === "code_block") return [{ type: "codeBlock", attrs: { language: props.language ?? node.lang ?? "text" }, content: children }];
    if (type === "divider" || type === "hr") return [{ type: "horizontalRule" }];
    if (type === "callout") return [{ type: "callout", attrs: { emoji: props.emoji ?? node.icon ?? "💡", fluentUrl: props.fluentUrl ?? "" }, content: children }];
    if (type === "image" || type === "img") { const src = typeof props.url === "string" ? props.url : typeof node.url === "string" ? node.url : typeof props.src === "string" ? props.src : ""; return [{ type: "image", attrs: { src, alt: props.caption ?? node.caption ?? "", width: props.width ?? node.width ?? null } }]; }
    if (!["p", "paragraph"].includes(type)) throw new Error(`지원되지 않는 기존 블록: ${type}. 원본 데이터는 변경하지 않았습니다.`);
    return [paragraph(children)];
  });
  return normalize({ type: "doc", content: content.length ? content : [paragraph()] });
}

export function markdownFor(document: JsonNode): string {
  const inline = (nodes?: JsonNode[]) => (nodes ?? []).map((node) => {
    if (node.type === "hardBreak") return "<br />\n";
    if (node.type === "emoji") return emojiGlyphs.get(String(node.attrs?.name)) ?? `:${String(node.attrs?.name ?? "emoji")}:`;
    if (node.type === "mention") {
      const id = String(node.attrs?.id ?? "");
      const href = id.startsWith("/posts/") ? id : mediaUrl(id);
      return href ? `<a className="post-link-mention" href="${attribute(href)}">${attribute(node.attrs?.label ?? id)}</a>` : attribute(node.attrs?.label ?? id);
    }
    if (node.type === "linkMention") return `<a className="post-link-mention" href="${attribute(node.attrs?.url)}">${attribute(node.attrs?.title ?? node.attrs?.url)}</a>`;
    const raw = node.text ?? "";
    let value = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;").replace(/[\\`*_[\]#]/g, "\\$&");
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") value = `**${value}**`;
      if (mark.type === "italic") value = `*${value}*`;
      if (mark.type === "strike") value = `~~${value}~~`;
      if (mark.type === "underline") value = `<u>${value}</u>`;
      if (mark.type === "code") { const fence = "`".repeat(Math.max(1, ...(raw.match(/`+/g) ?? []).map(run => run.length + 1))); value = `${fence} ${raw} ${fence}`; }
      if (mark.type === "link" && typeof mark.attrs?.href === "string") value = `<a href="${attribute(mark.attrs.href)}">${value}</a>`;
    }
    return value;
  }).join("");
  const block = (node: JsonNode, orderedIndex?: number): string => {
    const text = inline(node.content);
    if (["paragraph", "heading"].includes(node.type ?? "") && ["center", "right"].includes(String(node.attrs?.textAlign))) {
      const content = node.type === "heading" ? `${"#".repeat(Math.min(6, Math.max(1, Number(node.attrs?.level) || 2)))} ${text}` : text;
      return `<div data-text-align="${node.attrs?.textAlign}">\n\n${content}\n\n</div>`;
    }
    if (node.type === "paragraph") return text;
    if (node.type === "heading") return `${"#".repeat(Number(node.attrs?.level) || 2)} ${text}`;
    if (node.type === "blockquote") return (node.content ?? []).map((child) => `> ${block(child)}`).join("\n");
    if (node.type === "codeBlock") {
      const source = (node.content ?? []).map(child => child.text ?? "").join("");
      const fence = "`".repeat(Math.max(3, ...(source.match(/`+/g) ?? []).map(run => run.length + 1)));
      return `${fence}${String(node.attrs?.language ?? "").replace(/[^\w+-]/g, "")}\n${source}\n${fence}`;
    }
    if (node.type === "horizontalRule") return "---";
    if (node.type === "mermaid") return `<Diagram source="${attribute(node.content?.map(child => child.text ?? "").join("") ?? "")}" />`;
    if (node.type === "file") return `<a href="${attribute(mediaUrl(node.attrs?.src))}" target="_blank" rel="noopener noreferrer">${attribute(node.attrs?.name || node.attrs?.src || "파일")}</a>`;
    if (node.type === "video") return `<video src="${attribute(mediaUrl(node.attrs?.src))}" controls preload="metadata" />`;
    if (node.type === "embed") {
      const url = mediaUrl(node.attrs?.url);
      return node.attrs?.mode === "iframe" ? `<iframe src="${attribute(url)}" title="${attribute(node.attrs?.title || "외부 콘텐츠")}" sandbox="allow-scripts allow-presentation" referrerPolicy="no-referrer" loading="lazy" />` : bookmarkMarkdown(url, String(node.attrs?.title || url), String(node.attrs?.description ?? ""), mediaUrl(node.attrs?.thumbnail));
    }
    if (node.type === "image") return `<img src="${attribute(node.attrs?.src)}" alt="${attribute(node.attrs?.alt)}"${typeof node.attrs?.width === "number" ? ` width="${node.attrs.width}"` : ""} />`;
    if (node.type === "bookmark") return bookmarkMarkdown(String(node.attrs?.url ?? ""), String(node.attrs?.title ?? ""), String(node.attrs?.description ?? ""), String(node.attrs?.image ?? ""), String(node.attrs?.layout ?? "bookmark"));
    if (node.type === "callout") return `<Callout emoji="${attribute(node.attrs?.icon ?? node.attrs?.emoji ?? "💡")}" image="${attribute(node.attrs?.fluentUrl)}" background="${attribute(node.attrs?.background ?? "default")}">\n\n${(node.content ?? []).map(child => block(child)).join("\n\n") || " "}\n\n</Callout>`;
    if (node.type === "details") {
      const summary = node.content?.find(child => child.type === "detailsSummary");
      const body = node.content?.find(child => child.type === "detailsContent");
      const level = Number(node.attrs?.level);
      const title = inline(summary?.content);
      return `<details${node.attrs?.open === true ? " open" : ""}>\n<summary>${[1, 2, 3].includes(level) ? `<h${level}>${title}</h${level}>` : title}</summary>\n\n${(body?.content ?? []).map(child => block(child)).join("\n\n")}\n\n</details>`;
    }
    if (["columns", "column", "detailsContent", "detailsSummary"].includes(node.type ?? "")) {
      const tag = ({ columns: "Columns", column: "Column", details: "details", detailsSummary: "summary" } as Record<string, string>)[node.type!];
      const body = node.type === "detailsSummary" ? text : (node.content ?? []).map(child => block(child)).join("\n\n");
      return tag ? `<${tag}${node.type === "columns" ? ` columns="${node.content?.length ?? 2}"` : node.type === "column" ? ` verticalAlign="${["center", "bottom"].includes(String(node.attrs?.verticalAlign)) ? node.attrs?.verticalAlign : "top"}"` : ""}>\n\n${body}\n\n</${tag}>` : body;
    }
    if (node.type === "listItem" || node.type === "taskItem") {
      const marker = node.type === "taskItem" ? `- [${node.attrs?.checked === true ? "x" : " "}] ` : orderedIndex ? `${orderedIndex}. ` : "- ";
      const children = node.content ?? [paragraph()];
      const body = children.map(child => block(child)).join("\n\n");
      return marker + body.replace(/\n/g, `\n${" ".repeat(marker.length)}`);
    }
    if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") return (node.content ?? []).map((child, index) => block(child, node.type === "orderedList" ? index + 1 : undefined)).join("\n");
    if (node.type === "table") return `<table data-full-width="${node.attrs?.fullWidth !== false}">\n<tbody>\n${(node.content ?? []).map(row => `<tr>\n${(row.content ?? []).map(cell => {
      const tag = cell.type === "tableHeader" ? "th" : "td";
      const width = Array.isArray(cell.attrs?.colwidth) ? cell.attrs.colwidth.reduce((sum: number, value: unknown) => sum + (Number(value) || 0), 0) : 0;
      return `<${tag} colSpan="${Number(cell.attrs?.colspan) || 1}" rowSpan="${Number(cell.attrs?.rowspan) || 1}"${width ? ` width="${width}"` : ""}>\n\n${(cell.content ?? []).map(child => block(child)).join("\n\n")}\n\n</${tag}>`;
    }).join("\n")}\n</tr>`).join("\n")}\n</tbody>\n</table>`;
    return text;
  };
  return (document.content ?? []).map((node) => block(node)).filter(Boolean).join("\n\n");
}
