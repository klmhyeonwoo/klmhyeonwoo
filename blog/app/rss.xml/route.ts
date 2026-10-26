import { getPosts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rssDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toUTCString();
}

export async function GET() {
  const posts = getPosts();
  const siteUrl = absoluteUrl("/");
  const latestPostDate = posts
    .map((post) => rssDate(post.updatedAt || post.publishedAt || post.date))
    .filter((date): date is string => Boolean(date))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  const items = posts.map((post) => {
    const url = absoluteUrl(`/posts/${post.id}`);
    const publishedAt = rssDate(post.publishedAt || post.date);
    const description = post.description || post.excerpt || `${post.title}에 관한 글입니다.`;
    return [
      "<item>",
      `<title>${escapeXml(post.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink=\"true\">${escapeXml(url)}</guid>`,
      `<description>${escapeXml(description)}</description>`,
      post.category ? `<category>${escapeXml(post.category)}</category>` : "",
      publishedAt ? `<pubDate>${publishedAt}</pubDate>` : "",
      "</item>",
    ].filter(Boolean).join("");
  }).join("");

  const body = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">
  <channel>
    <title>wavy studio</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>개발과 일상, 배움을 기록하는 현우의 개인 블로그입니다.</description>
    <language>ko</language>
    <atom:link href=\"${escapeXml(absoluteUrl("/rss.xml"))}\" rel=\"self\" type=\"application/rss+xml\" />
    ${latestPostDate ? `<lastBuildDate>${latestPostDate}</lastBuildDate>` : ""}
    ${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
