import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social-share card for any page that doesn't set its own
 * `openGraph.images` (product/seller pages already do, via their own
 * generateMetadata) — this is what a link to the homepage or any page
 * without a photo of its own looks like when shared on Facebook, Messenger,
 * X, or pasted into an LLM chat that fetches link previews. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7f0e3",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#c95532",
            marginBottom: 24,
          }}
        >
          Everything Filipino, at iba pa
        </div>
        <div style={{ fontSize: 160, fontWeight: 800, color: "#29170f", lineHeight: 1 }}>ATBP</div>
        <div style={{ fontSize: 34, color: "#29170f", marginTop: 28, opacity: 0.8 }}>Find something different.</div>
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 44,
          }}
        >
          {["Handmade", "Vintage", "Pre-loved", "Collectibles"].map((tag) => (
            <div
              key={tag}
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#29170f",
                background: "#e9a52f33",
                border: "2px solid #e9a52f",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
