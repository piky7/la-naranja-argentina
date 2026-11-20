import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import fixture from "../../data/lab/labSchedule.json";
import rosters from "../../data/lab/labRosters.json";
import boxscores from "../../data/lab/labBoxscores.json";
import { LabHomeBoxscore, labMatchColor, labCrest } from "./HomeLigaArgentina";
import { isLabMatchFinished } from "../utils/labMatchStatus";
import "./LigaArgentina.css";
import "./Equipo.css";

const clean = (name = "") => name.replace(/\s*\((MDP|SF|CC|LR|T|VT|J)\)/g, "").trim();
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone:"America/Argentina/Buenos_Aires", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
const fmtDate = date => new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"short"}).format(new Date(date+"T12:00:00")).replace(".","").toUpperCase();
const fmtWeekday = date => new Intl.DateTimeFormat("es-AR",{weekday:"short"}).format(new Date(date+"T12:00:00")).replace(".","").toUpperCase();
const fmt = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "—";
const comparisonKeys = [
 ["rebounds","Rebotes / partido"],["assists","Asistencias / partido"],["steals","Recuperaciones / partido"],
 ["blocks","Tapones / partido"],["turnovers","Pérdidas / partido"],["fouls","Faltas / partido"]
];
const shootingKeys = [["fieldGoals","Tiros de campo"],["twoPointers","Tiros de 2"],["threePointers","Triples"],["freeThrows","Tiros libres"]];

function TeamStats({ team, games, scores, boxes }) {
 const totals = {rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0};
 const shots = {fieldGoals:{made:0,attempted:0},twoPointers:{made:0,attempted:0},threePointers:{made:0,attempted:0},freeThrows:{made:0,attempted:0}};
 let available=0;
 for (const match of games) {
  const box=boxes[match.id], comparison=box?.teamComparison;
  if(!comparison) continue;
  const side=Number(match.homeTeam.teamId)===Number(team.teamId)?"home":"away";
  const row=comparison[side]; if(!row) continue;
  available++;
  for(const key of Object.keys(totals)) totals[key]+=Number(row[key]||0);
  for(const key of Object.keys(shots)){shots[key].made+=Number(row[key]?.made||0);shots[key].attempted+=Number(row[key]?.attempted||0);}
 }
 const scored=scores.reduce((a,m)=>a+(Number(m.homeTeam.teamId)===Number(team.teamId)?Number(m.homeScore):Number(m.awayScore)),0);
 const conceded=scores.reduce((a,m)=>a+(Number(m.homeTeam.teamId)===Number(team.teamId)?Number(m.awayScore):Number(m.homeScore)),0);
 const values={points: scores.length?fmt(scored/scores.length):"—",pointsAgainst:scores.length?fmt(conceded/scores.length):"—"};
 for(const key of Object.keys(totals)) values[key]=available?fmt(totals[key]/available):"—";
 for(const key of Object.keys(shots)){const s=shots[key];values[key]=s.attempted?((100*s.made/s.attempted).toFixed(1)+"%"):"—";}
 return <section className="team-season-stats team-season-stats-sport">
  <div className="team-season-stats-heading"><div><span>ESTADÍSTICAS DEL EQUIPO</span><h2>Promedios del equipo <em>2026/27</em></h2></div><strong>{available} PJ con datos</strong></div>
  {available===0?<p className="team-season-stats-empty">Todavía no hay comparativas estadísticas oficiales disponibles para este equipo.</p>:<>
   <div className="team-season-stats-grid">{[["points","Puntos / partido"],["pointsAgainst","Pts recibidos / partido"],...comparisonKeys].map(([key,label])=><div className="team-season-stat" key={key}><div className="team-season-stat-info"><strong>{values[key]}</strong><span>{label}</span></div></div>)}</div>
   <h3 className="team-season-shooting-heading">PORCENTAJES DE TIRO</h3>
   <div className="team-season-stats-grid team-season-shooting-grid">{shootingKeys.map(([key,label])=><div className="team-season-stat" key={key}><div className="team-season-stat-info"><strong>{values[key]}</strong><span>{label}</span></div></div>)}</div>
  </>}
  <p className="team-season-stats-note">Temporada 2026/27 · Datos de comparativas oficiales de box scores LAB.</p>
 </section>;
}

function TeamMatchRow({match,teamId,finished,onClick}) {
 const home=Number(match.homeTeam.teamId)===Number(teamId);
 const own=home?match.homeTeam:match.awayTeam, rival=home?match.awayTeam:match.homeTeam;
 return <button type="button" onClick={onClick} className={"team-match-row team-match-modern "+(finished?"lab-team-result-clickable":"")} disabled={!finished}>
  <div className="team-match-date team-match-date-modern"><small>{fmtWeekday(match.date)}</small><strong>{fmtDate(match.date)}</strong><span>{home?"LOCAL":"VISITANTE"}</span></div>
  <div className="team-match-opponent team-match-versus">
   <div className="team-match-side"><img className="team-match-logo" src={labCrest(own)} alt=""/><strong>{clean(own.name)}</strong></div>
   {finished?<strong className={"team-result-center "+(Number(home?match.homeScore:match.awayScore)>Number(home?match.awayScore:match.homeScore)?"team-result-win":"team-result-loss")}>{home?match.homeScore:match.awayScore} - {home?match.awayScore:match.homeScore}</strong>:<span className="team-match-vs">VS</span>}
   <div className="team-match-side"><img className="team-match-logo" src={labCrest(rival)} alt=""/><strong>{clean(rival.name)}</strong></div>
  </div>
  <span className="team-match-time team-match-time-modern">{finished?"FINAL":(match.time||"A confirmar")}</span>
 </button>;
}

function TeamDetail({team}) {
 const roster=rosters.teams[String(team.teamId)]||{players:[],playersCount:0};
 const [selectedMatch,setSelectedMatch]=useState(null);
 const teamMatches=fixture.matches.filter(m=>Number(m.homeTeam.teamId)===Number(team.teamId)||Number(m.awayTeam.teamId)===Number(team.teamId));
 const played=teamMatches.filter(isLabMatchFinished);
 const upcoming=teamMatches.filter(m=>!isLabMatchFinished(m)&&m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||"").localeCompare(b.time||"")).slice(0,4);
 const results=[...played].sort((a,b)=>b.date.localeCompare(a.date)||(b.time||"").localeCompare(a.time||"")).slice(0,9);
 let wins=0,losses=0;
 for(const m of played){const home=Number(m.homeTeam.teamId)===Number(team.teamId);const own=Number(home?m.homeScore:m.awayScore),other=Number(home?m.awayScore:m.homeScore);if(own>other)wins++;else if(own<other)losses++;}
 const players=[...(roster.players||[])].sort((a,b)=>(b.gamesPlayed||0)-(a.gamesPlayed||0)||(b.totals?.points||0)-(a.totals?.points||0));
 return <main className="team-page lab-team-detail">
  <section className="team-header"><img className="team-header-watermark" src={team.crestUrl} alt="" aria-hidden="true"/><div className="page-container">
   <Link to="/equipos" className="back-link">← Volver a equipos</Link>
   <div className="team-header-content"><div className="team-main-logo"><img src={team.crestUrl} alt={"Escudo de "+clean(team.name)}/></div><div className="team-header-info"><span className="page-label">LIGA ARGENTINA 2026/27</span><h1>{clean(team.name)} <span className="team-record">({wins}-{losses})</span></h1></div></div>
  </div></section>
  <section className="team-content"><div className="page-container">
   <TeamStats team={team} games={played} scores={played} boxes={boxscores}/>
   <div className="lab-team-agenda-grid">
    <section className="team-section"><div className="section-heading-team"><div><span>AGENDA</span><h2>PRÓXIMOS <span>PARTIDOS</span></h2></div><strong>{upcoming.length}</strong></div>{upcoming.length?<div className="team-matches">{upcoming.map(m=><TeamMatchRow key={m.id} match={m} teamId={team.teamId}/>)}</div>:<div className="team-empty"><strong>No hay próximos partidos</strong></div>}</section>
    <section className="team-section"><div className="section-heading-team"><div><span>RESULTADOS</span><h2>ÚLTIMOS <span>PARTIDOS</span></h2></div><strong>{played.length}</strong></div>{results.length?<div className="team-matches">{results.map(m=><TeamMatchRow key={m.id} match={m} teamId={team.teamId} finished onClick={()=>setSelectedMatch(m)}/>)}</div>:<div className="team-empty"><strong>Todavía no hay resultados</strong></div>}</section>
   </div>
   <section className="team-section lab-team-roster-section"><div className="section-heading-team"><div><h2><span>PLANTEL</span></h2></div><strong>{roster.playersCount||players.length}</strong></div>
    {players.length?<div className="team-roster-table lab-team-roster-table"><div className="team-roster-head"><span>JUGADOR</span><span>PJ</span><span>PTS</span><span>REB</span><span>AST</span><span>MIN</span><span>VAL</span></div>
     {players.map(p=><div className="team-roster-row" key={p.id}><span className="team-roster-name"><img className="team-roster-crest" src={team.crestUrl} alt=""/><span>{p.name}</span></span><span>{p.gamesPlayed||0}</span><span>{fmt(p.averages?.points)}</span><span>{fmt(p.averages?.rebounds)}</span><span>{fmt(p.averages?.assists)}</span><span>{p.minutesAverage||"—"}</span><span>{fmt(p.averages?.valuation)}</span></div>)}
    </div>:<div className="team-empty"><strong>Plantel todavía no disponible</strong><p>Se incorporará a medida que se importen nuevas planillas oficiales.</p></div>}
   </section>
   <p className="lab-team-source-note">Plantel detectado en planillas oficiales importadas. No representa necesariamente la lista de buena fe completa.</p>
  </div></section>
  {selectedMatch&&<LabHomeBoxscore match={selectedMatch} onClose={()=>setSelectedMatch(null)}/>}
 </main>;
}

export default function LigaArgentinaEquipos() {
 const {teamId}=useParams();
 const [search,setSearch]=useState("");
 const stats=useMemo(()=>fixture.teams.map(team=>{
  const played=fixture.matches.filter(m=>isLabMatchFinished(m)&&(Number(m.homeTeam.teamId)===Number(team.teamId)||Number(m.awayTeam.teamId)===Number(team.teamId)));
  let wins=0,losses=0;
  for(const m of played){const home=Number(m.homeTeam.teamId)===Number(team.teamId),own=Number(home?m.homeScore:m.awayScore),other=Number(home?m.awayScore:m.homeScore);if(own>other)wins++;else if(own<other)losses++;}
  return {...team,wins,losses,played:wins+losses};
 }),[]);
 if(teamId){const team=fixture.teams.find(t=>String(t.teamId)===String(teamId)||t.slug===teamId);return team?<TeamDetail team={team}/>:<main className="team-page"><div className="page-container"><Link to="/equipos" className="back-link">← Volver a equipos</Link><h1>Equipo no encontrado</h1></div></main>;}
 const filtered=stats.filter(t=>clean(t.name).toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"es"));
 return <main className="lab-page lab-team-directory">
  <section className="lab-content">
   <div className="lab-section-heading"><h1>EQUIPOS</h1><input aria-label="Buscar equipo" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar equipo..."/></div>
   <div className="lab-team-directory-list">{filtered.map(team=><Link key={team.teamId} to={"/equipos/"+team.teamId} className="lab-team-directory-row" style={{"--lab-team-color":labMatchColor(team)}}><img src={labCrest(team)} alt=""/><span className="lab-team-directory-info"><strong>{clean(team.name)}</strong><small>{team.wins} G · {team.losses} P</small></span><span className="lab-team-directory-code">{team.slug.slice(0,2).toUpperCase()}</span><span className="lab-team-directory-arrow">⟶</span></Link>)}</div>
   {!filtered.length&&<p className="lab-empty">No encontramos equipos con esa búsqueda.</p>}
  </section>
 </main>;
}
// La vista de estadísticas LAB reutiliza el sistema visual y los datos oficiales de temporada.
// Validación de estilos compartidos de estadísticas de Liga Argentina.
