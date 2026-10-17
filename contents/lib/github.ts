import { randomUUID } from "crypto";

type Post = {
  title: string;
  slug: string;
  description: string;
  markdown: string;
  blocks: unknown[];
};

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
  return (await response.json() as { sha: string }).sha;
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

function imageExtension(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" } as Record<string, string>)[type] ?? "bin";
}

export async function saveImage(image: { name: string; type: string; bytes: Buffer }) {
  const { owner, repo, branch } = config();
  const suffix = randomUUID().slice(0, 8);
  const filename = `${Date.now()}-${suffix}.${imageExtension(image.name, image.type)}`;
  const path = `public/uploads/${filename}`;
  await writeFile(path, image.bytes, `Upload image: ${filename}`);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function yaml(value: string) {
  return JSON.stringify(value);
}

export async function savePost(post: Post) {
  const date = new Date().toISOString().slice(0, 10);
  const mdx = `---\ntitle: ${yaml(post.title)}\ndate: ${date}\ndescription: ${yaml(post.description)}\n---\n\n${post.markdown}\n`;

  // ponytail: files are committed separately; use Git Data API for an atomic multi-file commit if that ever matters.
  await writeFile(`editor-data/${post.slug}.json`, JSON.stringify(post.blocks, null, 2), `Save editor data: ${post.title}`);
  await writeFile(`content/posts/${post.slug}.mdx`, mdx, `Publish: ${post.title}`);
}
