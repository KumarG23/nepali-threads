import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Nepali Threads — Handmade clothing from Nepal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAF7F2",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* Brand-gold accent line */}
          <div
            style={{
              width: "80px",
              height: "3px",
              backgroundColor: "#C9A84C",
            }}
          />
          {/* Wordmark */}
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "96px",
              color: "#2A2420",
              letterSpacing: "-0.02em",
            }}
          >
            nepali threads
          </div>
          {/* Tagline */}
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "28px",
              color: "rgba(42, 36, 32, 0.7)",
              letterSpacing: "0.02em",
            }}
          >
            Handmade clothing from Nepal
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
