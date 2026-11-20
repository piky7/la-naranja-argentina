import { useMemo, useState } from "react";
import fixture from "../../data/lab/labSchedule.json";
import "./LigaArgentina.css";

const clean = name => name.replace(/ \((MDP|SF|CC|LR|T|VT|J)\)/g, "");
export default function LigaArgentinaEquipos() {
 const [search,setSearch]=useState("");
 const [selected,setSelected]=useState(null);
 const stats=useMemo(()=>{
  const rows=new Map(fixture.teams.map(t=>[t.teamId,{...t,played:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,last:[]}]));
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  fixture.matches.forEach(m=>{
   const past=m.date<today || (m.date===today && m.time && m.time<=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date()));
   if(!past || m.homeScore==null || m.awayScore==null || (m.homeScore===0&&m.awayScore===0)) return;
   const h=rows.get(m.homeTeam.teamId),a=rows.get(m.awayTeam.teamId); if(!h||!a)return;
   h.played++;a.played++;h.pointsFor+=m.homeScore;h.pointsAgainst+=m.awayScore;a.pointsFor+=m.awayScore;a.pointsAgainst+=m.homeScore;
   if(m.homeScore>m.awayScore){h.wins++;a.losses++;}else{a.wins++;h.losses++;}
   h.last.push({date:m.date,opponent:a.name,score:m.homeScore+"-"+m.awayScore,result:m.homeScore>m.awayScore?"G":"P"});
   a.last.push({date:m.date,opponent:h.name,score:m.awayScore+"-"+m.homeScore,result:m.awayScore>m.homeScore?"G":"P"});
  });
  return [...rows.values()];
 },[]);
 const teams=stats.filter(t=>clean(t.name).toLowerCase().includes(search.trim().toLowerCase()));
 return <main className="lab-page"><section className="lab-hero"><div className="lab-hero-inner"><img src="/tournament-logos/lab.svg" alt=""/><div><span className="lab-kicker">LIGA ARGENTINA · 2026/27</span><h1>NUESTROS <strong>EQUIPOS</strong></h1><p>Fichas, escudos y rendimiento de los 34 clubes de la competencia.</p></div></div><div className="lab-summary"><div><strong>{fixture.teams.length}</strong><span>EQUIPOS</span></div><div><strong>{stats.reduce((n,t)=>n+t.played,0)/2}</strong><span>PARTIDOS COMPUTADOS</span></div></div></section>
 <section className="lab-content"><div className="lab-section-heading"><div><span>COMPETENCIA 2026/27</span><h2>EQUIPOS</h2></div><input aria-label="Buscar equipo" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar equipo..."/></div>
 <div className="lab-team-grid">{teams.map(t=><button key={t.teamId} className="lab-team-card" onClick={()=>setSelected(t)}><img src={t.crestUrl} alt=""/><span>{clean(t.name)}</span><small>{t.wins} G · {t.losses} P</small></button>)}</div></section>
 {selected&&<div className="lab-modal-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className="lab-team-modal" role="dialog" aria-modal="true" aria-label={clean(selected.name)} onClick={e=>e.stopPropagation()}><button className="lab-modal-close" onClick={()=>setSelected(null)} aria-label="Cerrar">×</button><img className="lab-modal-crest" src={selected.crestUrl} alt=""/><span className="lab-kicker">FICHA DEL CLUB</span><h2>{clean(selected.name)}</h2><div className="lab-modal-record"><div><b>{selected.played}</b><small>PJ</small></div><div><b>{selected.wins}</b><small>GANADOS</small></div><div><b>{selected.losses}</b><small>PERDIDOS</small></div><div><b>{selected.pointsFor-selected.pointsAgainst}</b><small>DIFERENCIA</small></div></div><h3>Últimos resultados</h3>{[...selected.last].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map((m,i)=><div className="lab-team-result" key={i}><span>{m.date.split("-").reverse().join("/")}</span><b>{m.opponent}</b><strong className={m.result==="G"?"win":"loss"}>{m.score} · {m.result}</strong></div>)}<a href={selected.url} target="_blank" rel="noreferrer">Ver ficha oficial ↗</a></section></div>}
 </main>;
}
