import { randomUUID } from "crypto";
import { attachmentExtension } from "./editor-media";
import type { SiteSettings } from "./site-settings";
import { postSourceVersion } from "./posts";
import matter from "gray-matter";
import type { DraftMeta } from "./posts";

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
  coverImage: string;
  showInList: boolean;
};

type Draft = Omit<Post, "publishedAt"> & { updatedAt: string };
const contentBranch = "blog-content";
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

async function contentBranchExists() {
  const { owner, repo, token } = config();
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${contentBranch}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`GitHub branch lookup failed: ${response.status}`);
  return true;
}

async function ensureContentBranch() {
  const exists = await contentBranchExists();
  const { owner, repo, branch, token } = config();
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  // Refuse to create the branch before the deployed configuration can prevent
  // a preview build from every draft and upload commit.
  const settings = await fetch(`${apiPath("blog/vercel.json")}?ref=${encodeURIComponent(exists ? contentBranch : branch)}`, { headers, cache: "no-store" });
  if (!settings.ok) throw new Error("Deploy the content-branch configuration before saving drafts or uploads");
  const settingsFile = await settings.json() as { content?: string };
  const parsed = JSON.parse(Buffer.from(settingsFile.content ?? "", "base64").toString("utf8"));
  if (parsed?.git?.deploymentEnabled?.[contentBranch] !== false) throw new Error("Content branch deployment must be disabled first");
  if (exists) return;
  const ref = await fetch(`${base}/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`, { headers, cache: "no-store" });
  if (!ref.ok) throw new Error(`GitHub branch lookup failed: ${ref.status}`);
  const { object } = await ref.json() as { object: { sha: string } };
  const created = await fetch(`${base}/git/refs`, { method: "POST", headers, body: JSON.stringify({ ref: `refs/heads/${contentBranch}`, sha: object.sha }) });
  if (!created.ok && !(created.status === 422 && await contentBranchExists())) throw new Error(`GitHub branch creation failed: ${created.status}`);
}

export async function getRemoteDrafts(): Promise<DraftMeta[]> {
  const { branch, token } = config();
  const sourceBranch = await contentBranchExists() ? contentBranch : branch;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
  const response = await fetch(`${apiPath("blog/drafts")}?ref=${encodeURIComponent(sourceBranch)}`, { headers, cache: "no-store" });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`GitHub drafts lookup failed: ${response.status}`);
  const files = await response.json() as { name: string; type: string }[];
  const entries = await Promise.all(files.filter((file) => file.type === "file" && /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?\.json$/.test(file.name)).map(async (file) => {
    const result = await fetch(`${apiPath(`blog/drafts/${file.name}`)}?ref=${encodeURIComponent(sourceBranch)}`, { headers, cache: "no-store" });
    if (!result.ok) throw new Error(`GitHub draft read failed: ${result.status}`);
    const payload = await result.json() as { content?: string };
    const draft = JSON.parse(Buffer.from(payload.content ?? "", "base64").toString("utf8")) as Partial<DraftMeta>;
    if (!Array.isArray(draft.blocks) || typeof draft.title !== "string" || typeof draft.description !== "string") throw new Error(`Invalid draft: ${file.name}`);
    return { id: file.name.slice(0, -5), title: draft.title, description: draft.description, categoryId: draft.categoryId ?? "essay", seriesId: draft.seriesId ?? "", isPrivate: draft.isPrivate === true, coverImage: draft.coverImage ?? "", showInList: draft.showInList !== false, blocks: draft.blocks, updatedAt: draft.updatedAt ?? "" };
  }));
  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function existingSha(path: string, branch = config().branch) {
  const { token } = config();
  const response = await fetch(`${apiPath(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GitHub read failed: ${response.status}`);
  return ((await response.json()) as { sha: string }).sha;
}

async function writeFile(path: string, content: string | Buffer, message: string, branch = config().branch) {
  const { token } = config();
  const sha = await existingSha(path, branch);
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

async function deleteFile(path: string, message: string, branch = config().branch) {
  const { token } = config();
  const sha = await existingSha(path, branch);
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
  const { owner, repo } = config();
  await ensureContentBranch();
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${imageExtension(image.name, image.type)}`;
  const path = `blog/public/uploads/${filename}`;
  await writeFile(path, image.bytes, `Upload image: ${filename}`, contentBranch);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${contentBranch}/${path}`;
}

function yaml(value: string) {
  return JSON.stringify(value);
}

// Commit related files together so a deployment never sees only one half of
// the editor document and its published Markdown projection.
async function writePostFiles(id: string, title: string, mdx: string, blocks: unknown[]) {
  const { owner, repo, branch, token } = config();
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(`${base}${path}`, { method, headers, cache: "no-store", ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status}`);
    return response.json();
  }
  const ref = await request(`/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`) as { object: { sha: string } };
  const parent = ref.object.sha;
  const commit = await request(`/git/commits/${parent}`) as { tree: { sha: string } };
  const tree = await request("/git/trees", "POST", { base_tree: commit.tree.sha, tree: [
    { path: `blog/editor-data/${id}.json`, mode: "100644", type: "blob", content: JSON.stringify(blocks, null, 2) },
    { path: `blog/content/posts/${id}.mdx`, mode: "100644", type: "blob", content: mdx },
  ] }) as { sha: string };
  const next = await request("/git/commits", "POST", { message: `Publish: ${title}`, tree: tree.sha, parents: [parent] }) as { sha: string };
  // force:false prevents overwriting a concurrent update to the branch.
  await request(`/git/refs/heads/${branch.split("/").map(encodeURIComponent).join("/")}`, "PATCH", { sha: next.sha, force: false });
}

export async function saveAttachment(file: { name: string; type: string; bytes: Buffer }) {
  const extension = attachmentExtension(file.name, file.type);
  if (!extension || file.bytes.length > 5 * 1024 * 1024) throw new Error("Invalid attachment");
  const { owner, repo } = config();
  await ensureContentBranch();
  const path = `blog/public/uploads/${randomUUID()}.${extension}`;
  await writeFile(path, file.bytes, `Upload attachment: ${path.split("/").pop()}`, contentBranch);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${contentBranch}/${path}`;
}

export async function savePost(post: Post) {
  const date = post.publishedAt.slice(0, 10);
  const protection = post.isPrivate ? "private: true\n" : "private: false\n";
  const series = post.seriesId ? `series: ${yaml(post.seriesId)}\n` : "";
  const coverImage = post.coverImage.trim() ? `coverImage: ${yaml(post.coverImage.trim())}\n` : "";
  const listVisibility = post.showInList ? "" : "showInList: false\n";
  const mdx = `---\ntitle: ${yaml(post.title)}\ndate: ${date}\npublishedAt: ${yaml(post.publishedAt)}\nupdatedAt: ${yaml(post.updatedAt)}\ndescription: ${yaml(post.description)}\ncategory: ${yaml(post.categoryId)}\n${series}${coverImage}${listVisibility}${protection}---\n\n${post.markdown}\n`;
  await writePostFiles(post.id, post.title, mdx, post.blocks);
  return postSourceVersion(mdx);
}

export async function updatePostPresentation(post: { id: string; title: string; description: string; coverImage: string; showInList: boolean }) {
  const { getPost } = await import("./posts");
  const source = getPost(post.id);
  if (!source) throw new Error("Post not found");
  const parsed = matter(source);
  const data = { ...parsed.data, title: post.title, description: post.description, updatedAt: new Date().toISOString() } as Record<string, unknown>;
  if (post.coverImage) data.coverImage = post.coverImage;
  else delete data.coverImage;
  if (post.showInList) delete data.showInList;
  else data.showInList = false;
  const next = matter.stringify(parsed.content, {
    ...data,
  });
  await writeFile(`blog/content/posts/${post.id}.mdx`, next, `Update series article: ${post.title}`);
  return postSourceVersion(next);
}

export async function saveDraft(draft: Draft) {
  await ensureContentBranch();
  await writeFile(`blog/drafts/${draft.id}.json`, JSON.stringify(draft, null, 2), `Save draft: ${draft.title || "Untitled"}`, contentBranch);
}

export async function deleteDraft(id: string, title: string) {
  await ensureContentBranch();
  await deleteFile(`blog/drafts/${id}.json`, `Delete draft: ${title || "Untitled"}`, contentBranch);
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
