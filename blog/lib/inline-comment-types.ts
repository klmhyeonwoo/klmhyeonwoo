export type TextAnchor = { quote: string; prefix: string; suffix: string; start: number };
export type InlineComment = { id: number; name: string; body: string; anchor: TextAnchor; createdAt: string };

export function validComment(value: unknown): value is { name: string; body: string; anchor: TextAnchor } {
  if (!value || typeof value !== "object") return false;
  const { name, body, anchor } = value as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || name.length > 40 || typeof body !== "string" || !body.trim() || body.length > 2000) return false;
  if (!anchor || typeof anchor !== "object") return false;
  const a = anchor as Record<string, unknown>;
  return typeof a.quote === "string" && !!a.quote.trim() && a.quote.length <= 1000 && typeof a.prefix === "string" && a.prefix.length <= 60 && typeof a.suffix === "string" && a.suffix.length <= 60 && Number.isSafeInteger(a.start) && (a.start as number) >= 0;
}
