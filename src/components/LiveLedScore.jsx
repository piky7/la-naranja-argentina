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
function Digit({ value, x, color }) {
  const enabled = SEGMENTS[value] || "";
  return <g transform={`translate(${x} 5) scale(.92 1)`}>
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
      <rect x="0.5" y="1" width="149" height="38" rx="7" fill="#070e18" stroke="#546073" strokeOpacity=".55"/>
      <rect x="2" y="2.5" width="146" height="35" rx="6" fill="url(#lna-led-dots)"/>
      <NumberDisplay score={h} end="home" color={h > a ? "#ff8b1b" : "#f4f7ff"}/>
      <path d="M73 20h7" stroke="#dde6ed" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  </strong>;
}
