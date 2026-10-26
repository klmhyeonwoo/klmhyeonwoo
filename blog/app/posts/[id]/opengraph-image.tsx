import matter from "gray-matter";
import { ImageResponse } from "next/og";
import { getPost, getPosts } from "@/lib/posts";

export const alt = "wavy studio 게시글";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

type Params = Promise<{ id: string }>;

// Article writes create a new deployment, so pre-rendering keeps crawler and
// share-preview traffic off the Fluid Function runtime.
export function generateStaticParams() {
  return getPosts().map(({ id }) => ({ id }));
}

function summary(source: string, data: Record<string, unknown>) {
  if (typeof data.description === "string" && data.description.trim()) return data.description.trim();
  const text = source
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 145 ? `${text.slice(0, 145).trimEnd()}…` : text;
}

function postOgDetails(id: string) {
  const source = getPost(id);
  const { data } = source ? matter(source) : { data: {} as Record<string, unknown> };
  const isPrivate = data.private === true;
  const post = isPrivate ? undefined : getPosts(true).find((item) => item.id === id);
  const title = isPrivate
    ? "비공개 글"
    : typeof data.title === "string" && data.title.trim() ? data.title.trim() : "wavy studio";
  const description = isPrivate ? "비공개 글입니다." : summary(source ?? "", data);
  const context = [post?.series, post?.category].filter((value): value is string => Boolean(value)).join(" · ");
  const date = isPrivate ? "" : typeof data.date === "string" ? data.date : "";
  const titleFontSize = title.length > 54 ? 48 : title.length > 34 ? 56 : 66;

  return { context, date, description, title, titleFontSize };
}

export default async function PostOpenGraphImage({ params }: { params: Params }) {
  const { id } = await params;
  const { context, date, description, title, titleFontSize } = postOgDetails(id);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#141816",
          color: "#f7faf8",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "54px 64px 50px",
          position: "relative",
          width: "100%",
        }}
      >
        <div style={{ background: "#43d982", borderRadius: "999px", height: "420px", opacity: 0.15, position: "absolute", right: "-130px", top: "-190px", width: "420px" }} />
        <div style={{ background: "#43d982", bottom: "0", height: "8px", left: "0", position: "absolute", width: "100%" }} />
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: "-1.5px" }}>wavy<span style={{ color: "#43d982" }}>.</span></div>
          <div style={{ border: "1px solid #455149", borderRadius: "999px", color: "#b8c3bb", display: "flex", fontSize: 18, fontWeight: 700, letterSpacing: "0.8px", padding: "9px 15px" }}>ARTICLE</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
          {context && <div style={{ color: "#43d982", display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>{context}</div>}
          <div style={{ display: "flex", fontSize: titleFontSize, fontWeight: 760, letterSpacing: "-3px", lineHeight: 1.18, maxHeight: "178px", overflow: "hidden" }}>{title}</div>
          {description && <div style={{ color: "#c3ccc5", display: "flex", fontSize: 25, letterSpacing: "-0.8px", lineHeight: 1.45, maxHeight: "72px", overflow: "hidden" }}>{description}</div>}
        </div>
        <div style={{ alignItems: "center", color: "#9eaaa2", display: "flex", fontSize: 20, justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex" }}>wavy studio</div>
          {date && <div style={{ display: "flex" }}>{date}</div>}
        </div>
      </div>
    ),
    size,
  );
}
