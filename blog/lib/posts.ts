import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { postDateValue } from "./post-date";
import { getSeries } from "./series";

const postsDirectory = path.join(process.cwd(), "content", "posts");
const draftsDirectory = path.join(process.cwd(), "drafts");
const categoriesFile = path.join(process.cwd(), "content", "categories.json");

export type Category = { id: string; name: string };

export function getCategories(): Category[] {
  if (!fs.existsSync(categoriesFile)) return [];
  try {
    const categories = JSON.parse(fs.readFileSync(categoriesFile, "utf8")) as unknown;
    if (!Array.isArray(categories)) return [];
    return categories.flatMap((category) => (
      typeof category === "object" && category !== null &&
      typeof (category as Category).id === "string" && typeof (category as Category).name === "string"
        ? [{ id: (category as Category).id, name: (category as Category).name }]
        : []
    ));
  } catch {
    return [];
  }
}

export type PostMeta = {
  id: string;
  title: string;
  date: string;
  description?: string;
  categoryId: string;
  category: string;
  seriesId?: string;
  series?: string;
  excerpt?: string;
  featured: boolean;
  isPrivate: boolean;
  thumbnail?: string;
};

export type EditablePost = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  seriesId: string;
  isPrivate: boolean;
  blocks: unknown[];
};

export type DraftMeta = EditablePost & { updatedAt: string };

function excerptFromMarkdown(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
}

export function getPosts(includePrivate = false): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];
  const categories = getCategories();
  const seriesList = getSeries();
  return fs.readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const id = file.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
      const { data, content } = matter(source);
      const image = source.match(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/)?.[1];
      const categoryValue = String(data.category ?? "essay");
      const category = categories.find((item) => item.id === categoryValue || item.name === categoryValue);
      const seriesValue = typeof data.series === "string" ? data.series : "";
      const series = seriesList.find((item) => item.id === seriesValue || item.name === seriesValue);
      return {
        id,
        title: String(data.title ?? id),
        date: postDateValue(data.date),
        description: data.description ? String(data.description) : undefined,
        excerpt: data.description ? String(data.description) : data.private === true ? undefined : excerptFromMarkdown(content),
        categoryId: category?.id ?? categoryValue,
        category: category?.name ?? "미분류",
        seriesId: series?.id,
        series: series?.name,
        featured: data.featured === true,
        isPrivate: data.private === true,
        thumbnail: data.coverImage ? String(data.coverImage) : image,
      };
    })
    .filter((post) => includePrivate || !post.isPrivate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function safePostId(id: string) {
  return id.replace(/[^a-z0-9-]/g, "");
}

export function getPost(id: string) {
  const safeId = safePostId(id);
  if (safeId !== id) return null;
  const file = path.join(postsDirectory, `${safeId}.mdx`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

export function getPostPasswordHash(id: string) {
  const source = getPost(id);
  if (!source) return null;
  const { data } = matter(source);
  return typeof data.passwordHash === "string" ? data.passwordHash : null;
}

export function getEditablePost(id: string): EditablePost | null {
  const safeId = safePostId(id);
  if (safeId !== id) return null;
  const meta = getPosts(true).find((post) => post.id === safeId);
  const editorFile = path.join(process.cwd(), "editor-data", `${safeId}.json`);
  if (!meta || !fs.existsSync(editorFile)) return null;
  try {
    const blocks: unknown = JSON.parse(fs.readFileSync(editorFile, "utf8"));
    if (!Array.isArray(blocks)) return null;
    return { id: safeId, title: meta.title, description: meta.description ?? "", categoryId: meta.categoryId, seriesId: meta.seriesId ?? "", isPrivate: meta.isPrivate, blocks };
  } catch {
    return null;
  }
}

export function getDrafts(): DraftMeta[] {
  if (!fs.existsSync(draftsDirectory)) return [];
  return fs.readdirSync(draftsDirectory)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const id = file.replace(/\.json$/, "");
      if (safePostId(id) !== id) return [];
      try {
        const draft = JSON.parse(fs.readFileSync(path.join(draftsDirectory, file), "utf8")) as Partial<DraftMeta>;
        if (!Array.isArray(draft.blocks) || typeof draft.title !== "string" || typeof draft.description !== "string") return [];
        return [{ id, title: draft.title, description: draft.description, categoryId: typeof draft.categoryId === "string" ? draft.categoryId : "essay", seriesId: typeof draft.seriesId === "string" ? draft.seriesId : "", isPrivate: draft.isPrivate === true, blocks: draft.blocks, updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : "" }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getEditableDraft(id: string) {
  return getDrafts().find((draft) => draft.id === id) ?? null;
}
