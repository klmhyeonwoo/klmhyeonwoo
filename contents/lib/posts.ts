import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "blog", "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description?: string;
  category: string;
  featured: boolean;
  thumbnail?: string;
};

export function getPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs.readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
      const { data } = matter(source);
      const image = source.match(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/)?.[1];
      return {
        slug,
        title: String(data.title ?? slug),
        date: String(data.date ?? ""),
        description: data.description ? String(data.description) : undefined,
        category: String(data.category ?? "Essay"),
        featured: data.featured === true,
        thumbnail: data.coverImage ? String(data.coverImage) : image,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/g, "");
  if (safeSlug !== slug) return null;
  const file = path.join(postsDirectory, `${safeSlug}.mdx`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

export function getEditablePost(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/g, "");
  if (safeSlug !== slug) return null;
  const meta = getPosts().find((post) => post.slug === safeSlug);
  const editorFile = path.join(process.cwd(), "blog", "editor-data", `${safeSlug}.json`);
  if (!meta || !fs.existsSync(editorFile)) return null;

  try {
    const blocks: unknown = JSON.parse(fs.readFileSync(editorFile, "utf8"));
    if (!Array.isArray(blocks)) return null;
    return { slug: safeSlug, title: meta.title, description: meta.description ?? "", blocks };
  } catch {
    return null;
  }
}
