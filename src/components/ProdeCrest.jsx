import React from "react";

// Identidades vectoriales de Prode LNA: copa para ligas y pelota de básquet para usuarios.
// Los diseños se dibujan a partir del nombre y de los colores guardados; no hay imagen fija.
const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
const displayName = (name, max = 19) => String(name || "PRODE").trim().slice(0, max).toUpperCase();

export default function ProdeCrest({ name, primary = "#7de83d", secondary = "#152b3a", type = "user", textColor = "#ffffff", style = "pro", size = 55, className = "" }) {
  const a = safeColor(primary, "#7de83d");
  const b = safeColor(secondary, "#152b3a");
  const t = safeColor(textColor, "#ffffff");
  const isLeague = type === "league";
  const avatarStyle = ["pro","elite","legend"].includes(style) ? style : "pro";
  const id = React.useId().replace(/:/g, "");
  const label = displayName(name, isLeague ? 24 : 20);
  const fontSize = isLeague
    ? label.length > 19 ? 6.5 : label.length > 14 ? 7.5 : label.length > 10 ? 8.5 : 9
    : label.length > 16 ? 6 : label.length > 12 ? 7 : label.length > 9 ? 8 : 10;
  // La placa central mide 62 unidades. Reservamos margen y, si hace falta,
  // comprimimos el texto SVG para que nunca invada los extremos de la cinta.
  const leagueEstimatedWidth = [...label].reduce((sum, char) => sum + (char === " " ? 0.33 : /[MW]/.test(char) ? 0.92 : /[IJ1]/.test(char) ? 0.42 : 0.67) * fontSize, 0);
  const fitLeagueText = isLeague && leagueEstimatedWidth > 55;

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
      {/* Acabado metalizado de la copa, separado de los colores editables de la liga. */}
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
    {isLeague ? <>
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

    </> : avatarStyle !== "pro" ? <>
      {/* Escudo Elite y Emblema Legend conservan los colores elegidos. */}
      <ellipse cx="48" cy="103" rx="31" ry="4" fill={a} opacity=".2"/>
      {avatarStyle === "elite" ? <>
        <path d="M18 54 6 46 12 69 28 77 M78 54 90 46 84 69 68 77" fill={a} stroke={b} strokeWidth="2"/>
        <path d="M48 3 88 20 84 68 48 90 12 68 8 20Z" fill={b} stroke={a} strokeWidth="4"/>
        <path d="M48 9 82 24 78 64 48 83 18 64 14 24Z" fill="none" stroke="#ffffff" strokeOpacity=".7" strokeWidth="2"/>
      </> : <>
        <path d="M18 47 4 59 21 68 M78 47 92 59 75 68" fill={a} stroke={b} strokeWidth="3"/>
        <path d="M48 3 87 25 87 67 48 90 9 67 9 25Z" fill={b} stroke={a} strokeWidth="4"/>
        <path d="M48 9 81 28 81 63 48 82 15 63 15 28Z" fill="none" stroke="#ffffff" strokeOpacity=".72" strokeWidth="2"/>
      </>}
      <circle cx="48" cy="43" r="28" fill={`url(#${id}face)`}/>
      <g fill="none" stroke={b} strokeWidth="3.5" strokeLinecap="round">
        <circle cx="48" cy="43" r="27"/>
        <path d="M21 43h54 M48 16v54 M28 22q31 20 0 42 M68 22q-31 20 0 42"/>
      </g>
      <circle cx="48" cy="43" r="28" fill={`url(#${id}shine)`}/>
      {avatarStyle === "elite" ?
        <path d="m48 7 3 5.8 6.5 1-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5-4.7-4.6 6.5-1Z" fill="#fff0b6" stroke={b}/> :
        <path d="m48 55 4.5 9.2 10.2 1.5-7.3 7.2 1.7 10.1-9.1-4.8-9.1 4.8 1.7-10.1-7.3-7.2 10.2-1.5Z" fill="#eef7ff" stroke={b} strokeWidth="1.5"/>}
      <path d="M10 79 20 76l5 7-5 13-13-3Z M86 79 76 76l-5 7 5 13 13-3Z" fill={a} stroke={b}/>
      <path d="M15 77h66l4 10-7 13H18l-7-13Z" fill={b} stroke={a} strokeWidth="2.4"/>
      <text x="48" y="92" textAnchor="middle" fill={t} fontFamily="Russo One,Impact,Arial Black,sans-serif"
        fontStyle="italic" fontSize={fontSize} fontWeight="900"
        textLength={label.length > 11 ? 55 : undefined}
        lengthAdjust={label.length > 11 ? "spacingAndGlyphs" : undefined}>{label}</text>
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
