type GitHubComment = { body?: string; created_at?: string; html_url?: string; issue_url?: string; user?: { login?: string; avatar_url?: string } };
type GitHubIssue = { title?: string; labels?: { name?: string }[] };

export type RecentComment = { body: string; createdAt: string; href: string; postTitle: string; author: string; avatar: string };

function repository() {
  return process.env.NEXT_PUBLIC_UTTERANCES_REPO ?? `${process.env.GITHUB_OWNER ?? "klmhyeonwoo"}/${process.env.GITHUB_REPO ?? "klmhyeonwoo"}`;
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  return { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function plainText(value: string) {
  return value.replace(/[`*_>#\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
}

async function issue(url: string) {
  const response = await fetch(url, { headers: headers(), next: { revalidate: 120 } });
  if (!response.ok) return null;
  return await response.json() as GitHubIssue;
}

export async function getRecentComments(): Promise<RecentComment[]> {
  const response = await fetch(`https://api.github.com/repos/${repository()}/issues/comments?per_page=4&sort=created&direction=desc`, { headers: headers(), next: { revalidate: 120 } });
  if (!response.ok) return [];
  const comments = await response.json() as GitHubComment[];
  const results = await Promise.all(comments.filter((comment) => comment.html_url && comment.issue_url && comment.created_at).map(async (comment) => {
    const parent = await issue(comment.issue_url!);
    if (!parent?.labels?.some((label) => label.name === "blog-comment")) return null;
    return { body: plainText(comment.body ?? "") || "새 댓글", createdAt: comment.created_at!, href: comment.html_url!, postTitle: parent.title ?? "댓글이 달린 글", author: comment.user?.login ?? "GitHub 사용자", avatar: comment.user?.avatar_url ?? "" };
  }));
  return results.filter((comment): comment is RecentComment => comment !== null);
}
