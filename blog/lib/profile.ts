import fs from "fs";
import path from "path";

export type Profile = { name: string; image: string; markdown: string; blocks: unknown[] };

const profileFile = path.join(process.cwd(), "content", "profile.json");
const fallback: Profile = { name: "현우", image: "", markdown: "", blocks: [] };

export function getProfile(): Profile {
  if (!fs.existsSync(profileFile)) return fallback;
  try {
    const profile = JSON.parse(fs.readFileSync(profileFile, "utf8")) as Partial<Profile>;
    return { name: typeof profile.name === "string" && profile.name.trim() ? profile.name : fallback.name, image: typeof profile.image === "string" ? profile.image : "", markdown: typeof profile.markdown === "string" ? profile.markdown : "", blocks: Array.isArray(profile.blocks) ? profile.blocks : [] };
  } catch {
    return fallback;
  }
}
