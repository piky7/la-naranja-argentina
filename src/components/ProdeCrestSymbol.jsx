import React from "react";

// Dieciséis símbolos vectoriales originales. Se heredan los colores del usuario.
// Ningún modelo representa campeonatos ni utiliza estrellas o coronas.
export const PRODE_SYMBOL_CATEGORIES = [
  { id: "animals", label: "Animales", options: [
    ["eagle", "Águila"], ["lion", "León"], ["wolf", "Lobo"],
    ["tiger", "Tigre"], ["bear", "Oso"], ["shark", "Tiburón"],
  ] },
  { id: "sports", label: "Deportivos", options: [
    ["ball", "Pelota"], ["hoop", "Aro"], ["jersey", "Camiseta"], ["court", "Cancha"],
  ] },
  { id: "emblems", label: "Emblemas", options: [
    ["torch", "Antorcha"], ["bolt", "Rayo"], ["shield", "Escudo"],
    ["diamond", "Diamante"], ["storm", "Tormenta"], ["trident", "Tridente"],
  ] },
];
export const PRODE_SYMBOL_IDS = PRODE_SYMBOL_CATEGORIES.flatMap(group => group.options.map(([id]) => id));
const edge = { strokeLinejoin: "round", strokeLinecap: "round" };

export default function ProdeCrestSymbol({ symbol = "ball", primary = "#7de83d", secondary = "#152b3a" }) {
  const solid = primary;
  const dark = secondary;
  const pale = "#e8f8ff";
  const common = { stroke: dark, strokeWidth: 1.8, ...edge };
  switch (symbol) {
    case "eagle": return <g {...common}>
      <path d="M46 24 34 17 18 25 33 30 21 33 37 39 31 48 45 43 54 34Z" fill={pale}/>
      <path d="M49 25 63 17 76 23 61 31 73 34 58 38 65 47 49 42Z" fill={solid}/>
      <path d="M42 25 53 23 61 30 52 35 48 43 38 34Z" fill={pale}/>
      <path d="m53 29 14 3-12 5-7-4Z" fill="#f3ae44"/>
      <circle cx="50" cy="29" r="1.9" fill={dark}/><path d="M43 40 48 55 53 41" fill={solid}/>
    </g>;
    case "lion": return <g {...common}>
      <path d="M48 14 58 19 68 17 70 29 78 38 72 50 66 60 48 65 30 60 24 49 18 38 26 28 28 18 38 20Z" fill={solid}/>
      <path d="M35 29 42 25 54 25 61 29 63 43 57 54 48 58 39 54 33 43Z" fill={pale}/>
      <path d="m37 39 7 2M52 41l7-2" fill="none" strokeWidth="2.5"/>
      <path d="m43 45 5 4 5-4-5-3Z" fill={dark}/>
      <path d="M48 49v5m-9-1q9 7 18 0" fill="none" strokeWidth="2.4"/>
      <path d="M27 38 22 41M69 38l5 3M29 49l-5 4M67 49l5 4" fill="none" stroke={pale} strokeWidth="2"/>
    </g>;
    case "wolf": return <g {...common}>
      <path d="M24 21 42 30 48 16 54 30 73 21 67 40 73 53 60 61 48 65 36 61 23 53 29 40Z" fill={solid}/>
      <path d="m31 36 13 8 4-5 4 5 13-8-4 18-13 7-13-7Z" fill={pale}/>
      <path d="m34 46 8 2M54 48l8-2" fill="none" strokeWidth="3.2"/>
      <path d="m42 54 6-4 6 4-6 5Z" fill={dark}/>
      <path d="M48 58v4" fill="none" strokeWidth="2"/>
      <path d="m28 25 10 11M68 25 58 36" fill="none" stroke={pale} strokeWidth="2"/>
    </g>;
    case "tiger": return <g {...common}>
      <path d="M28 23 20 20 21 37 26 43 26 54 40 65H56L70 54V43l5-6 1-17-9 3-9-7H38Z" fill={solid}/>
      <path d="M31 36 41 33 48 38 55 33 65 36 65 52 55 59 41 59 31 52Z" fill={pale}/>
      <path d="m37 21 5 15m11-15-5 15M26 39l12 8m32-8-12 8M32 55l10-4m22 4-10-4" fill="none" strokeWidth="4"/>
      <path d="m44 49 4 4 4-4-4-2Z" fill={dark}/><path d="M48 53v5m-9-5 6 6m12-6-6 6" fill="none" strokeWidth="1.8"/>
    </g>;
    case "bear": return <g {...common}>
      <circle cx="29" cy="26" r="10" fill={solid}/><circle cx="67" cy="26" r="10" fill={solid}/>
      <path d="M25 30Q28 16 48 18 68 16 71 30L73 51Q65 65 48 67 31 65 23 51Z" fill={solid}/>
      <path d="M32 41q16-10 32 0l-2 15q-14 11-28 0Z" fill={pale}/>
      <circle cx="37" cy="37" r="2.7" fill={dark}/><circle cx="59" cy="37" r="2.7" fill={dark}/>
      <path d="m41 47 7-4 7 4-7 6Z" fill={dark}/>
      <path d="M48 53v6m-7-3q7 7 14 0" strokeWidth="2.5" fill="none"/>
    </g>;
    case "shark": return <g {...common}>
      <path d="M18 41 35 35 52 16 55 34Q72 33 79 42L68 48 78 56 61 54Q44 64 22 54l10-5Z" fill={solid}/>
      <path d="M23 49q26-16 52-7L63 50Q44 60 23 49Z" fill={pale}/>
      <path d="m42 48 5 4 4-5 5 4 4-6 5 4" fill="none" strokeWidth="1.7"/>
      <circle cx="66" cy="39" r="2" fill={dark}/>
      <path d="m24 47-11-9 4 16 8 1M42 54l-5 10 14-6" fill={solid}/>
    </g>;
    case "ball": return <g fill="none" stroke={pale} strokeWidth="3.5" {...edge}>
      <circle cx="48" cy="40" r="24" fill={solid} stroke={dark} strokeWidth="2.4"/>
      <circle cx="48" cy="40" r="24"/><path d="M24 40h48M48 16v48M30 22q23 18 0 36M66 22Q43 40 66 58"/>
    </g>;
    case "hoop": return <g {...edge}>
      <path d="M31 19h34v23H31Z" fill="none" stroke={pale} strokeWidth="4"/>
      <path d="M34 22h28v18H34Z" fill={dark} fillOpacity=".35" stroke={solid} strokeWidth="1.8"/>
      <path d="M22 42h52" stroke={solid} strokeWidth="5" strokeLinecap="round"/>
      <path d="M30 45 36 65h24l6-20M34 45l9 20m5-20v20m13-20-8 20M30 52l31 1M34 60h27" stroke={pale} strokeWidth="2" fill="none"/>
    </g>;
    case "jersey": return <g {...common}>
      <path d="m33 18 11-4q4 11 8 0l11 4 13 13-11 13-6-5v26H37V39l-6 5-11-13Z" fill={solid}/>
      <path d="M38 18q10 13 20 0M37 27h22M37 57h22" fill="none" stroke={pale} strokeWidth="2.5"/>
      <text x="48" y="49" fontFamily="Impact,Arial Black,sans-serif" fontSize="17" fontWeight="900" fill={pale} textAnchor="middle" stroke="none">10</text>
    </g>;
    case "court": return <g {...edge}>
      <rect x="19" y="17" width="58" height="49" rx="3" fill={solid} fillOpacity=".55" stroke={pale} strokeWidth="3"/>
      <path d="M48 17v49M19 41.5h58" stroke={pale} strokeWidth="2.5"/>
      <circle cx="48" cy="41.5" r="9" fill="none" stroke={pale} strokeWidth="2.5"/>
      <path d="M19 29h13v25H19M77 29H64v25h13" stroke={pale} fill="none" strokeWidth="2.2"/>
      <path d="M27 35a8 8 0 0 1 0 13M69 35a8 8 0 0 0 0 13" stroke={pale} fill="none" strokeWidth="2"/>
    </g>;
    case "torch": return <g {...common}>
      <path d="M47 15q-14 15-1 23-3-13 12-25 1 14 7 19 9 17-11 23-25 5-22-15 2-10 15-25Z" fill={solid}/>
      <path d="M49 34q-10 8-2 18 12 1 11-10-7-2-9-8Z" fill="#ffdc91"/>
      <path d="M34 53h29l-7 8H41Z" fill={pale}/>
      <path d="M43 61h12l-3 11h-6Z" fill={solid}/>
    </g>;
    case "bolt": return <g {...common}>
      <path d="M55 12 25 46h20l-7 24 33-39H51Z" fill={solid} stroke={pale} strokeWidth="3"/>
      <path d="M55 12 45 40h15" fill="none" stroke={pale} strokeWidth="2.3"/>
    </g>;
    case "shield": return <g {...common}>
      <path d="M48 11 75 22v25Q69 63 48 72 27 63 21 47V22Z" fill={solid} stroke={pale} strokeWidth="3.4"/>
      <path d="M48 20 65 27v18Q60 56 48 62 36 56 31 45V27Z" fill={dark} fillOpacity=".5" stroke={pale} strokeWidth="1.5"/>
      <path d="m37 43 8 8 16-19" stroke={pale} strokeWidth="5" fill="none" strokeLinecap="round"/>
    </g>;
    case "diamond": return <g {...common}>
      <path d="M29 23h38l14 15-33 35-33-35Z" fill={solid} stroke={pale} strokeWidth="3"/>
      <path d="M29 23 37 38l11 35 11-35 8-15M15 38h66M37 38l11-15 11 15" fill="none" stroke={pale} strokeWidth="2.4"/>
      <path d="M39 26 48 23 57 26" fill="none" stroke={dark} strokeWidth="2"/>
    </g>;
    case "storm": return <g {...common}>
      <path d="M25 52Q10 51 15 38q4-11 17-11 5-18 23-13 12 3 14 17 14 0 15 13 1 10-12 11H25Z" fill={solid} stroke={pale} strokeWidth="2.6"/>
      <path d="M41 39h20L49 52h10L35 72l8-19H33Z" fill={pale}/>
      <path d="M20 64h8m42-1h8" stroke={pale} strokeWidth="2.5"/>
    </g>;
    case "trident": return <g {...common}>
      <path d="M48 19v53M27 23v17q0 14 21 14t21-14V23" fill="none" stroke={pale} strokeWidth="5"/>
      <path d="m48 10-8 16h16ZM27 14l-7 15h14ZM69 14l-7 15h14Z" fill={solid} stroke={pale} strokeWidth="1.5"/>
      <path d="M38 66h20" fill="none" stroke={solid} strokeWidth="5"/>
    </g>;
    default: return <g><circle cx="48" cy="40" r="23" stroke={pale} strokeWidth="3" fill={solid}/></g>;
  }
}
