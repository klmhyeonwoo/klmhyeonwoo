import { randomUUID } from "crypto";
import { attachmentExtension } from "./editor-media";
import type { SiteSettings } from "./site-settings";
import { postSourceVersion } from "./posts";

type Post = {
  title: string;
  id: string;
  description: string;
  categoryId: string;
  seriesId: string;
  publishedAt: string;
  updatedAt: string;
  markdown: string;
  blocks: unknown[];
  isPrivate: boolean;
};

type Draft = Omit<Post, "publishedAt"> & { updatedAt: string };
type GitHubConfig = { owner: string; repo: string; branch: string; token: string };

function config(): GitHubConfig {
  const { GITHUB_OWNER: owner, GITHUB_REPO: repo, GITHUB_BRANCH: branch = "main", GITHUB_TOKEN: token } = process.env;
  if (!owner || !repo || !token) throw new Error("GitHub environment variables are missing");
  return { owner, repo, branch, token };
}

function apiPath(path: string) {
  const { owner, repo } = config();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function existingSha(path: string) {
  const { branch, token } = config();
  const response = await fetch(`${apiPath(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GitHub read failed: ${response.status}`);
  return ((await response.json()) as { sha: string }).sha;
}

async function writeFile(path: string, content: string | Buffer, message: string) {
  const { branch, token } = config();
  const sha = await existingSha(path);
  const response = await fetch(apiPath(path), {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: typeof content === "string" ? Buffer.from(content).toString("base64") : content.toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!response.ok) throw new Error(`GitHub write failed: ${response.status}`);
}

async function deleteFile(path: string, message: string) {
  const { branch, token } = config();
  const sha = await existingSha(path);
  if (!sha) return;
  const response = await fetch(apiPath(path), {
    method: "DELETE",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!response.ok) throw new Error(`GitHub delete failed: ${response.status}`);
}

function imageExtension(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" } as Record<string, string>)[type] ?? "bin";
}

export async function saveImage(image: { name: string; type: string; bytes: Buffer }) {
  const { owner, repo, branch } = config();
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${imageExtension(image.name, image.type)}`;
  const path = `blog/public/uploads/${filename}`;
  await writeFile(path, image.bytes, `Upload image: ${filename}`);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function yaml(value: string) {
  return JSON.stringify(value);
}

export async function saveAttachment(file: { name: string; type: string; bytes: Buffer }) {
  const extension = attachmentExtension(file.name, file.type);
  if (!extension || file.bytes.length > 5 * 1024 * 1024) throw new Error("Invalid attachment");
  const { owner, repo, branch } = config();
  const path = `blog/public/uploads/${randomUUID()}.${extension}`;
  await writeFile(path, file.bytes, `Upload attachment: ${path.split("/").pop()}`);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

export async function savePost(post: Post) {
  const date = post.publishedAt.slice(0, 10);
  const protection = post.isPrivate ? "private: true\n" : "private: false\n";
  const series = post.seriesId ? `series: ${yaml(post.seriesId)}\n` : "";
  const mdx = `---\ntitle: ${yaml(post.title)}\ndate: ${date}\npublishedAt: ${yaml(post.publishedAt)}\nupdatedAt: ${yaml(post.updatedAt)}\ndescription: ${yaml(post.description)}\ncategory: ${yaml(post.categoryId)}\n${series}${protection}---\n\n${post.markdown}\n`;
  await writeFile(`blog/editor-data/${post.id}.json`, JSON.stringify(post.blocks, null, 2), `Save editor data: ${post.title}`);
  await writeFile(`blog/content/posts/${post.id}.mdx`, mdx, `Publish: ${post.title}`);
  return postSourceVersion(mdx);
}

export async function saveDraft(draft: Draft) {
  await writeFile(`blog/drafts/${draft.id}.json`, JSON.stringify(draft, null, 2), `Save draft: ${draft.title || "Untitled"}`);
}

export async function deleteDraft(id: string, title: string) {
  await deleteFile(`blog/drafts/${id}.json`, `Delete draft: ${title || "Untitled"}`);
}

export async function deletePost(id: string, title: string) {
  await deleteFile(`blog/content/posts/${id}.mdx`, `Delete post: ${title}`);
  await deleteFile(`blog/editor-data/${id}.json`, `Delete editor data: ${title}`);
}

export async function saveCategories(categories: { id: string; name: string }[]) {
  await writeFile("blog/content/categories.json", JSON.stringify(categories, null, 2), "Update categories");
}

export async function saveSeries(series: { id: string; name: string; description: string; coverImage?: string }[]) {
  await writeFile("blog/content/series.json", JSON.stringify(series, null, 2), "Update article series");
}

export async function saveProfile(profile: { name: string; image: string; markdown: string; blocks: unknown[] }) {
  await writeFile("blog/content/profile.json", JSON.stringify(profile, null, 2), "Update profile");
}

export async function saveSiteSettings(settings: SiteSettings) {
  await writeFile("blog/content/site-settings.json", JSON.stringify(settings, null, 2), "Update blog settings");
}
