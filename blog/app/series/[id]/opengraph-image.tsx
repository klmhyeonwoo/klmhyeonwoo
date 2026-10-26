import { ImageResponse } from "next/og";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";

export const alt = "wavy studio 아티클 시리즈";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ id: string }>;

export default async function SeriesOpenGraphImage({ params }: { params: Params }) {
  const { id } = await params;
  const series = getSeries().find((item) => item.id === id);
  const count = getPosts().filter((post) => post.seriesId === id).length;
  const title = series?.name ?? "아티클 시리즈";
  const description = series?.description || `${count}개의 아티클을 모아봅니다.`;

  return new ImageResponse(
    <div style={{ background: "#141816", color: "#f7faf8", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", overflow: "hidden", padding: "54px 64px 50px", position: "relative", width: "100%" }}>
      <div style={{ background: "#43d982", borderRadius: "999px", height: "420px", opacity: 0.15, position: "absolute", right: "-130px", top: "-190px", width: "420px" }} />
      <div style={{ background: "#43d982", bottom: "0", height: "8px", left: "0", position: "absolute", width: "100%" }} />
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: "-1.5px" }}>wavy<span style={{ color: "#43d982" }}>.</span></div>
        <div style={{ border: "1px solid #455149", borderRadius: "999px", color: "#b8c3bb", display: "flex", fontSize: 18, fontWeight: 700, letterSpacing: "0.8px", padding: "9px 15px" }}>COLLECTION</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
        <div style={{ color: "#43d982", display: "flex", fontSize: 22, fontWeight: 700 }}>{count} ARTICLES</div>
        <div style={{ display: "flex", fontSize: title.length > 28 ? 52 : 66, fontWeight: 760, letterSpacing: "-3px", lineHeight: 1.18, maxHeight: "158px", overflow: "hidden" }}>{title}</div>
        <div style={{ color: "#c3ccc5", display: "flex", fontSize: 25, letterSpacing: "-0.8px", lineHeight: 1.45, maxHeight: "72px", overflow: "hidden" }}>{description}</div>
      </div>
      <div style={{ color: "#9eaaa2", display: "flex", fontSize: 20, position: "relative" }}>wavy studio</div>
    </div>,
    size,
  );
}
