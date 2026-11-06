import React from "react";
import ProdeSportsShield from "./ProdeSportsShield";

// La copa de cada liga conserva su identidad anterior. Los usuarios ahora
// diseñan un escudo deportivo sin iconos ni placas con símbolos.
const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;

export default function ProdeCrest({ name, primary = "#7de83d", secondary = "#152b3a", type = "user", textColor = "#ffffff", style = "pro", symbol, font = "sport", size = 55, className = "" }) {
  if (type !== "league") return <ProdeSportsShield name={name} primary={primary} secondary={secondary} textColor={textColor} font={font} symbol={symbol} size={size} className={className}/>;
  const a = safeColor(primary, "#7de83d");
  const b = safeColor(secondary, "#152b3a");
  const t = safeColor(textColor, "#ffffff");
  const id = React.useId().replace(/:/g, "");
  const label = String(name || "PRODE").trim().slice(0,24).toUpperCase();
  const fontSize = label.length > 19 ? 6.5 : label.length > 14 ? 7.5 : label.length > 10 ? 8.5 : 9;
  const estimated = [...label].reduce((sum, c) => sum + (c === " " ? .33 : /[MW]/.test(c) ? .92 : /[IJ1]/.test(c) ? .42 : .67)*fontSize, 0);
  const fitLeagueText = estimated > 55;
  return <svg className={className} width={size} height={size} viewBox="0 0 96 110"
    aria-label={"Trofeo de " + (name || "Prode")} role="img">
    <defs>
      <linearGradient id={id + "gold"} x1="0" y1="0" x2="1" y2=".25">
        <stop offset="0%" stopColor="#a76412"/>
        <stop offset="19%" stopColor="#ffda6b"/>
        <stop offset="41%" stopColor="#fff3ad"/>
        <stop offset="63%" stopColor="#e7a82d"/>
        <stop offset="83%" stopColor="#f8cd59"/>
        <stop offset="100%" stopColor="#966015"/>
      </linearGradient>
      <linearGradient id={id + "goldDark"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff0a0"/>
        <stop offset="50%" stopColor="#d78a19"/>
        <stop offset="100%" stopColor="#794612"/>
      </linearGradient>
      <linearGradient id={id + "ribbon"} x1="0" y1="0" x2="1" y2=".3">
        <stop offset="0%" stopColor={b}/>
        <stop offset="52%" stopColor={b}/>
        <stop offset="100%" stopColor={a}/>
      </linearGradient>
    </defs>
      {/* Copa profesional con volumen metálico, estrella y laureles.
          Los colores elegidos se usan en la cinta, borde y detalles. */}
      <ellipse cx="48" cy="103" rx="35" ry="4" fill={a} opacity=".17"/>
      {/* Laureles laterales: pocos trazos para mantener detalle en 55px. */}
      <g fill={`url(#${id}goldDark)`} stroke="#e7ac35" strokeWidth=".55">
        <path d="M24 76Q11 65 13 45" fill="none" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M72 76Q85 65 83 45" fill="none" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M14 49q-9-2-7-11 9 3 7 11Z"/>
        <path d="M14 57q-9 0-10-9 10 1 10 9Z"/>
        <path d="M17 65q-9 1-12-7 10 0 12 7Z"/>
        <path d="M22 72q-10 3-14-4 10-2 14 4Z"/>
        <path d="M82 49q9-2 7-11-9 3-7 11Z"/>
        <path d="M82 57q9 0 10-9-10 1-10 9Z"/>
        <path d="M79 65q9 1 12-7-10 0-12 7Z"/>
        <path d="M74 72q10 3 14-4-10-2-14 4Z"/>
      </g>
      {/* Asas simétricas y contorno de copa. */}
      <path d="M31 16H16Q12 16 12 22Q12 39 30 45 M65 16h15q4 0 4 6 0 17-18 23"
        fill="none" stroke="#8a5110" strokeWidth="6" strokeLinecap="round"/>
      <path d="M31 16H16Q12 16 12 22Q12 39 30 45 M65 16h15q4 0 4 6 0 17-18 23"
        fill="none" stroke={`url(#${id}gold)`} strokeWidth="3.7" strokeLinecap="round"/>
      <path d="M28 12Q48 8 68 12L65 44Q63 60 48 66Q33 60 31 44Z"
        fill={`url(#${id}gold)`} stroke="#a86919" strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M34 17q15-3 29-1l-3 26q-2 13-12 17Q38 54 37 42Z"
        fill="#fff3ac" opacity=".17"/>
      <path d="M29 12Q48 8 67 12" fill="none" stroke="#fff5b4" strokeWidth="3.4" strokeLinecap="round"/>
      {/* Estrella en relieve. */}
      <path d="m48 22 5.3 10.4 11.5 1.5-8.3 8.2 2 11.6L48 48.2l-10.5 5.5 2-11.6-8.3-8.2 11.5-1.5Z"
        fill="#985c12" opacity=".45" transform="translate(0 1.8)"/>
      <path d="m48 22 5.3 10.4 11.5 1.5-8.3 8.2 2 11.6L48 48.2l-10.5 5.5 2-11.6-8.3-8.2 11.5-1.5Z"
        fill="#fff4b1" stroke="#c48218" strokeWidth="1.1" strokeLinejoin="round"/>
      <path d="M48 22v26.2l-10.5 5.5 2-11.6-8.3-8.2 11.5-1.5Z" fill="#ffca48" opacity=".75"/>
      {/* Pedestal compacto. */}
      <path d="M44 65h8v11H44Z" fill={`url(#${id}goldDark)`}/>
      <path d="M36 77h24l3 5H33Z" fill={`url(#${id}gold)`} stroke="#a96b21" strokeWidth="1.5"/>
      <path d="M30 83h36v5H30Z" fill={`url(#${id}goldDark)`} stroke="#f6d36e" strokeWidth="1"/>
      {/* Cinta envolvente con el nombre actual y los colores de la liga. */}
      <path d="M10 87 22 84l5 11-6 10-13-3 5-7Z M86 87 74 84l-5 11 6 10 13-3-5-7Z"
        fill={a} stroke="#f2bb54" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M17 86h62l5 10-6 10H18l-6-10Z"
        fill={`url(#${id}ribbon)`} stroke="#f3c15d" strokeWidth="1.9" strokeLinejoin="round"/>
      <path d="M21 89h54" stroke="#ffffff" strokeOpacity=".25" strokeWidth="1.1"/>
      <text x="48" y="100" textAnchor="middle" fill={t}
        fontFamily="Russo One,Impact,Arial Black,sans-serif" fontStyle="italic"
        fontSize={fontSize} fontWeight="900" letterSpacing=".05"
        textLength={fitLeagueText ? 55 : undefined}
        lengthAdjust={fitLeagueText ? "spacingAndGlyphs" : undefined}>{label}</text>


  </svg>;
}
