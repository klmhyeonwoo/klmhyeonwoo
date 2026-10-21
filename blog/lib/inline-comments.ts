import "server-only";
import { validComment, type InlineComment } from "./inline-comment-types";

type Issue = { number: number; title: string; body: string; pull_request?: unknown };
type Comment = { id: number; body: string; created_at: string };
const marker = "wavy-inline-comments-v1";

async function github<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const { GITHUB_OWNER: owner, GITHUB_REPO: repo, GITHUB_TOKEN: token } = process.env;
  if (!owner || !repo || !token) throw new Error("Inline comment storage is not configured");
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${path}`, {
    method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Inline comment storage: ${response.status}`);
  return response.status === 204 ? undefined as T : response.json();
}

async function issues(postId: string) {
  const matches: Issue[] = [];
  for (let page = 1; ; page++) {
    const batch = await github<Issue[]>(`issues?state=all&per_page=100&page=${page}`);
    matches.push(...batch.filter(issue => !issue.pull_request && issue.title === `[본문 댓글] ${postId}` && issue.body === marker));
    if (batch.length < 100) return matches;
  }
}

export async function listInlineComments(postId: string): Promise<InlineComment[]> {
  const result: InlineComment[] = [];
  for (const issue of await issues(postId)) {
    for (let page = 1; ; page++) {
      const batch = await github<Comment[]>(`issues/${issue.number}/comments?per_page=100&page=${page}`);
      for (const comment of batch) {
        try {
          const value: unknown = JSON.parse(comment.body);
          if (validComment(value)) result.push({ id: comment.id, name: value.name, body: value.body, anchor: value.anchor, createdAt: comment.created_at });
        } catch { /* Other GitHub comments are not inline comments. */ }
      }
      if (batch.length < 100) break;
    }
  }
  return result.sort((a, b) => a.id - b.id);
}

export async function createInlineComment(postId: string, value: Omit<InlineComment, "id" | "createdAt">) {
  const existing = await issues(postId);
  const issue = existing[0] ?? await github<Issue>("issues", "POST", { title: `[본문 댓글] ${postId}`, body: marker });
  const comment = await github<Comment>(`issues/${issue.number}/comments`, "POST", { body: JSON.stringify(value) });
  return { ...value, id: comment.id, createdAt: comment.created_at };
}

export async function deleteInlineComment(postId: string, commentId: number) {
  if (!(await listInlineComments(postId)).some(comment => comment.id === commentId)) return false;
  await github(`issues/comments/${commentId}`, "DELETE");
  return true;
}
