type SavedBookmark = {
  type?: unknown;
  props?: { url?: unknown; description?: unknown; image?: unknown };
  content?: unknown;
};

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function bookmarkTitle(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content.map((item) => {
    if (typeof item !== "object" || item === null) return "";
    const inline = item as { text?: unknown; content?: unknown[] };
    if (typeof inline.text === "string") return inline.text;
    if (Array.isArray(inline.content)) return bookmarkTitle(inline.content);
    return "";
  }).join("").trim();
}

export function bookmarkMarkdown(url: string, title: string, description = "", image = "", layout = "bookmark") {
  const descriptionAttribute = description ? ` description="${escapeAttribute(description)}"` : "";
  const imageAttribute = image ? ` image="${escapeAttribute(image)}"` : "";
  return `<Bookmark url="${escapeAttribute(url)}" title="${escapeAttribute(title)}"${descriptionAttribute}${imageAttribute} layout="${layout === "card" ? "card" : "bookmark"}" />\n`;
}

/** Converts legacy editor bookmark links into the card used by published articles. */
export function restoreBookmarks(source: string, blocks: unknown[]) {
  return blocks.reduce<string>((result, value) => {
    if (typeof value !== "object" || value === null) return result;
    const block = value as SavedBookmark;
    if (block.type !== "bookmark" || typeof block.props?.url !== "string" || !block.props.url) return result;

    const title = bookmarkTitle(block.content) || block.props.url;
    const description = typeof block.props.description === "string" ? block.props.description : "";
    const image = typeof block.props.image === "string" ? block.props.image : "";
    const replacement = bookmarkMarkdown(block.props.url, title, description, image).trim();
    const escapedUrl = escapeRegExp(block.props.url);
    // BlockNote's lossy Markdown serializer emits bookmarks as regular links.
    // Replace only that exact URL, so ordinary links elsewhere stay untouched.
    return result.replace(new RegExp(`\\[[^\\]]*\\]\\(${escapedUrl}(?:\\s+"[^"]*")?\\)`), replacement);
  }, source);
}
