/** Only web URLs are accepted by media blocks; never javascript/data URLs. */
export function mediaUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}

export const attachmentTypes: Record<string, string[]> = {
  pdf: ["application/pdf"], txt: ["text/plain"], csv: ["text/csv", "application/vnd.ms-excel"],
  zip: ["application/zip", "application/x-zip-compressed"],
  mp4: ["video/mp4"], webm: ["video/webm"], mov: ["video/quicktime"],
};
export function attachmentExtension(name: string, type: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return attachmentTypes[extension]?.includes(type) ? extension : null;
}
