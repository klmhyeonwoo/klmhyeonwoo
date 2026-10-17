import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { postDateValue } from "./post-date";

const postsDirectory = path.join(process.cwd(), "content", "posts");
const draftsDirectory = path.join(process.cwd(), "drafts");

export type PostMeta = {
  id: string;
  title: string;
  date: string;
  description?: string;
  category: string;
  featured: boolean;
  isPrivate: boolean;
  thumbnail?: string;
};

export type EditablePost = {
  id: string;
  title: string;
  description: string;
  isPrivate: boolean;
  blocks: unknown[];
};

export type DraftMeta = EditablePost & { updatedAt: string };

export function getPosts(includePrivate = false): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs.readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const id = file.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
      const { data } = matter(source);
      const image = source.match(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/)?.[1];
      return {
        id,
        title: String(data.title ?? id),
        date: postDateValue(data.date),
        description: data.description ? String(data.description) : undefined,
        category: String(data.category ?? "Essay"),
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
    return { id: safeId, title: meta.title, description: meta.description ?? "", isPrivate: meta.isPrivate, blocks };
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
        return [{ id, title: draft.title, description: draft.description, isPrivate: draft.isPrivate === true, blocks: draft.blocks, updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : "" }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getEditableDraft(id: string) {
  return getDrafts().find((draft) => draft.id === id) ?? null;
}
