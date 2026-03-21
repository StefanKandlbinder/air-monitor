"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

const CX = 250;
const CY = 200;
const R = 175;
const START_ANGLE = 225;
const SWEEP = 270;
const END_ANGLE = START_ANGLE + SWEEP;
const MAX_VAL = 500;

// AQI color stops mapped to degrees within the SWEEP (0 = AQI 0, 270 = AQI 500)
const AQI_STOPS: Array<{ deg: number; rgb: [number, number, number] }> = [
  { deg: 0,   rgb: [0, 228, 0] },      // AQI 0   – Good
  { deg: 27,  rgb: [255, 255, 0] },    // AQI 50  – Moderate
  { deg: 54,  rgb: [255, 126, 0] },    // AQI 100 – Unhealthy for Sensitive
  { deg: 81,  rgb: [255, 0, 0] },      // AQI 150 – Unhealthy
  { deg: 108, rgb: [143, 63, 151] },   // AQI 200 – Very Unhealthy
  { deg: 162, rgb: [126, 0, 35] },     // AQI 300 – Hazardous
  { deg: 270, rgb: [126, 0, 35] },     // AQI 500 – Hazardous (end)
];

/**
 * Evaluate CSS cubic-bezier(0.34, 1.56, 0.64, 1) in JS so needle and arc
 * are driven by exactly the same easing curve — frame-perfect sync.
 */
function springEase(x: number): number {
  const p1x = 0.34, p1y = 1.56, p2x = 0.64, p2y = 1.0;
  const bx  = (t: number) => 3*p1x*t*(1-t)*(1-t) + 3*p2x*t*t*(1-t) + t*t*t;
  const bxd = (t: number) => 3*p1x*((1-t)*(1-t) - 2*t*(1-t)) + 3*p2x*(2*t*(1-t) - t*t) + 3*t*t;
  const by  = (t: number) => 3*p1y*t*(1-t)*(1-t) + 3*p2y*t*t*(1-t) + t*t*t;
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
  { val: 0,   label: "0" },
  { val: 50,  label: "50" },
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


// Total arc length used for stroke-dasharray calculations.
const ARC_LEN = Math.PI * R * (SWEEP / 180); // ≈ 824.7 px

// One segment per AQI color zone. Each is drawn on the full arc path
// and revealed via stroke-dasharray (no mask, no foreignObject).
const SEGMENTS = (() => {
  const aqiBoundaries = [0, 50, 100, 150, 200, 300, 500];
  return aqiBoundaries.slice(0, -1).map((aqiStart, i) => {
    const aqiEnd  = aqiBoundaries[i + 1];
    const arcStart = ARC_LEN * aqiStart / MAX_VAL;
    const arcLen   = ARC_LEN * (aqiEnd - aqiStart) / MAX_VAL;
    // Gradient endpoints: chord from segment start to end on the arc
    const startPt = polar(valToAngle(aqiStart));
    const endPt   = polar(valToAngle(aqiEnd));
    return { aqiStart, aqiEnd, arcStart, arcLen, startPt, endPt,
      rgb0: AQI_STOPS[i].rgb, rgb1: AQI_STOPS[i + 1].rgb };
  });
})();

/** Interpolate RGB color at a given AQI value. */
function valToColor(val: number): string {
  const deg = (val / MAX_VAL) * SWEEP;
  let lo = AQI_STOPS[0], hi = AQI_STOPS[AQI_STOPS.length - 1];
  for (let i = 0; i < AQI_STOPS.length - 1; i++) {
    if (deg <= AQI_STOPS[i + 1].deg) { lo = AQI_STOPS[i]; hi = AQI_STOPS[i + 1]; break; }
  }
  const f = hi.deg > lo.deg ? (deg - lo.deg) / (hi.deg - lo.deg) : 0;
  return `rgb(${Math.round(lo.rgb[0] + f*(hi.rgb[0]-lo.rgb[0]))},${Math.round(lo.rgb[1] + f*(hi.rgb[1]-lo.rgb[1]))},${Math.round(lo.rgb[2] + f*(hi.rgb[2]-lo.rgb[2]))})`;
}

/** Update segment stroke-dasharray and tip fill color for a given arc value. */
function applyArcVal(val: number, segRefs: (SVGPathElement | null)[], tipEl: SVGCircleElement | null) {
  const arcPos = ARC_LEN * val / MAX_VAL;
  for (let i = 0; i < SEGMENTS.length; i++) {
    const el = segRefs[i];
    if (!el) continue;
    const { aqiStart, arcStart, arcLen } = SEGMENTS[i];
    if (val <= aqiStart) {
      el.style.strokeDasharray = "0 9999";
    } else {
      const drawn = Math.min(arcPos - arcStart, arcLen);
      // "0.01 gap dash bigGap" — invisible micro-dash, skip to segment start,
      // draw the visible portion, then infinite gap to suppress the repeat.
      // strokeLinecap="round" on each path produces the rounded cap at the
      // progress tip automatically — no separate circle needed.
      el.style.strokeDasharray = `0.01 ${arcStart} ${drawn} 9999`;
    }
  }
  if (tipEl) {
    tipEl.style.opacity = val > 0 ? "1" : "0";
    if (val > 0) tipEl.style.fill = valToColor(val);
  }
}

type Props = { className?: string };

export function GaugeAnimationV2({ className }: Props) {
  const needleRef   = useRef<SVGGElement>(null);
  const segmentRefs = useRef<(SVGPathElement | null)[]>([]);
  const tipRef      = useRef<SVGCircleElement>(null);
  const gaugeStorage = useLocalStorage("gauge-v2", 0);

  // On a fresh page load (refresh / first visit) sessionStorage has no flag yet
  // → start the counter at 0 and animate up. On in-session SPA navigation the
  // flag is already set → start at the stored value so there's no jump.
  const [displayVal, setDisplayVal] = useState(() => {
    if (typeof window === "undefined") return 0;
    const inSession = sessionStorage.getItem("gauge-v2-session") === "1";
    return inSession ? Math.round(gaugeStorage.get()) : 0;
  });

  useLayoutEffect(() => {
    const lastVal = gaugeStorage.get();

    // Distinguish refresh (no session flag) from in-session navigation.
    const inSession = sessionStorage.getItem("gauge-v2-session") === "1";
    sessionStorage.setItem("gauge-v2-session", "1");

    let startVal: number;
    let targetVal: number;

    if (!inSession) {
      // Refresh / first visit: sweep from 0 → stored value.
      // On the very first visit there is no stored value yet, so pick a random target.
      startVal = 0;
      targetVal = gaugeStorage.has() ? lastVal : 50 + Math.random() * 300;
    } else {
      // In-session navigation: snap to where we left off, then animate to a new
      // random target so the gauge keeps moving on every page visit.
      startVal = lastVal;
      const mid = MAX_VAL / 2;
      const goUp = lastVal < mid ? true : lastVal > mid ? false : Math.random() < 0.5;
      const delta = 60 + Math.random() * 150;
      targetVal = Math.max(0, Math.min(MAX_VAL, lastVal + (goUp ? delta : -delta)));
    }

    // Snap all visuals to startVal before first paint.
    if (needleRef.current) {
      needleRef.current.style.transform = `rotate(${valToCSSAngle(startVal)}deg)`;
    }
    if (tipRef.current) {
      tipRef.current.style.transform = `rotate(${valToCSSAngle(startVal)}deg)`;
    }
    applyArcVal(startVal, segmentRefs.current, tipRef.current);

    // NOTE: localStorage is written only when the animation fully completes.
    // This prevents React StrictMode's double-fire from reading a targetVal
    // written by the first run.

    const DELAY    = 800;
    const DURATION = 1500;
    const EASING   = "cubic-bezier(0.34, 1.56, 0.64, 1)";
    const wapiOpts = { duration: DURATION, delay: DELAY, easing: EASING, fill: "forwards" as const };
    const wapiKeys = [
      { transform: `rotate(${valToCSSAngle(startVal)}deg)` },
      { transform: `rotate(${valToCSSAngle(targetVal)}deg)` },
    ];

    // Needle + tip circle via WAAPI (same keyframes, compositor-driven)
    const animation    = needleRef.current?.animate(wapiKeys, wapiOpts);
    const tipAnimation = tipRef.current?.animate(wapiKeys, wapiOpts);

    // Arc segments + counter via rAF — springEase mirrors the WAAPI cubic-bezier
    // so needle, arc and counter stay frame-perfect in sync.
    let raf: number;
    const start = performance.now() + DELAY;

    const tick = (now: number) => {
      if (now < start) { raf = requestAnimationFrame(tick); return; }
      const t = Math.min((now - start) / DURATION, 1);
      const currentVal = startVal + (targetVal - startVal) * springEase(t);

      applyArcVal(currentVal, segmentRefs.current, tipRef.current);
      setDisplayVal(Math.round(currentVal));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        gaugeStorage.set(targetVal);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); animation?.cancel(); tipAnimation?.cancel(); };
  }, []);

  const trackPath  = arcPath(START_ANGLE, END_ANGLE);
  const trackStart = polar(START_ANGLE);
  const trackEnd   = polar(END_ANGLE % 360);

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

        {/* Per-segment gradients — chord from segment start to end on the arc */}
        {SEGMENTS.map((seg, i) => (
          <linearGradient
            key={i}
            id={`gv2-seg-${i}`}
            x1={seg.startPt.x} y1={seg.startPt.y}
            x2={seg.endPt.x}   y2={seg.endPt.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor={`rgb(${seg.rgb0.join(",")})`} />
            <stop offset="100%" stopColor={`rgb(${seg.rgb1.join(",")})`} />
          </linearGradient>
        ))}

        {/* Light-mode needle: dark, tapers to transparent at base */}
        <linearGradient id="gv2-needle-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
          <stop offset="50%"  stopColor="#333333" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
        {/* Dark-mode needle: white, tapers to transparent at base */}
        <linearGradient id="gv2-needle-dark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%"  stopColor="#cccccc" stopOpacity="0.6" />
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

      {/*
        Tip cap — placed here (before segments) so the arc paints over its inner
        half, leaving only the outer rounded hemisphere visible.
        Transform (rotation around gauge center) is driven by WAAPI alongside the
        needle; fill color is updated imperatively in rAF.
      */}
      <circle
        ref={tipRef}
        cx={CX + R}
        cy={CY}
        r={16}
        style={{ opacity: 0, transformOrigin: `${CX}px ${CY}px` }}
      />

      {/*
        Progress arc — one SVG path per color zone, revealed via stroke-dasharray.
        strokeLinecap="butt" keeps segment joints clean (the tip cap is a separate
        circle, not a linecap).
        stroke-dasharray format: "0.01 arcStart drawnLen 9999"
      */}
      {SEGMENTS.map((_seg, i) => (
        <path
          key={i}
          ref={el => { segmentRefs.current[i] = el; }}
          d={trackPath}
          fill="none"
          stroke={`url(#gv2-seg-${i})`}
          strokeWidth="32"
          strokeLinecap="butt"
          style={{ strokeDasharray: "0 9999" }}
        />
      ))}

      {/* End cap: dark red, only visible when value reaches AQI 500 */}
      {displayVal >= MAX_VAL && (
        <circle cx={trackEnd.x} cy={trackEnd.y} r={16} fill="#7e0023" />
      )}

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
            fontFamily="ui-monospace, monospace"
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
        fontFamily="ui-monospace, monospace"
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
        fontFamily="ui-monospace, monospace"
      >
        AQI
      </text>
    </svg>
  );
}
