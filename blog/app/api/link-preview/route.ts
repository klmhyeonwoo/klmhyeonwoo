import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function privateAddress(address: string) {
  if (isIP(address) === 6) return address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:") || address.startsWith("::ffff:");
  const [first, second] = address.split(".").map(Number);
  return first === 10 || first === 127 || first === 0 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

async function publicHttpUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || !url.hostname || url.username || url.password) throw new Error("invalid url");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("private host");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("private address");
  return url;
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function metadata(html: string, url: URL) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const getMeta = (...names: string[]) => {
    for (const tag of tags) {
      const key = (attribute(tag, "property") || attribute(tag, "name")).toLowerCase();
      if (names.includes(key)) return attribute(tag, "content");
    }
    return "";
  };
  const title = getMeta("og:title", "twitter:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
  const description = getMeta("og:description", "twitter:description", "description");
  const imageLink = (html.match(/<link\b[^>]*\brel\s*=\s*(?:"image_src"|'image_src'|image_src)[^>]*>/i)?.[0] ?? "");
  const rawImage = getMeta("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src") || attribute(imageLink, "href");
  let image = "";
  try { image = rawImage ? new URL(rawImage, url).href : ""; } catch { image = ""; }
  return { title: title.slice(0, 160), description: description.slice(0, 260), image };
}

function redirectStatus(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function fetchHtml(initialUrl: URL) {
  let url = initialUrl;
  for (let redirects = 0; redirects < 4; redirects += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; wavy-studio-link-preview/1.0)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    if (!redirectStatus(response.status)) return { response, url };

    const location = response.headers.get("location");
    if (!location) throw new Error("missing redirect location");
    url = await publicHttpUrl(new URL(location, url).href);
  }
  throw new Error("too many redirects");
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url") ?? "";
  try {
    const url = await publicHttpUrl(value);
    const { response, url: finalUrl } = await fetchHtml(url);
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("unavailable preview");
    const preview = metadata((await response.text()).slice(0, 500_000), finalUrl);
    return NextResponse.json(preview, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch {
    return NextResponse.json({ error: "링크 미리보기를 불러오지 못했습니다." }, { status: 422 });
  }
}
