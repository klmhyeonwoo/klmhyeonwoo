import { unstable_cache } from "next/cache";

type GitHubComment = { body?: string; created_at?: string; html_url?: string; issue_url?: string; user?: { login?: string; avatar_url?: string } };
type GitHubIssue = { title?: string; labels?: { name?: string }[] };
type GiscusAuthor = { login?: string; avatarUrl?: string } | null;
type GiscusComment = { body?: string; createdAt?: string; url?: string; author?: GiscusAuthor; replies?: { nodes?: GiscusComment[] } };
type GiscusDiscussion = { title?: string; comments?: { nodes?: GiscusComment[] } };
type GiscusResponse = { data?: { repository?: { discussions?: { nodes?: GiscusDiscussion[] } } }; errors?: unknown[] };

export type RecentComment = { body: string; createdAt: string; href: string; postTitle: string; author: string; avatar: string };

// A short server cache keeps the GitHub API within rate limits while ensuring
// a new comment becomes visible on the home page without needing to visit the
// article that owns the discussion.
const recentCommentsRevalidateSeconds = 60;

function repository() {
  return process.env.NEXT_PUBLIC_UTTERANCES_REPO ?? `${process.env.GITHUB_OWNER ?? "klmhyeonwoo"}/${process.env.GITHUB_REPO ?? "klmhyeonwoo"}`;
}

function giscusConfiguration() {
  const value = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  const configured = [
    value,
    process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
    categoryId,
  ].every(Boolean);
  return configured && value && categoryId && /^[^/\s]+\/[^/\s]+$/.test(value)
    ? { repository: value, categoryId }
    : null;
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  return { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function plainText(value: string) {
  return value.replace(/[`*_>#\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
}

async function issue(url: string) {
  const response = await fetch(url, { headers: headers(), next: { revalidate: recentCommentsRevalidateSeconds } });
  if (!response.ok) return null;
  return await response.json() as GitHubIssue;
}

function toRecentComment(comment: GiscusComment, postTitle: string): RecentComment | null {
  if (!comment.url || !comment.createdAt) return null;
  return {
    body: plainText(comment.body ?? "") || "새 댓글",
    createdAt: comment.createdAt,
    href: comment.url,
    postTitle,
    author: comment.author?.login ?? "GitHub 사용자",
    avatar: comment.author?.avatarUrl ?? "",
  };
}

async function getGiscusRecentComments(configuration: { repository: string; categoryId: string }): Promise<RecentComment[] | null> {
  const { repository: repositoryName, categoryId } = configuration;
  const [owner, name] = repositoryName.split("/");
  const query = `query RecentGiscusComments($owner: String!, $name: String!, $categoryId: ID!) {
    repository(owner: $owner, name: $name) {
      discussions(first: 30, categoryId: $categoryId, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          title
          comments(last: 10) {
            nodes {
              body createdAt url author { login avatarUrl }
              replies(last: 10) {
                nodes { body createdAt url author { login avatarUrl } }
              }
            }
          }
        }
      }
    }
  }`;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { owner, name, categoryId } }),
    next: { revalidate: recentCommentsRevalidateSeconds },
  });
  if (!response.ok) return null;
  const payload = await response.json() as GiscusResponse;
  if (payload.errors || !payload.data?.repository) return null;
  return (payload.data.repository.discussions?.nodes ?? [])
    .flatMap((discussion) => (discussion.comments?.nodes ?? []).flatMap((comment) => [
      toRecentComment(comment, discussion.title ?? "댓글이 달린 글"),
      ...(comment.replies?.nodes ?? []).map((reply) => toRecentComment(reply, discussion.title ?? "댓글이 달린 글")),
    ]))
    .filter((comment): comment is RecentComment => comment !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);
}

async function loadRecentComments(): Promise<RecentComment[]> {
  const giscus = giscusConfiguration();
  if (giscus) return (await getGiscusRecentComments(giscus)) ?? [];
  const response = await fetch(`https://api.github.com/repos/${repository()}/issues/comments?per_page=4&sort=created&direction=desc`, { headers: headers(), next: { revalidate: recentCommentsRevalidateSeconds } });
  if (!response.ok) return [];
  const comments = await response.json() as GitHubComment[];
  const results = await Promise.all(comments.filter((comment) => comment.html_url && comment.issue_url && comment.created_at).map(async (comment) => {
    const parent = await issue(comment.issue_url!);
    if (!parent?.labels?.some((label) => label.name === "blog-comment")) return null;
    return { body: plainText(comment.body ?? "") || "새 댓글", createdAt: comment.created_at!, href: comment.html_url!, postTitle: parent.title ?? "댓글이 달린 글", author: comment.user?.login ?? "GitHub 사용자", avatar: comment.user?.avatar_url ?? "" };
  }));
  return results.filter((comment): comment is RecentComment => comment !== null).slice(0, 4);
}
// Home stays dynamic for the admin session, but comments do not need to make
// every visitor wait on GitHub. Cache this independent, external request for a
// short period so a fresh comment still appears promptly.
const getCachedRecentComments = unstable_cache(
  loadRecentComments,
  ["recent-comments"],
  { revalidate: recentCommentsRevalidateSeconds },
);

export function getRecentComments(): Promise<RecentComment[]> {
  return getCachedRecentComments();
}
