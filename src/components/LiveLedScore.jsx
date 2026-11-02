import React from "react";

// Marcador de siete segmentos dibujado en SVG: no depende de fuentes ni desborda las columnas.
const SEGMENTS = {
  0: "abcedf", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc",
  5: "afgcd", 6: "afgecd", 7: "abc", 8: "abcdefg", 9: "abfgcd",
};
const PATHS = {
  a: "M3 1H13L11 3H5Z",
  b: "M14 2L15.5 4V13L13.5 15L12.5 13V5Z",
  c: "M14 16L15.5 18V27L13 29L12.5 26V18Z",
  d: "M5 28H11L13 30H3Z",
  e: "M2 16L4 18V26L1.5 29L.5 27V18Z",
  f: "M2 2L4 5V13L2 15L.5 13V4Z",
  g: "M4 14H12L14 15.5L12 17H4L2 15.5Z",
};
const SEGMENT_NAMES = Object.keys(PATHS);
function Digit({ value, x, color, y = 4, scaleX = 1.03, scaleY = 1.08 }) {
  const enabled = SEGMENTS[value] || "";
  return <g transform={`translate(${x} ${y}) scale(${scaleX} ${scaleY})`}>
    {SEGMENT_NAMES.map(segment =>
      <path key={segment} d={PATHS[segment]} fill={enabled.includes(segment) ? color : "#23303c"}
        opacity={enabled.includes(segment) ? 1 : .26} />
    )}
  </g>;
}
function NumberDisplay({ score, end, color }) {
  const value = String(Math.max(0, Math.trunc(Number(score) || 0))).slice(-3);
  const positions = end === "home"
    ? (value.length === 3 ? [9, 27, 45] : value.length === 2 ? [27, 45] : [45])
    : (value.length === 3 ? [89, 107, 125] : value.length === 2 ? [89, 107] : [89]);
  return <g>{Array.from(value).map((digit, i) =>
    <Digit key={i} value={digit} x={positions[i]} color={color}/>
  )}</g>;
}
export default function LiveLedScore({ home, away }) {
  const h = Number(home) || 0;
  const a = Number(away) || 0;
  return <strong className="fixture-live-score fixture-led-score" aria-label={`Resultado en vivo: ${h} a ${a}`}>
    <svg viewBox="0 0 150 40" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
      <defs>
        <pattern id="lna-led-dots" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".45" fill="#536071" opacity=".27"/>
        </pattern>
      </defs>
      <rect x="0.5" y="1" width="149" height="38" rx="7" fill="#070e18" stroke="#465363" strokeOpacity=".28"/>
      <rect x="2" y="2.5" width="146" height="35" rx="6" fill="url(#lna-led-dots)"/>
      <NumberDisplay score={h} end="home" color={h > a ? "#ff8b1b" : "#f4f7ff"}/>
      <NumberDisplay score={a} end="away" color={a > h ? "#ff8b1b" : "#f4f7ff"}/>
      <path d="M73 20h7" stroke="#dde6ed" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  </strong>;
}


// Segundo visor compacto, debajo del resultado: 4º 05:53 en una sola línea.
// Mismas piezas LED, pero escaladas para no aumentar el alto de la tarjeta.
export function LiveLedPeriod({ quarter, time, isHalftime = false }) {
  const q = String(quarter ?? "").match(/\d+/)?.[0] ?? "";
  const match = typeof time === "string" ? time.match(/^(\d{1,2}):(\d{2})$/) : null;
  const digits = match ? (match[1].padStart(2, "0") + match[2]) : null;
  const showClock = !isHalftime && Boolean(q) && Boolean(digits);
  const label = isHalftime ? "ENTRETIEMPO" : q ? `${q}º${digits ? " " + digits.slice(0, 2) + ":" + digits.slice(2) : ""}` : "EN JUEGO";
  return <small className="fixture-live-period fixture-live-led-period" aria-label={label}>
    <svg viewBox="0 0 150 34" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect x="0.5" y="0.5" width="149" height="33" rx="7" fill="#070e18" stroke="#536273" strokeOpacity=".4"/>
      {showClock ? <>
        <Digit value={q.slice(-1)} x={20} y={4} scaleX={.78} scaleY={.79} color="#f2f6fc"/>
        <text x="37" y="15" fill="#f2f6fc" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="800">º</text>
        {[54, 72, 98, 116].map((x,i) =>
          <Digit key={i} value={digits[i]} x={x} y={4} scaleX={.8} scaleY={.79} color="#ff9c30"/>
        )}
        <circle cx="92" cy="14" r="1.5" fill="#ff9c30"/>
        <circle cx="92" cy="22" r="1.5" fill="#ff9c30"/>
      </> : <text x="75" y="22" fill={isHalftime ? "#f1f5f9" : "#ffad59"}
          textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="800" letterSpacing=".6">
          {isHalftime ? "ENTRETIEMPO" : q ? q + "º" : "EN JUEGO"}
        </text>}
    </svg>
  </small>;
}
