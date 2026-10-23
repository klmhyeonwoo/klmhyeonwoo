/** Display prose only: saved MDX components and their props are not summaries. */
export function postExcerpt(source: string, limit = 180): string | undefined {
  const text = source
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<([A-Za-z][\w.-]*)(?:\s[^<>]*?)?>[\s\S]*?<\/\1>/g, (match, tag: string) => /^(script|style)$/i.test(tag) ? " " : match)
    .replace(/<\/?[A-Za-z][\w.:-]*(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " " })[entity] ?? entity)
    .replace(/[#>*_`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text : undefined;
}
