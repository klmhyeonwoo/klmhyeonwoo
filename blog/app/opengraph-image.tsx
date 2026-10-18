import { ImageResponse } from "next/og";

export const alt = "wavy. | 기록을 쌓아가는 개인 블로그";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f7f5",
          color: "#222222",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "74px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", fontSize: 68, fontWeight: 800, letterSpacing: "-4px" }}>wavy<span style={{ color: "#777" }}>.</span></div>
        <div style={{ color: "#666", display: "flex", fontSize: 30, marginTop: 26 }}>기록을 쌓아가는 개인 블로그</div>
      </div>
    ),
    size,
  );
}
