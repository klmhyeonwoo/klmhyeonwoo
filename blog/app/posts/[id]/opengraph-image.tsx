import matter from "gray-matter";
import { ImageResponse } from "next/og";
import { getPost } from "@/lib/posts";

export const alt = "wavy studio 게시글";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ id: string }>;

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

export default async function PostOpenGraphImage({ params }: { params: Params }) {
  const { id } = await params;
  const source = getPost(id);
  const { data } = source ? matter(source) : { data: {} as Record<string, unknown> };
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "wavy studio";
  const isPrivate = data.private === true;
  const description = isPrivate ? "비공개 글입니다." : summary(source ?? "", data);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f7f7f5",
          color: "#222222",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "68px 76px",
          width: "100%",
        }}
      >
        <div style={{ color: "#777", display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>wavy studio</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", fontSize: title.length > 42 ? 54 : 66, fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.2, maxHeight: 160, overflow: "hidden" }}>{title}</div>
          {description && <div style={{ color: "#666", display: "flex", fontSize: 28, letterSpacing: "-1px", lineHeight: 1.45, maxHeight: 82, overflow: "hidden" }}>{description}</div>}
        </div>
        <div style={{ color: "#888", display: "flex", fontSize: 24 }}>wavy studio</div>
      </div>
    ),
    size,
  );
}
