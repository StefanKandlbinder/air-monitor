"use client";

import { useSessionFlag } from "@/lib/hooks/use-session-flag";

type GaugeAnimationProps = {
  className?: string;
};

export function GaugeAnimation({ className }: GaugeAnimationProps) {
  const shouldAnimate = useSessionFlag("gauge-animated");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="100 -10 400 300"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="ga-arc"
          x1="140"
          x2="460"
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#39b54a" />
          <stop offset="50%" stopColor="#f2c318" />
          <stop offset="100%" stopColor="#e53935" />
        </linearGradient>
        <linearGradient
          id="ga-needle"
          x1="300"
          x2="377"
          y1="220"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#39b54a" />
          <stop offset="50%" stopColor="#f2c318" />
          <stop offset="100%" stopColor="#e53935" />
        </linearGradient>
      </defs>

      {/* Arcs */}
      <g
        fill="none"
        stroke="url(#ga-arc)"
        strokeWidth="40"
        strokeLinecap="round"
      >
        <path d="M140 220a160 160 0 0 1 80-140" />
        <path d="M220 80a160 160 0 0 1 160 0" />
        <path d="M380 80a160 160 0 0 1 80 140" />
      </g>

      {/* Needle + pivot */}
      <g
        style={{
          transformOrigin: "300px 220px",
          transform: shouldAnimate ? "rotate(-135deg)" : "rotate(15deg)",
          animation: shouldAnimate
            ? "ga-sweep 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1s 1 forwards"
            : undefined,
        }}
      >
        <path
          fill="url(#ga-needle)"
          d="m377.14 128.08-65.65 101.57-22.98-19.29Z"
        />
        <circle cx="300" cy="220" r="22" fill="url(#ga-needle)" />
      </g>

      {shouldAnimate && (
        <style>{`
          @keyframes ga-sweep {
            from { transform: rotate(-135deg); }
            to   { transform: rotate(15deg); }
          }
        `}</style>
      )}
    </svg>
  );
}
