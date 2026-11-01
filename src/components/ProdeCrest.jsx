import React from "react";

// Identidades vectoriales de Prode LNA: copa para ligas y pelota de básquet para usuarios.
// Los diseños se dibujan a partir del nombre y de los colores guardados; no hay imagen fija.
const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
const displayName = (name, max = 19) => String(name || "PRODE").trim().slice(0, max).toUpperCase();

export default function ProdeCrest({ name, primary = "#7de83d", secondary = "#152b3a", type = "user", textColor = "#ffffff", size = 55, className = "" }) {
  const a = safeColor(primary, "#7de83d");
  const b = safeColor(secondary, "#152b3a");
  const t = safeColor(textColor, "#ffffff");
  const isLeague = type === "league";
  const id = React.useId().replace(/:/g, "");
  const label = displayName(name, isLeague ? 24 : 20);
  const fontSize = isLeague
    ? label.length > 19 ? 5.5 : label.length > 14 ? 7 : 9
    : label.length > 16 ? 6 : label.length > 12 ? 7 : label.length > 9 ? 8 : 10;

  return <svg className={className} width={size} height={size} viewBox="0 0 96 110"
    aria-label={(isLeague ? "Trofeo de " : "Pelota personalizada de ") + (name || "Prode")} role="img">
    <defs>
      <linearGradient id={id + "face"} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={a}/>
        <stop offset="52%" stopColor={a}/>
        <stop offset="100%" stopColor={b}/>
      </linearGradient>
      <radialGradient id={id + "shine"} cx="25%" cy="19%" r="82%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".42"/>
        <stop offset="40%" stopColor="#ffffff" stopOpacity=".13"/>
        <stop offset="72%" stopColor="#07121e" stopOpacity=".06"/>
        <stop offset="100%" stopColor="#050d19" stopOpacity=".48"/>
      </radialGradient>
      <clipPath id={id + "premiumClip"}><circle cx="48" cy="40" r="30.5"/></clipPath>
    </defs>
    {isLeague ? <>
      <path d="M31 14h34v29c0 18-10 27-17 27S31 61 31 43V14Z" fill={`url(#${id}face)`} stroke={a} strokeWidth="3"/>
      <path d="M30 22H15c-1 18 5 30 21 32M66 22h15c1 18-5 30-21 32" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/>
      <path d="M47 70v12M34 83h28M28 88h40" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/>
      <path d="m48 22 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z" fill="#ffffff" fillOpacity=".85"/>
      <rect x="7" y="91" width="82" height="17" rx="5" fill={b} stroke={a} strokeWidth="1.5"/>
      <text x="48" y="103" textAnchor="middle" fill={t}
        fontFamily="Impact, Russo One, Arial Black, sans-serif" fontStyle="italic"
        fontSize={fontSize} fontWeight="900" letterSpacing=".1">{label}</text>
    </> : <>
      {/* Player Badge LNA: insignia premium enteramente vectorial y personalizable. */}
      <ellipse cx="48" cy="101" rx="30" ry="5" fill={a} opacity=".20"/>
      {/* Dos aletas compactas, sin puntas superpuestas en tamaño pequeño. */}
      <path d="M19 53 7 51l7 14 15-1 7-9Z M77 53l12-2-7 14-15-1-7-9Z" fill={b} stroke={a} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="m13 56 13 4 M83 56l-13 4" fill="none" stroke={a} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="48" cy="40" r="37" fill={b} stroke={a} strokeWidth="2.6"/>
      <circle cx="48" cy="40" r="34" fill="#071522" stroke="#ffffff" strokeOpacity=".65" strokeWidth="2"/>
      <circle cx="48" cy="40" r="30.5" fill={`url(#${id}face)`}/>
      <g clipPath={`url(#${id}premiumClip)`} fill="none" stroke={b} strokeWidth="3.6" strokeLinecap="round">
        <path d="M17 40h62"/>
        <path d="M48 9v62"/>
        <path d="M23 14c24 16 26 36 6 53"/>
        <path d="M73 14C49 30 47 50 67 67"/>
        <path d="M21 23c14 0 22 6 27 17s13 17 27 17"/>
        <path d="M75 23c-14 0-22 6-27 17S35 57 21 57"/>
      </g>
      <circle cx="48" cy="40" r="30.5" fill={`url(#${id}shine)`}/>
      <circle cx="48" cy="40" r="30.5" fill="none" stroke="#ffffff" strokeOpacity=".24" strokeWidth="1.2"/>
      <path d="M24 25c6-9 14-13 22-14" fill="none" stroke="#ffffff" strokeOpacity=".58" strokeWidth="2.8" strokeLinecap="round"/>
      {/* Cinta deportiva envolvente; conserva el color de texto elegido. */}
      <path d="M11 79 20 76l5 7-5 13-10-3 3-7Z M85 79l-9-3-5 7 5 13 10-3-3-7Z" fill={a} stroke={b} strokeWidth="1.4"/>
      <path d="M15 77h66l4 10-7 13H18l-7-13Z" fill={b} stroke={a} strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M19 80h58" stroke="#ffffff" strokeOpacity=".23" strokeWidth="1"/>
      <text x="48" y="92" textAnchor="middle" fill={t}
        fontFamily="Russo One,Impact,Arial Black,sans-serif" fontStyle="italic"
        fontSize={fontSize} fontWeight="900" letterSpacing=".1">{label}</text>
    </>}
  </svg>;
}
