import { ImageResponse } from "next/og";
import { getDictionary, hasLocale } from "@/lib/dictionaries";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ lang: string }> };

export default async function TwitterImage({ params }: Props) {
  const { lang } = await params;
  const dict = hasLocale(lang) ? await getDictionary(lang) : null;
  const title = dict?.nav.title ?? "Luftmonitor";
  const description = dict?.metadata.description ?? "";

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
          backgroundColor: "#0a0a0a",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Good blob */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "rgba(0,228,0,0.15)",
            filter: "blur(80px)",
          }}
        />
        {/* Hazardous blob */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(126,0,35,0.15)",
            filter: "blur(80px)",
          }}
        />

        {/* Gauge SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="100 -10 400 300"
          width="220"
          height="147"
          style={{ marginBottom: 32 }}
        >
          <defs>
            <linearGradient id="a" x1="140" x2="460" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#00e400" />
              <stop offset="10%"  stopColor="#ffff00" />
              <stop offset="20%"  stopColor="#ff7e00" />
              <stop offset="30%"  stopColor="#ff0000" />
              <stop offset="40%"  stopColor="#8f3f97" />
              <stop offset="60%"  stopColor="#7e0023" />
              <stop offset="100%" stopColor="#7e0023" />
            </linearGradient>
            <linearGradient id="b" x1="300" x2="377" y1="220" y2="128" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#00e400" />
              <stop offset="10%"  stopColor="#ffff00" />
              <stop offset="20%"  stopColor="#ff7e00" />
              <stop offset="30%"  stopColor="#ff0000" />
              <stop offset="40%"  stopColor="#8f3f97" />
              <stop offset="60%"  stopColor="#7e0023" />
              <stop offset="100%" stopColor="#7e0023" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#a)" strokeWidth="40" strokeLinecap="round">
            <path d="M140 220a160 160 0 0 1 80-140" />
            <path d="M220 80a160 160 0 0 1 160 0" />
            <path d="M380 80a160 160 0 0 1 80 140" />
          </g>
          <path fill="url(#b)" d="m377.14 128.08-65.65 101.57-22.98-19.29Z" />
          <circle cx="300" cy="220" r="22" fill="url(#b)" />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-2px",
            background: "linear-gradient(90deg, #00e400, #ff7e00, #7e0023)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 16,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    ),
    { ...size },
  );
}
