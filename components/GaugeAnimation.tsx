"use client";

import { useEffect, useRef } from "react";

type GaugeAnimationProps = {
  className?: string;
};

const MIN_DEG = -135;
const MAX_DEG = 30;

export function GaugeAnimation({ className }: GaugeAnimationProps) {
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!needleRef.current) return;
    const lastDeg = parseFloat(sessionStorage.getItem("gauge-angle") ?? String(MIN_DEG));

    // Set needle immediately to last position (avoids SSR/hydration jump)
    needleRef.current.style.transform = `rotate(${lastDeg}deg)`;

    // Pick a direction: go left if near right edge, right if near left edge, else random
    const mid = (MIN_DEG + MAX_DEG) / 2;
    const goRight = lastDeg < mid ? true : lastDeg > mid ? false : Math.random() < 0.5;
    const delta = 30 + Math.random() * 60; // 30–90 degrees
    const targetDeg = Math.max(MIN_DEG, Math.min(MAX_DEG, lastDeg + (goRight ? delta : -delta)));
    sessionStorage.setItem("gauge-angle", String(targetDeg));

    const animation = needleRef.current.animate(
      [
        { transform: `rotate(${lastDeg}deg)` },
        { transform: `rotate(${targetDeg}deg)` },
      ],
      {
        duration: 1000,
        delay: 1000,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        fill: "forwards",
      }
    );
    return () => animation.cancel();
  }, []);

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
          <stop offset="0%"   stopColor="#00e400" />
          <stop offset="10%"  stopColor="#ffff00" />
          <stop offset="20%"  stopColor="#ff7e00" />
          <stop offset="30%"  stopColor="#ff0000" />
          <stop offset="40%"  stopColor="#8f3f97" />
          <stop offset="60%"  stopColor="#7e0023" />
          <stop offset="100%" stopColor="#7e0023" />
        </linearGradient>
        <linearGradient
          id="ga-needle"
          x1="300"
          x2="377"
          y1="220"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#00e400" />
          <stop offset="10%"  stopColor="#ffff00" />
          <stop offset="20%"  stopColor="#ff7e00" />
          <stop offset="30%"  stopColor="#ff0000" />
          <stop offset="40%"  stopColor="#8f3f97" />
          <stop offset="60%"  stopColor="#7e0023" />
          <stop offset="100%" stopColor="#7e0023" />
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
        ref={needleRef}
        style={{
          transformOrigin: "300px 220px",
          transform: `rotate(${MIN_DEG}deg)`,
        }}
      >
        <path
          fill="url(#ga-needle)"
          d="m377.14 128.08-65.65 101.57-22.98-19.29Z"
        />
        <circle cx="300" cy="220" r="22" fill="url(#ga-needle)" />
      </g>
    </svg>
  );
}
