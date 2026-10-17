import fs from "fs";
import path from "path";

const seriesFile = path.join(process.cwd(), "content", "series.json");

export type Series = {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
};

export function getSeries(): Series[] {
  if (!fs.existsSync(seriesFile)) return [];
  try {
    const data: unknown = JSON.parse(fs.readFileSync(seriesFile, "utf8"));
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => (
      typeof item === "object" && item !== null &&
      typeof (item as Series).id === "string" &&
      typeof (item as Series).name === "string" &&
      typeof (item as Series).description === "string"
        ? [{
          id: (item as Series).id,
          name: (item as Series).name,
          description: (item as Series).description,
          coverImage: typeof (item as Series).coverImage === "string" ? (item as Series).coverImage : undefined,
        }]
        : []
    ));
  } catch {
    return [];
  }
}
