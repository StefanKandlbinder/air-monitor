"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

// ---------------------------------------------------------------------------
// Constants — identical coordinate system to GaugeAnimationV2 (viewBox 500×430)
// ---------------------------------------------------------------------------

const CX = 250;
const CY = 200;
const R  = 175;
const START_ANGLE = 225;
const SWEEP       = 270;
const END_ANGLE   = START_ANGLE + SWEEP; // 495 → 135° mod 360
const MAX_VAL     = 500;
const W           = 500;
const H           = 430;

// ---------------------------------------------------------------------------
// AQI color stops
// ---------------------------------------------------------------------------

const AQI_STOPS: Array<{ deg: number; rgb: [number, number, number] }> = [
  { deg: 0,   rgb: [0,   228,  0]   }, // AQI 0
  { deg: 27,  rgb: [255, 255,  0]   }, // AQI 50
  { deg: 54,  rgb: [255, 126,  0]   }, // AQI 100
  { deg: 81,  rgb: [255, 0,    0]   }, // AQI 150
  { deg: 108, rgb: [143, 63,   151] }, // AQI 200
  { deg: 162, rgb: [126, 0,    35]  }, // AQI 300
  { deg: 270, rgb: [126, 0,    35]  }, // AQI 500
];

// One color zone per AQI band
const SEGMENTS = (() => {
  const bounds = [0, 50, 100, 150, 200, 300, 500];
  return bounds.slice(0, -1).map((aqiStart, i) => ({
    aqiStart,
    aqiEnd: bounds[i + 1],
    rgb0:   AQI_STOPS[i].rgb,
    rgb1:   AQI_STOPS[i + 1].rgb,
  }));
})();

const TICKS = [
  { val: 0,   label: "0"   },
  { val: 50,  label: "50"  },
  { val: 100, label: "100" },
  { val: 150, label: "150" },
  { val: 200, label: "200" },
  { val: 250, label: "250" },
  { val: 300, label: "300" },
  { val: 400, label: "400" },
  { val: 500, label: "500" },
];

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function valToAngle(val: number): number {
  return START_ANGLE + (val / MAX_VAL) * SWEEP;
}

/** Convert gauge-system degrees (0° = top, CW) → canvas radians (0° = right, CW). */
function toRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

function polar(angleDeg: number, r = R): { x: number; y: number } {
  const rad = toRad(angleDeg);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Interpolate RGB at an AQI value. */
function valToColorRgb(val: number): [number, number, number] {
  const deg = (val / MAX_VAL) * SWEEP;
  let lo = AQI_STOPS[0], hi = AQI_STOPS[AQI_STOPS.length - 1];
  for (let i = 0; i < AQI_STOPS.length - 1; i++) {
    if (deg <= AQI_STOPS[i + 1].deg) { lo = AQI_STOPS[i]; hi = AQI_STOPS[i + 1]; break; }
  }
  const f = hi.deg > lo.deg ? (deg - lo.deg) / (hi.deg - lo.deg) : 0;
  return [
    Math.round(lo.rgb[0] + f * (hi.rgb[0] - lo.rgb[0])),
    Math.round(lo.rgb[1] + f * (hi.rgb[1] - lo.rgb[1])),
    Math.round(lo.rgb[2] + f * (hi.rgb[2] - lo.rgb[2])),
  ];
}

// ---------------------------------------------------------------------------
// Spring easing — cubic-bezier(0.34, 1.56, 0.64, 1) via Newton's method
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Canvas draw — all coordinates in logical 500×430 space
// ---------------------------------------------------------------------------

function drawGauge(ctx: CanvasRenderingContext2D, val: number, isDark: boolean): void {

  ctx.clearRect(0, 0, W, H);

  const startRad = toRad(START_ANGLE);
  const endRad   = toRad(END_ANGLE);  // toRad(495) = toRad(135) mod 360 equivalent

  // 1. Background track
  ctx.beginPath();
  ctx.arc(CX, CY, R, startRad, endRad, false);
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  ctx.lineWidth   = 32;
  ctx.lineCap     = "round";
  ctx.stroke();

  // 2. Start cap — always green at AQI 0
  const sp = polar(START_ANGLE);
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#00e400";
  ctx.fill();

  // 3. Tip circle — drawn before segments so arc paints over inner half
  if (val > 0) {
    const tipPt   = polar(valToAngle(val));
    const [r, g, b] = valToColorRgb(val);
    ctx.beginPath();
    ctx.arc(tipPt.x, tipPt.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill();
  }

  // 4. Colored arc segments revealed up to `val`
  for (const seg of SEGMENTS) {
    if (val <= seg.aqiStart) continue;

    const segEndVal   = Math.min(val, seg.aqiEnd);
    const segStartRad = toRad(valToAngle(seg.aqiStart));
    const segEndRad   = toRad(valToAngle(segEndVal));
    const startPt     = polar(valToAngle(seg.aqiStart));
    const endPt       = polar(valToAngle(segEndVal));

    // Interpolate end color for partial segments
    const t = (segEndVal - seg.aqiStart) / (seg.aqiEnd - seg.aqiStart);
    const endRgb: [number, number, number] = [
      Math.round(seg.rgb0[0] + t * (seg.rgb1[0] - seg.rgb0[0])),
      Math.round(seg.rgb0[1] + t * (seg.rgb1[1] - seg.rgb0[1])),
      Math.round(seg.rgb0[2] + t * (seg.rgb1[2] - seg.rgb0[2])),
    ];

    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    let strokeStyle: string | CanvasGradient;
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      strokeStyle = `rgb(${seg.rgb0.join(",")})`;
    } else {
      const grad = ctx.createLinearGradient(startPt.x, startPt.y, endPt.x, endPt.y);
      grad.addColorStop(0, `rgb(${seg.rgb0.join(",")})`);
      grad.addColorStop(1, `rgb(${endRgb.join(",")})`);
      strokeStyle = grad;
    }

    ctx.beginPath();
    ctx.arc(CX, CY, R, segStartRad, segEndRad, false);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth   = 32;
    ctx.lineCap     = "butt";
    ctx.stroke();
  }

  // 5. End cap — only at AQI 500
  if (val >= MAX_VAL) {
    const ep = polar(END_ANGLE % 360);
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#7e0023";
    ctx.fill();
  }

  // 6. Tick labels
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = "15px ui-monospace, monospace";
  ctx.fillStyle    = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  for (const { val: tv, label } of TICKS) {
    const tp = polar(valToAngle(tv), R - 52);
    ctx.fillText(label, tp.x, tp.y);
  }

  // 7. Needle
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(toRad(valToAngle(val)));

  const ng = ctx.createLinearGradient(-16, 0, R - 38, 0);
  if (isDark) {
    ng.addColorStop(0,   "rgba(255,255,255,0)");
    ng.addColorStop(0.5, "rgba(204,204,204,0.6)");
    ng.addColorStop(1,   "rgba(255,255,255,1)");
  } else {
    ng.addColorStop(0,   "rgba(0,0,0,0)");
    ng.addColorStop(0.5, "rgba(51,51,51,0.5)");
    ng.addColorStop(1,   "rgba(17,17,17,1)");
  }
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.lineTo(R - 38, -3);
  ctx.arc(R - 38, 0, 3, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-16, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 8. Value counter + "AQI" label
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle    = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  ctx.font         = "bold 48px ui-monospace, monospace";
  ctx.fillText(String(Math.round(val)), CX, CY + 90);
  ctx.font      = "20px ui-monospace, monospace";
  ctx.fillText("AQI", CX, CY + 122);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = { className?: string };

export function GaugeAnimationCanvas({ className }: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const ctxRef        = useRef<CanvasRenderingContext2D | null>(null);
  const currentValRef = useRef<number>(0);
  const isDarkRef     = useRef<boolean>(false);
  const gaugeStorage  = useLocalStorage("gauge-v2", 0);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    isDarkRef.current = resolvedTheme === "dark";
    if (ctxRef.current) drawGauge(ctxRef.current, currentValRef.current, isDarkRef.current);
  }, [resolvedTheme]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    // Map logical 500×430 coordinate space onto the actual rendered size
    ctx.scale(dpr * rect.width / W, dpr * rect.height / H);

    // --- Same start/target logic as GaugeAnimationV2 ---
    const storedVal = gaugeStorage.get();
    const inSession = sessionStorage.getItem("gauge-v2-session") === "1";
    sessionStorage.setItem("gauge-v2-session", "1");

    let startVal: number;
    let targetVal: number;

    if (!inSession) {
      startVal  = 0;
      targetVal = gaugeStorage.has() ? storedVal : 50 + Math.random() * 300;
    } else {
      startVal = storedVal;
      const mid  = MAX_VAL / 2;
      const goUp = storedVal < mid ? true : storedVal > mid ? false : Math.random() < 0.5;
      const delta = 60 + Math.random() * 150;
      targetVal = Math.max(0, Math.min(MAX_VAL, storedVal + (goUp ? delta : -delta)));
    }

    // Draw initial frame before any animation
    currentValRef.current = startVal;
    drawGauge(ctx, startVal, isDarkRef.current);

    const DELAY    = 800;
    const DURATION = 1500;

    let raf: number;
    const animStart = performance.now() + DELAY;

    const tick = (now: number) => {
      if (now < animStart) { raf = requestAnimationFrame(tick); return; }
      const t   = Math.min((now - animStart) / DURATION, 1);
      const val = startVal + (targetVal - startVal) * springEase(t);

      currentValRef.current = val;
      drawGauge(ctx, val, isDarkRef.current);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        gaugeStorage.set(targetVal);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Logical canvas dimensions as HTML attributes give it the correct intrinsic aspect ratio.
    // CSS width from className; height: auto maintains the ratio.
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={className}
      style={{ display: "block", width: "100%", aspectRatio: `${W} / ${H}` }}
      aria-hidden
    />
  );
}
