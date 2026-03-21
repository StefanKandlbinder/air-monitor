"use client";

import { useLayoutEffect, useRef, useState } from "react";

const CX = 250;
const CY = 200;
const R = 175;
const START_ANGLE = 225;
const SWEEP = 270;
const END_ANGLE = START_ANGLE + SWEEP;
const MAX_VAL = 500;

// AQI color stops mapped to degrees within the SWEEP (0 = AQI 0, 270 = AQI 500)
const AQI_STOPS: Array<{ deg: number; rgb: [number, number, number] }> = [
  { deg: 0, rgb: [0, 228, 0] }, // AQI 0   – Good
  { deg: 27, rgb: [255, 255, 0] }, // AQI 50  – Moderate
  { deg: 54, rgb: [255, 126, 0] }, // AQI 100 – Unhealthy for Sensitive
  { deg: 81, rgb: [255, 0, 0] }, // AQI 150 – Unhealthy
  { deg: 108, rgb: [143, 63, 151] }, // AQI 200 – Very Unhealthy
  { deg: 162, rgb: [126, 0, 35] }, // AQI 300 – Hazardous
  { deg: 270, rgb: [126, 0, 35] }, // AQI 500 – Hazardous (end)
];

// Static full-range conic gradient — the SVG mask handles the progress clip,
// so the gradient itself never needs to be recalculated.
// `transparent` after SWEEP prevents the conic from wrapping its hazardous→green
// interpolation into the "back" region, which would bleed into the start rounded cap.
const FULL_ARC_GRADIENT = (() => {
  const cyCenterPct = ((CY / 430) * 100).toFixed(2);
  const stops = AQI_STOPS.map((s) => `rgb(${s.rgb.join(",")}) ${s.deg}deg`);
  stops.push(`transparent ${SWEEP + 0.01}deg`, `transparent 360deg`);
  return `conic-gradient(from ${START_ANGLE}deg at 50% ${cyCenterPct}%, ${stops.join(", ")})`;
})();

/**
 * Evaluate CSS cubic-bezier(0.34, 1.56, 0.64, 1) in JS so needle and arc
 * are driven by exactly the same easing curve — frame-perfect sync.
 */
function springEase(x: number): number {
  const p1x = 0.34,
    p1y = 1.56,
    p2x = 0.64,
    p2y = 1.0;
  const bx = (t: number) =>
    3 * p1x * t * (1 - t) * (1 - t) + 3 * p2x * t * t * (1 - t) + t * t * t;
  const bxd = (t: number) =>
    3 * p1x * ((1 - t) * (1 - t) - 2 * t * (1 - t)) +
    3 * p2x * (2 * t * (1 - t) - t * t) +
    3 * t * t;
  const by = (t: number) =>
    3 * p1y * t * (1 - t) * (1 - t) + 3 * p2y * t * t * (1 - t) + t * t * t;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const dx = bxd(t);
    if (Math.abs(dx) < 1e-6) break;
    t -= (bx(t) - x) / dx;
    t = Math.min(Math.max(t, 0), 1);
  }
  return by(t);
}

const TICKS = [
  { val: 0, label: "0" },
  { val: 50, label: "50" },
  { val: 100, label: "100" },
  { val: 150, label: "150" },
  { val: 200, label: "200" },
  { val: 250, label: "250" },
  { val: 300, label: "300" },
  { val: 400, label: "400" },
  { val: 500, label: "500" },
];

function valToAngle(val: number) {
  return START_ANGLE + (val / MAX_VAL) * SWEEP;
}

function valToCSSAngle(val: number) {
  return valToAngle(val) - 90;
}

function polar(angleDeg: number, r = R) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number, r = R) {
  const s = polar(startAngle, r);
  const e = polar(endAngle, r);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/** Arc path for the progress mask — always at least 1° to avoid degenerate paths. */
function progressMaskPath(val: number) {
  return arcPath(START_ANGLE, Math.max(START_ANGLE + 1, valToAngle(val)));
}

type Props = { className?: string };

export function GaugeAnimationV2({ className }: Props) {
  const needleRef = useRef<SVGGElement>(null);
  const maskPathRef = useRef<SVGPathElement>(null);
  // On a fresh page load (refresh / first visit) sessionStorage has no flag yet
  // → start the counter at 0 and animate up. On in-session SPA navigation the
  // flag is already set → start at the stored value so there's no jump.
  const [displayVal, setDisplayVal] = useState(() => {
    if (typeof window === "undefined") return 0;
    const inSession = sessionStorage.getItem("gauge-v2-session") === "1";
    return inSession
      ? Math.round(parseFloat(localStorage.getItem("gauge-v2") ?? "0"))
      : 0;
  });

  useLayoutEffect(() => {
    const lastVal = parseFloat(localStorage.getItem("gauge-v2") ?? "0");

    // Distinguish refresh (no session flag) from in-session navigation.
    const inSession = sessionStorage.getItem("gauge-v2-session") === "1";
    sessionStorage.setItem("gauge-v2-session", "1");

    let startVal: number;
    let targetVal: number;

    if (!inSession) {
      // Refresh / first visit: sweep from 0 → stored value (visually satisfying
      // cold-start). No new random target; localStorage already holds the right value.
      startVal = 0;
      targetVal = lastVal;
    } else {
      // In-session navigation: snap to where we left off, then animate to a new
      // random target so the gauge keeps moving on every page visit.
      startVal = lastVal;
      const mid = MAX_VAL / 2;
      const goUp =
        lastVal < mid ? true : lastVal > mid ? false : Math.random() < 0.5;
      const delta = 60 + Math.random() * 150;
      targetVal = Math.max(
        0,
        Math.min(MAX_VAL, lastVal + (goUp ? delta : -delta)),
      );
    }

    // Snap all visuals to startVal before first paint (no-op flicker on refresh
    // because startVal === 0 which is the SVG's natural rest position).
    if (needleRef.current) {
      needleRef.current.style.transform = `rotate(${valToCSSAngle(startVal)}deg)`;
    }
    if (maskPathRef.current) {
      maskPathRef.current.setAttribute("d", progressMaskPath(startVal));
    }

    // NOTE: localStorage is written only when the animation fully completes.
    // This prevents React StrictMode's double-fire from reading a targetVal
    // written by the first run. If the effect is cleaned up early (navigation
    // away or StrictMode), the write never happens and the next mount re-reads
    // the same correct lastVal.

    const DELAY = 800;
    const DURATION = 1500;
    const EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

    // Needle via WAAPI
    const animation = needleRef.current?.animate(
      [
        { transform: `rotate(${valToCSSAngle(startVal)}deg)` },
        { transform: `rotate(${valToCSSAngle(targetVal)}deg)` },
      ],
      { duration: DURATION, delay: DELAY, easing: EASING, fill: "forwards" },
    );

    // Mask + counter via rAF — springEase mirrors the same cubic-bezier
    let raf: number;
    const start = performance.now() + DELAY;

    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min((now - start) / DURATION, 1);
      const currentVal = startVal + (targetVal - startVal) * springEase(t);

      if (maskPathRef.current) {
        maskPathRef.current.setAttribute("d", progressMaskPath(currentVal));
      }
      const easedCounter = 1 - Math.pow(1 - t, 3);
      setDisplayVal(
        Math.round(startVal + (targetVal - startVal) * easedCounter),
      );
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // On in-session navigation write the new target. On refresh targetVal
        // equals lastVal so the stored value is already correct — skip the write.
        if (inSession) {
          localStorage.setItem("gauge-v2", String(targetVal));
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      animation?.cancel();
    };
  }, []);

  const trackPath = arcPath(START_ANGLE, END_ANGLE);
  const trackStart = polar(START_ANGLE);
  const trackEnd = polar(END_ANGLE % 360);

  return (
    <svg
      viewBox="0 0 500 430"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <style>{`
          .gv2-track  { stroke: #000; stroke-opacity: .1; }
          .gv2-label  { fill: #000; fill-opacity: .55; }
          .gv2-needle { fill: url(#gv2-needle-light); }
          :is(.dark *) .gv2-track  { stroke: #fff; stroke-opacity: .1; }
          :is(.dark *) .gv2-label  { fill: #fff; fill-opacity: .55; }
          :is(.dark *) .gv2-needle { fill: url(#gv2-needle-dark); }
        `}</style>
        {/*
          Dynamic progress mask — path d updated each frame so the rounded cap
          (strokeLinecap="round") always sits exactly at the progress tip.
        */}
        <mask id="gv2-ring-mask" maskUnits="userSpaceOnUse">
          <path
            ref={maskPathRef}
            fill="none"
            stroke="white"
            strokeWidth="32"
            strokeLinecap="round"
          />
        </mask>
        {/* Light-mode needle: dark, tapers to transparent at base */}
        <linearGradient id="gv2-needle-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="50%" stopColor="#333333" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
        {/* Dark-mode needle: white, tapers to transparent at base */}
        <linearGradient id="gv2-needle-dark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#cccccc" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      {/* Background track — muted ring */}
      <path
        d={trackPath}
        className="gv2-track"
        fill="none"
        strokeWidth="32"
        strokeLinecap="round"
      />
      {/* Start cap: always green at AQI 0 */}
      <circle cx={trackStart.x} cy={trackStart.y} r={16} fill="#00e400" />
      {/* End cap: dark red, only visible when value reaches AQI 500 */}
      {displayVal >= MAX_VAL && (
        <circle cx={trackEnd.x} cy={trackEnd.y} r={16} fill="#7e0023" />
      )}

      {/* Progress arc — full-brightness gradient clipped to current value */}
      <foreignObject
        x="0"
        y="0"
        width="500"
        height="430"
        mask="url(#gv2-ring-mask)"
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: FULL_ARC_GRADIENT,
          }}
        />
      </foreignObject>

      {/* Tick labels */}
      {TICKS.map(({ val, label }) => {
        const lp = polar(valToAngle(val), R - 52);
        return (
          <text
            key={val}
            x={lp.x}
            y={lp.y}
            className="gv2-label"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={15}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {/* Needle — driven by WAAPI */}
      <g ref={needleRef} style={{ transformOrigin: `${CX}px ${CY}px` }}>
        <path
          className="gv2-needle"
          d={`M ${CX - 16},${CY - 8} L ${CX + R - 38},${CY - 3} A 3 3 0 0 1 ${CX + R - 38},${CY + 3} L ${CX - 16},${CY + 8} Z`}
        />
      </g>

      {/* Value */}
      <text
        x={CX}
        y={CY + 90}
        className="gv2-label"
        textAnchor="middle"
        fontSize={48}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        suppressHydrationWarning
      >
        {displayVal}
      </text>
      <text
        x={CX}
        y={CY + 122}
        className="gv2-label"
        textAnchor="middle"
        fontSize={20}
        letterSpacing="3"
        fontFamily="system-ui, sans-serif"
      >
        AQI
      </text>
    </svg>
  );
}
