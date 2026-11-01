import React from "react";

// Escudos vectoriales SVG: nombre y colores editables, sin imágenes externas.
const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
const initials = (name, max = 10) => String(name || "LNA").trim().slice(0, max).toUpperCase();

export default function ProdeCrest({ name, primary = "#7de83d", secondary = "#152b3a", type = "user", textColor = "#ffffff", size = 55, className = "" }) {
  const a = safeColor(primary, "#7de83d"), b = safeColor(secondary, "#152b3a"), t = safeColor(textColor, "#ffffff");
  const isLeague = type === "league";
  const id = React.useId().replace(/:/g, "");
  return <svg className={className} width={size} height={size} viewBox="0 0 96 110" aria-label={(isLeague ? "Trofeo de " : "Escudo de ") + (name || "Prode")} role="img">
    <defs>
      <linearGradient id={id + "face"} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={a}/><stop offset="1" stopColor={b}/>
      </linearGradient>
    </defs>
    {isLeague ? <>
      <path d="M31 14h34v29c0 18-10 27-17 27S31 61 31 43V14Z" fill={`url(#${id}face)`} stroke={a} strokeWidth="3"/>
      <path d="M30 22H15c-1 18 5 30 21 32M66 22h15c1 18-5 30-21 32" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/>
      <path d="M47 70v12M34 83h28M28 88h40" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/>
      <path d="m48 22 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z" fill="#ffffff" fillOpacity=".85"/>
      <rect x="7" y="91" width="82" height="17" rx="5" fill={b} stroke={a} strokeWidth="1.5"/>
      <text x="48" y="103" textAnchor="middle" fill={t} fontFamily="Impact, Russo One, Arial Black, sans-serif" fontStyle="italic" fontSize={name?.length > 14 ? "7" : "9"} fontWeight="800" letterSpacing=".2">{initials(name, 17)}</text>
    </> : <>
      <path d="M48 4 87 18v36c0 27-20 43-39 52C29 97 9 81 9 54V18L48 4Z" fill={`url(#${id}face)`} stroke={a} strokeWidth="4"/>
      <path d="M48 11 79 23v30c0 21-15 35-31 43-16-8-31-22-31-43V23L48 11Z" fill="none" stroke="#fff" strokeOpacity=".48" strokeWidth="1.8"/>
      <circle cx="48" cy="38" r="16" fill={b} stroke={a} strokeWidth="2"/>
      <path d="m34 38 8-8 13 3 5 11-11 10-14-7Z" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.5"/>
      <rect x="13" y="65" width="70" height="20" rx="5" fill={b} stroke={a} strokeWidth="1.5"/>
      <text x="48" y="78.5" textAnchor="middle" fill={t} fontFamily="Impact, Russo One, Arial Black, sans-serif" fontStyle="italic" fontSize={name?.length > 10 ? "8" : "10.5"} fontWeight="900">{initials(name, 13)}</text>
    </>}
  </svg>;
}
