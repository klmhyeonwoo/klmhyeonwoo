import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#222222",
          borderRadius: "16px",
          color: "#ffffff",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          fontSize: 38,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-3px",
          paddingBottom: "3px",
          width: "100%",
        }}
      >
        b<span style={{ color: "#f4c542" }}>.</span>
      </div>
    ),
    size,
  );
}
