import { useMemo, useState } from "react";
import fixture from "../../data/lab/labSchedule.json";
import "./LigaArgentina.css";

const todayArgentina = () => new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const dateLabel = date => date ? new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z")).replace(/\./g,"").toUpperCase() : "FECHA A CONFIRMAR";
const teamLabel = name => name.replace(" (MDP)","").replace(" (SF)","").replace(" (CC)","");
function MatchCard({match,onOpen}) {
 const finished=match.status==="finished", review=match.status==="needs_review";
 const Team=({team})=><div className="lab-match-team"><img src={team.crestUrl || `https://www.laliganacional.com.ar/escudos/${team.clubId}/${team.teamId}`} alt="" loading="lazy"/><span>{teamLabel(team.name)}</span></div>;
 return <button type="button" className="lab-match-card" onClick={()=>onOpen(match)}>
  <div className="lab-match-meta"><span>{dateLabel(match.date)} · {match.time || "HORARIO A CONFIRMAR"}</span><span className={finished?"lab-status is-finished":review?"lab-status is-review":"lab-status"}>{finished?"FINAL":review?"A REVISAR":"PROGRAMADO"}</span></div>
  <div className="lab-match-scoreline"><Team team={match.homeTeam}/><strong className={finished?"lab-score is-final":"lab-score"}>{finished?`${match.homeScore} - ${match.awayScore}`:"VS"}</strong><Team team={match.awayTeam}/></div>
  <div className="lab-match-venue">{match.venue || "Estadio a confirmar"}<span>Ver planilla oficial ↗</span></div>
 </button>;
}
export default function LigaArgentina(){
 const [section,setSection]=useState("fixture"),[filter,setFilter]=useState("all"),[search,setSearch]=useState(""),[selectedMatch,setSelectedMatch]=useState(null);
 const today=todayArgentina();
 const classified=useMemo(()=>fixture.matches.map(m=>{
  const hasScore=m.homeScore!==null&&m.awayScore!==null;
  const now=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
  const future=m.date>today||(m.date===today&&m.time&&m.time>now);
  return {...m,status:m.status==="needs_review"?"needs_review":future?"scheduled":hasScore&&!(m.homeScore===0&&m.awayScore===0)?"finished":"needs_review"};
 }),[today]);
 const todayMatches=classified.filter(m=>m.date===today).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 const counts={results:classified.filter(m=>m.status==="finished").length,upcoming:classified.filter(m=>m.status==="scheduled").length,review:classified.filter(m=>m.status==="needs_review").length};
 const visible=classified.filter(m=>(filter==="all"||(filter==="results"&&m.status==="finished")||(filter==="upcoming"&&m.status==="scheduled")||(filter==="review"&&m.status==="needs_review"))&&(!search||`${m.homeTeam.name} ${m.awayTeam.name}`.toLowerCase().includes(search.toLowerCase())));
 const standings=useMemo(()=>{
  const rows=new Map(fixture.teams.map(t=>[t.teamId,{...t,played:0,wins:0,losses:0,pf:0,pc:0}]));
  classified.filter(m=>m.status==="finished").forEach(m=>{const h=rows.get(m.homeTeam.teamId),a=rows.get(m.awayTeam.teamId);if(!h||!a)return;h.played++;a.played++;h.pf+=m.homeScore;h.pc+=m.awayScore;a.pf+=m.awayScore;a.pc+=m.homeScore;if(m.homeScore>m.awayScore){h.wins++;a.losses++;}else{a.wins++;h.losses++;}});
  return [...rows.values()].sort((a,b)=>b.wins-a.wins||(b.pf-b.pc)-(a.pf-a.pc)||a.name.localeCompare(b.name,"es"));
 },[classified]);
 return <main className="lab-page">
  <section className="lab-hero"><div className="lab-hero-inner"><img src="/tournament-logos/lab.svg" alt=""/><div><span className="lab-kicker">LA NARANJA ARGENTINA · 2026/27</span><h1>LIGA <strong>ARGENTINA</strong></h1><p>Fixture, resultados y seguimiento de la segunda categoría del básquet argentino.</p></div></div>
   <div className="lab-summary"><div><strong>{fixture.total}</strong><span>PARTIDOS EN FIXTURE</span></div><div><strong>{fixture.teams.length}</strong><span>EQUIPOS</span></div><div><strong>{counts.results}</strong><span>RESULTADOS IDENTIFICADOS</span></div></div>
  </section>
  <div className="lab-content"><div className="lab-tabs"><button className={section==="fixture"?"active":""} onClick={()=>setSection("fixture")}>Fixture y resultados</button><button className={section==="standings"?"active":""} onClick={()=>setSection("standings")}>Posiciones</button></div>
  {section==="fixture"?<><div className="lab-section-heading"><div><span>COMPETENCIA 2026/27</span><h2>PARTIDOS</h2></div><input aria-label="Buscar equipo" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar equipo..."/></div>
   {todayMatches.length>0&&<section className="lab-today-section"><div className="lab-section-heading"><div><span>HOY</span><h2>PARTIDOS DE HOY</h2></div></div><div className="lab-today-grid">{todayMatches.map(m=><MatchCard key={m.id} match={m} onOpen={setSelectedMatch}/>)}</div></section>}
   <div className="lab-filters">{[["all","Todos",fixture.total],["results","Resultados",counts.results],["upcoming","Próximos",counts.upcoming],["review","A verificar",counts.review]].map(([key,label,count])=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}<b>{count}</b></button>)}</div>
   <div className="lab-match-list">{visible.map(m=><MatchCard key={m.id} match={m} onOpen={setSelectedMatch}/>) }{!visible.length&&<p className="lab-empty">No hay partidos para este filtro.</p>}</div>
  </>:<><div className="lab-section-heading"><div><span>ESTADÍSTICAS DE TEMPORADA</span><h2>POSICIONES</h2></div></div><div className="lab-standings-note">Los equipos todavía no están asignados a las conferencias Norte y Sur. Mostramos una tabla general provisoria, sin atribuir conferencias incorrectamente.</div>
   <div className="lab-table-wrap"><table className="lab-table"><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>Dif.</th></tr></thead><tbody>{standings.map((t,i)=><tr key={t.teamId}><td>{i+1}</td><td><span className="lab-table-team"><img src={t.crestUrl || `https://www.laliganacional.com.ar/escudos/${t.clubId}/${t.teamId}`} alt="" loading="lazy"/>{t.name}</span></td><td>{t.played}</td><td>{t.wins}</td><td>{t.losses}</td><td>{t.pf}</td><td>{t.pc}</td><td>{t.pf-t.pc}</td></tr>)}</tbody></table></div>
  </>}
  {selectedMatch&&<div className="lab-modal-backdrop" role="presentation" onClick={()=>setSelectedMatch(null)}><section className="lab-team-modal lab-match-modal" role="dialog" aria-modal="true" aria-label="Detalle del partido" onClick={e=>e.stopPropagation()}><button className="lab-modal-close" onClick={()=>setSelectedMatch(null)} aria-label="Cerrar">×</button><span className="lab-kicker">{dateLabel(selectedMatch.date)} · {selectedMatch.time||"HORARIO A CONFIRMAR"}</span><h2>{teamLabel(selectedMatch.homeTeam.name)} <strong>{selectedMatch.homeScore} - {selectedMatch.awayScore}</strong> {teamLabel(selectedMatch.awayTeam.name)}</h2><p>{selectedMatch.venue||"Estadio a confirmar"}</p><a href={selectedMatch.officialUrl} target="_blank" rel="noreferrer">Abrir planilla oficial ↗</a></section></div>}
  <p className="lab-source">Fixture y planillas: <a href="https://www.laliganacional.com.ar/laligaargentina/fixture" target="_blank" rel="noreferrer">sitio oficial de La Liga Nacional ↗</a>. Los resultados se clasifican por fecha y marcador; los casos no confirmados quedan separados para revisión.</p>
  </div></main>;
}