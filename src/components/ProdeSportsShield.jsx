import React from "react";
import { parseSportsDesign } from "./sportsCrestDesign";

// Escudo deportivo sin símbolos; el mismo SVG se adapta automáticamente
// a perfiles, podios y clasificaciones pequeñas.
const paths = {
  classic: "M14 8 H82 V63 Q79 91 48 104 Q17 91 14 63 Z",
  pointed: "M11 8 H85 V64 L48 105 L11 64 Z",
  rounded: "M12 8 H84 V63 Q82 96 48 104 Q14 96 12 63 Z",
  flat: "M12 8 H84 V82 L48 103 L12 82 Z",
  wide: "M6 13 H90 L85 68 Q76 94 48 104 Q20 94 11 68 Z",
};
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;

export default function ProdeSportsShield({
  name, primary, secondary, textColor, font = "sport", symbol, size = 55, className = "",
}) {
  const d = parseSportsDesign(symbol);
  const a = color(primary, "#153a85"), b = color(secondary, "#ffffff");
  const t = color(textColor, "#ffffff");
  const path = paths[d.shape] || paths.classic;
  const id = React.useId().replace(/:/g, "");
  const label = String(d.label || name || "PRODE").trim().toUpperCase().slice(0, 20);
  const family = font === "college" ? "Impact,Arial Black,sans-serif"
    : font === "gamer" ? "Orbitron,Arial Black,sans-serif" : "Russo One,Impact,Arial Black,sans-serif";
  const labelWidth = Math.max(0, label.length);
  const fontSize = labelWidth > 16 ? 6 : labelWidth > 12 ? 7.3 : labelWidth > 9 ? 8.5 : 11;
  const bandY = d.placement === "bottom" ? 72 : d.placement === "middle" ? 43 : 17;
  const showLabel = d.placement !== "none";
  return <svg className={className} width={size} height={Math.round(size * 1.15)} viewBox="0 0 96 110" role="img"
    aria-label={"Escudo deportivo de " + (name || "Prode")}>
    <defs>
      <clipPath id={id+"clip"}><path d={path}/></clipPath>
      <linearGradient id={id+"shadow"} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity=".12"/>
        <stop offset=".6" stopColor="#ffffff" stopOpacity="0"/>
        <stop offset="1" stopColor="#050d19" stopOpacity=".2"/>
      </linearGradient>
    </defs>
    <g clipPath={"url(#"+id+"clip)"}>
      <rect width="96" height="110" fill={a}/>
      {d.pattern === "vertical" && [18,42,66].map(x=><rect key={x} x={x} y="0" width="12" height="110" fill={b}/>)}
      {d.pattern === "thin" && Array.from({length:9},(_,i)=><rect key={i} x={i*12} y="0" width="5" height="110" fill={b}/>)}
      {d.pattern === "diagonal" && <path d="M-14 88 61 -12 94 -12 18 111 Z" fill={b}/>}
      {d.pattern === "horizontal" && <rect x="0" y="43" width="96" height="22" fill={b}/>}
      {d.pattern === "double" && <><rect x="0" y="33" width="96" height="15" fill={b}/><rect x="0" y="68" width="96" height="15" fill={b}/></>}
      {d.pattern === "half" && <rect x="0" y="55" width="96" height="55" fill={b}/>}
      {d.pattern === "quarters" && <><rect x="48" y="0" width="48" height="55" fill={b}/><rect x="0" y="55" width="48" height="55" fill={b}/></>}
      <rect width="96" height="110" fill={"url(#"+id+"shadow)"}/>
    </g>
    <path d={path} fill="none" stroke="#071321" strokeWidth="6" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke={d.border === "simple" ? b : "#ffffff"}
      strokeWidth={d.border === "thick" ? 5 : 2.6} strokeLinejoin="round"/>
    {d.border === "double" && <path d={path} transform="translate(48 55) scale(.88) translate(-48 -55)"
      fill="none" stroke={b} strokeWidth="1.8" strokeLinejoin="round"/>}
    {showLabel && <>
      <rect x="13" y={bandY} width="70" height="18" rx="2" fill={a} stroke={b} strokeWidth="1.3"/>
      <text x="48" y={bandY+12.5} textAnchor="middle" fill={t} fontFamily={family}
        fontWeight="900" fontSize={fontSize} textLength={label.length > 12 ? 62 : undefined}
        lengthAdjust={label.length > 12 ? "spacingAndGlyphs" : undefined}>{label}</text>
    </>}
  </svg>;
}
