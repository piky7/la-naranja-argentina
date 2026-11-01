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
      <radialGradient id={id + "shine"} cx="27%" cy="21%" r="75%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".34"/>
        <stop offset="50%" stopColor="#ffffff" stopOpacity=".08"/>
        <stop offset="100%" stopColor="#000000" stopOpacity=".22"/>
      </radialGradient>
      <clipPath id={id + "ballClip"}><circle cx="48" cy="44" r="36"/></clipPath>
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
      {/* Pelota deportiva personalizada, con paneles y brillo vectorial. */}
      <circle cx="48" cy="44" r="39" fill={b} opacity=".65"/>
      <circle cx="48" cy="44" r="36" fill={`url(#${id}face)`} stroke={b} strokeWidth="3"/>
      <g clipPath={`url(#${id}ballClip)`} fill="none" stroke={b} strokeWidth="3.8" strokeLinecap="round">
        <path d="M12 44h72"/>
        <path d="M48 8v72"/>
        <path d="M14 24c23 0 43 8 68 40"/>
        <path d="M82 24C59 24 39 32 14 64"/>
        <path d="M25 12c20 17 22 44 2 64"/>
        <path d="M71 12C51 29 49 56 69 76"/>
      </g>
      <circle cx="48" cy="44" r="36" fill={`url(#${id}shine)`}/>
      <circle cx="48" cy="44" r="36" fill="none" stroke={a} strokeWidth="2.4"/>
      <path d="M22 21c10-9 18-11 27-10" fill="none" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.8" strokeLinecap="round"/>
      {/* Placa flotante con la tipografía deportiva y el color de texto elegido. */}
      <path d="M8 77h80l-4 21H12Z" fill={b} stroke={a} strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M13 80h70" stroke={a} strokeOpacity=".55" strokeWidth="1.1"/>
      <text x="48" y="92" textAnchor="middle" fill={t}
        fontFamily="Impact, Russo One, Arial Black, sans-serif" fontStyle="italic"
        fontSize={fontSize} fontWeight="900" letterSpacing=".15">{label}</text>
    </>}
  </svg>;
}
