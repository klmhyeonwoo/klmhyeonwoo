/** Encode UUID bytes without truncation, keeping share links stable and collision-free. */
export function shortPostId(id: string): string | null {
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return null;
  return Buffer.from(id.replace(/-/g, ""), "hex").toString("base64url");
}
