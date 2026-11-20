import { useMemo } from "react";
import fixture from "../../data/lab/labSchedule.json";
import "./LigaArgentina.css";
export default function LigaArgentinaEstadisticas(){
 const rows=useMemo(()=>{
  const map=new Map(fixture.teams.map(t=>[t.teamId,{...t,played:0,wins:0,losses:0,pf:0,pc:0}]));
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  fixture.matches.forEach(m=>{const past=m.date<today||(m.date===today&&m.time&&m.time<=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date()));if(!past||m.homeScore==null||m.awayScore==null||(m.homeScore===0&&m.awayScore===0))return;const h=map.get(m.homeTeam.teamId),a=map.get(m.awayTeam.teamId);if(!h||!a)return;h.played++;a.played++;h.pf+=m.homeScore;h.pc+=m.awayScore;a.pf+=m.awayScore;a.pc+=m.homeScore;if(m.homeScore>m.awayScore){h.wins++;a.losses++;}else{a.wins++;h.losses++;}});
  return [...map.values()].map(t=>({...t,ppp:t.played?t.pf/t.played:0,opp:t.played?t.pc/t.played:0,diff:t.pf-t.pc})).sort((a,b)=>b.ppp-a.ppp);
 },[]);
 const ranking=(label,key,suffix="")=><section className="lab-stat-ranking"><h3>{label}</h3>{rows.slice(0,10).map((t,i)=><div className="lab-stat-row" key={t.teamId}><b className="lab-stat-position">{i+1}</b><img src={t.crestUrl} alt=""/><span>{t.name}</span><strong>{key(t).toFixed(1)}{suffix}</strong></div>)}</section>;
 return <main className="lab-page"><section className="lab-hero"><div className="lab-hero-inner"><img src="/tournament-logos/lab.svg" alt=""/><div><span className="lab-kicker">LIGA ARGENTINA · 2026/27</span><h1>ESTADÍS<strong>TICAS</strong></h1><p>Indicadores colectivos calculados a partir de los resultados identificados.</p></div></div></section><section className="lab-content"><div className="lab-section-heading"><div><span>RANKINGS DE CLUBES</span><h2>RENDIMIENTO</h2></div></div><p className="lab-standings-note">Estos indicadores son promedios calculados con los marcadores disponibles. Las estadísticas oficiales de jugadores y planillas detalladas se incorporarán cuando se complete la importación histórica de LAB.</p><div className="lab-stat-grid">{ranking("PUNTOS A FAVOR",t=>t.ppp)}{ranking("PUNTOS RECIBIDOS",t=>t.opp)}{ranking("DIFERENCIA TOTAL",t=>t.diff)}{ranking("PARTIDOS GANADOS",t=>t.wins,"")}</div></section></main>;
}
