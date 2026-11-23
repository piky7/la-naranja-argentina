import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLiveSnapshot } from "../hooks/useLiveSnapshot";
import LiveLedScore, { LiveLedPeriod } from "../components/LiveLedScore";
import fixture from "../../data/lab/labSchedule.json";
import { LabHomeBoxscore, LabUpcomingMatchModal, LabLiveMatchModal } from "./HomeLigaArgentina.jsx";
import { useLabBoxscores } from "../utils/labData";
import rosters from "../../data/lab/labRosters.json";
import { isLabMatchFinished, hasValidLabFinalScore } from "../utils/labMatchStatus";
import { LAB_CONFERENCES, labMatchColor, formatLabLiveRemaining } from "../utils/labPresentation";
import "./LigaArgentina.css";
import "./Liga.css";
import "./Home.css";
import "./HomeLigaArgentina.css";

const todayArgentina = () => new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const dateLabel = date => date ? new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z")).replace(/\./g,"").toUpperCase() : "FECHA A CONFIRMAR";
const teamLabel = name => name.replace(" (MDP)","").replace(" (SF)","").replace(" (CC)","");



function LabBoxscore({match}) {
 const boxscores=useLabBoxscores(true,[match.id]);
 const box=boxscores?.[match.id];
 const [side,setSide]=useState("home"),[tab,setTab]=useState("players");
 if(!box) return <div className="lab-boxscore-empty"><strong>Estadísticas en preparación</strong><span>La planilla oficial todavía no está incorporada a la base de LNA.</span></div>;
 const crest=t=>t.crestUrl || ("https://www.laliganacional.com.ar/escudos/"+t.clubId+"/"+t.teamId);
 const team=side==="home"?match.homeTeam:match.awayTeam;
 const rows=box.players.filter(p=>p.teamId===team.teamId).sort((a,b)=>b.points-a.points);
 const mvp=box.players.slice().sort((a,b)=>b.valuation-a.valuation || b.points-a.points)[0];
 const mvpTeam=mvp && (mvp.teamId===match.homeTeam.teamId?match.homeTeam:match.awayTeam);
 const date=new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"numeric",month:"numeric",timeZone:"UTC"}).format(new Date(match.date+"T12:00:00Z")).replace(/\./g,"").toUpperCase();
 return <div className="lab-native-boxscore">
  <header className="lab-native-head"><b>LIGA ARGENTINA 2026/27</b><span>{date} <i>•</i> FINAL</span>
   <div className="lab-native-score"><div><img src={crest(match.homeTeam)} alt=""/><strong>{teamLabel(match.homeTeam.name)}</strong></div><b><em>{match.homeScore}</em> - <em>{match.awayScore}</em></b><div><img src={crest(match.awayTeam)} alt=""/><strong>{teamLabel(match.awayTeam.name)}</strong></div></div><small>{match.venue || "LIGA ARGENTINA"}</small>
  </header>
  {mvp&&<section className="lab-native-mvp"><label>♛ JUGADOR DESTACADO · MAYOR VALORACIÓN</label><div><img src={crest(mvpTeam)} alt=""/><strong>{mvp.name}</strong><small>{teamLabel(mvpTeam.name)}</small></div><aside>{[[mvp.points,"PTS"],[mvp.rebounds,"REB"],[mvp.assists,"AST"],[mvp.minutes,"MIN"],[mvp.valuation,"VAL"]].map(([v,l])=><b key={l}>{v}<small>{l}</small></b>)}</aside></section>}
  <nav className="lab-native-tabs"><button className={tab==="players"?"active":""} onClick={()=>setTab("players")}>Stats jugadores</button><button className={tab==="teams"?"active":""} onClick={()=>setTab("teams")}>Estadísticas equipos</button></nav>
  {tab==="players"?<><nav className="lab-native-team-tabs">{[["home",match.homeTeam],["away",match.awayTeam]].map(([s,t])=><button key={s} className={side===s?"active":""} onClick={()=>setSide(s)}><img src={crest(t)} alt=""/>{teamLabel(t.name)}</button>)}</nav><div className="lab-native-table"><div className="lab-native-th"><b>JUGADOR</b><b>PTS</b><b>REB</b><b>AST</b><b>MIN</b><b>VAL</b></div>{rows.map(p=><div className="lab-native-tr" key={p.id}><strong>{p.number?("#"+p.number+" · "):""}{p.name}</strong><b>{p.points}</b><span>{p.rebounds}</span><span>{p.assists}</span><span>{p.minutes}</span><b>{p.valuation}</b></div>)}</div></>:<div className="lab-native-unavailable">Las estadísticas colectivas comparadas todavía no están disponibles para esta competencia.</div>}
  <footer className="lab-native-footer"><b>LNA</b><strong>ESTADÍSTICAS DEL PARTIDO</strong></footer>
 </div>;
}

function MatchCard({match,onOpen}) {
 const finished=match.status==="finished", live=match.status==="live", review=match.status==="needs_review";
 const Team=({team})=><div className="lab-match-team"><img src={team.crestUrl || `https://www.laliganacional.com.ar/escudos/${team.clubId}/${team.teamId}`} alt="" loading="lazy"/><span>{teamLabel(team.name)}</span></div>;
 return <button type="button" className="lab-match-card" onClick={()=>onOpen(match)}>
  <div className="lab-match-meta"><span>{dateLabel(match.date)} · {match.time || "HORARIO A CONFIRMAR"}</span><span className={finished?"lab-status is-finished":review?"lab-status is-review":"lab-status"}>{finished?"FINAL":live?"EN VIVO":review?"A REVISAR":"PROGRAMADO"}</span></div>
  <div className="lab-match-scoreline"><Team team={match.homeTeam}/><strong className={finished?"lab-score is-final":"lab-score"}>{finished||live?`${match.homeScore ?? "—"} - ${match.awayScore ?? "—"}`:"VS"}</strong><Team team={match.awayTeam}/></div>
  <div className="lab-match-venue">{match.venue || "Estadio a confirmar"}<span>Ver planilla oficial ↗</span></div>
 </button>;
}


const labTeamCrest = team => team?.teamId ? "/lab-team-logos/"+team.teamId+".webp" : team?.crestUrl || "";
const labTeamColor = labMatchColor;
const labMatchStyle = match => ({
 "--match-home-color": labTeamColor(match.homeTeam),
 "--match-away-color": labTeamColor(match.awayTeam),
 "--match-home-logo": 'url("'+labTeamCrest(match.homeTeam)+'")',
 "--match-away-logo": 'url("'+labTeamCrest(match.awayTeam)+'")'
});
const formatLeagueWeekday = date => new Intl.DateTimeFormat("es-AR",{weekday:"short",timeZone:"UTC"})
 .format(new Date(date+"T12:00:00Z")).replace(/\./g,"").toUpperCase();
const formatLeagueDate = date => new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"short",timeZone:"UTC"})
 .format(new Date(date+"T12:00:00Z")).replace(/\./g,"").toUpperCase();

export default function LigaArgentina(){
 const [section,setSection]=useState("fixture"),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const [selectedMatch,setSelectedMatch]=useState(null),[selectedUpcomingMatch,setSelectedUpcomingMatch]=useState(null),[selectedLiveMatch,setSelectedLiveMatch]=useState(null),[resultsPage,setResultsPage]=useState(null),[conference,setConference]=useState("norte");
 const [selectedTeam,setSelectedTeam]=useState(null);
 const boxscores=useLabBoxscores(Boolean(selectedTeam));
 const today=todayArgentina();
 const {liveMatches=[]}=useLiveSnapshot();
 const labLiveById=new Map(liveMatches.filter(item=>item.competition==="LAB"&&item.matchId).map(item=>[String(item.matchId),item]));
 const classified=useMemo(()=>fixture.matches.map(m=>{
  const now=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
  const future=m.date>today||(m.date===today&&m.time&&m.time>now);
  const live=labLiveById.get(String(m.id));
  return {...m,liveData:live||null,homeScore:live?.homeScore??m.homeScore,awayScore:live?.awayScore??m.awayScore,status:isLabMatchFinished(m)||(live?.status==="finished"&&hasValidLabFinalScore(live?.homeScore??m.homeScore,live?.awayScore??m.awayScore))?"finished":live?.status==="live"?"live":future?"scheduled":"needs_review"};
 }),[today,liveMatches]);
 const counts={results:classified.filter(m=>m.status==="finished").length,upcoming:classified.filter(m=>m.status==="scheduled").length,review:classified.filter(m=>m.status==="needs_review").length};
 const {todayMatches,allResults,upcomingMatches}=useMemo(()=>({
  todayMatches:classified.filter(m=>m.date===today&&(m.status==="scheduled"||m.status==="live")).sort((a,b)=>(a.time||"").localeCompare(b.time||"")),
  allResults:classified.filter(m=>m.status==="finished").sort((a,b)=>a.date!==b.date?b.date.localeCompare(a.date):(b.time||"").localeCompare(a.time||"")),
  upcomingMatches:classified.filter(m=>m.status==="scheduled"&&m.date>=today).sort((a,b)=>a.date!==b.date?a.date.localeCompare(b.date):(a.time||"").localeCompare(b.time||"")).slice(0,10)
 }),[classified,today]);
 const resultsPerPage=10,totalResultsPages=Math.ceil(allResults.length/resultsPerPage);
 const currentResultsPage=Math.min(Math.max(resultsPage??Math.max(totalResultsPages-1,0),0),Math.max(totalResultsPages-1,0));
 const results=allResults.slice((totalResultsPages-1-currentResultsPage)*resultsPerPage,(totalResultsPages-currentResultsPage)*resultsPerPage);
 const standings=useMemo(()=>{
  const rows=new Map(fixture.teams.map(t=>[t.teamId,{...t,played:0,wins:0,losses:0,pf:0,pc:0}]));
  fixture.matches.filter(isLabMatchFinished).forEach(m=>{
   const h=rows.get(m.homeTeam.teamId),a=rows.get(m.awayTeam.teamId);if(!h||!a)return;
   h.played++;a.played++;h.pf+=Number(m.homeScore);h.pc+=Number(m.awayScore);a.pf+=Number(m.awayScore);a.pc+=Number(m.homeScore);
   if(Number(m.homeScore)>Number(m.awayScore)){h.wins++;a.losses++;}else{a.wins++;h.losses++;}
  });
  return [...rows.values()].map(team=>({...team,diff:team.pf-team.pc})).sort((a,b)=>b.wins-a.wins||b.diff-a.diff||b.pf-a.pf);
 },[classified]);
 const conferenceTeams=useMemo(()=>{
  const allowed=new Set(LAB_CONFERENCES[conference]);
  return standings.filter(team=>allowed.has(team.slug));
 },[standings,conference]);
 const MatchTeam=({team,logoClass="result-logo"})=><div className="result-team"><img src={labTeamCrest(team)} alt="" className={logoClass} loading="lazy"/><span>{teamLabel(team.name)}</span></div>;
 const standingPositionClass=index=>index<4?"standing-position-direct":index<12?"standing-position-reclasificacion":index===16?"standing-position-descenso":"";
 const renderStandingRows=()=>conferenceTeams.map((team,index)=><button type="button" className="home-standing-row lab-standing-clickable" key={team.teamId} onClick={()=>setSelectedTeam(team)} aria-label={`Ver ficha de ${teamLabel(team.name)}`}>
  <span className={"standing-position "+standingPositionClass(index)}>{index+1}</span>
  <span className="home-standing-team"><img src={labTeamCrest(team)} alt="" loading="lazy"/><span>{teamLabel(team.name)}</span></span>
  <strong>{team.wins}</strong><strong>{team.losses}</strong>
 </button>);
 return <main className="league-page lab-page lab-league-page lab-home-page">
  <section className="league-content"><div className="page-container">
   <section className="league-section today-section">
    <div className="section-heading"><div><span className="section-label">HOY</span><h2 className="league-hero-title">PARTIDOS <span>DE HOY</span></h2></div></div>
    {todayMatches.length?<div className="today-matches">{todayMatches.map(match=><button key={match.id} type="button" className={`today-match-card ${match.status==="live"?"is-live":""}`} style={labMatchStyle(match)} onClick={()=>{if(match.status==="live")setSelectedLiveMatch({match,live:match.liveData});else setSelectedUpcomingMatch(match);}}>
     <div className="match-date"><span>{formatLeagueDate(match.date)}</span>{match.time&&<strong>{match.time}</strong>}</div>
     <div className="match-teams"><div className="match-team"><img src={labTeamCrest(match.homeTeam)} alt="" className="match-team-logo"/><span>{teamLabel(match.homeTeam.name)}</span></div><div className="match-vs">{match.status==="live"?<div className="lab-live-center"><span className="fixture-live-badge"><span className="fixture-live-dot"></span>EN VIVO</span><LiveLedScore home={match.homeScore ?? 0} away={match.awayScore ?? 0}/><LiveLedPeriod quarter={match.liveData?.quarter} time={formatLabLiveRemaining(match.liveData)} isHalftime={match.liveData?.isHalftime}/></div>:<span>VS</span>}</div><div className="match-team"><img src={labTeamCrest(match.awayTeam)} alt="" className="match-team-logo"/><span>{teamLabel(match.awayTeam.name)}</span></div></div>
     <div className="match-details">{match.status!=="live"&&<strong>{match.time||"A confirmar"}</strong>}{match.venue&&<span>📍 {match.venue}</span>}</div>
    </button>)}</div>:<div className="no-today-matches"><span className="no-matches-label">SIN PARTIDOS</span><h3>Hoy no hay partidos</h3><p>No hay encuentros programados para hoy.</p></div>}
   </section>
   <section className="league-columns lab-league-columns">
    <div className="league-column standings-column-section">
     <div className="section-heading"><div><span className="section-label">TEMPORADA</span><h2 className="league-hero-title">TABLA DE <span>POSICIONES</span></h2></div></div>
     <div className="home-panel standings-panel standings-card lab-conference-standings">
      <div className="home-stats-tabs lab-conference-tabs lab-league-conference-tabs" aria-label="Conferencias">
       <button type="button" className={"home-stats-tab "+(conference==="norte"?"active":"")} onClick={()=>setConference("norte")}>NORTE</button>
       <button type="button" className={"home-stats-tab "+(conference==="sur"?"active":"")} onClick={()=>setConference("sur")}>SUR</button>
      </div>
      <div className="standings-table standings-table-desktop">
       <div className="standings-table-header"><span>#</span><span>Equipo</span><span>PG</span><span>PP</span></div>
       {renderStandingRows()}
      </div>
     </div>
    </div>
    <div className="league-column">
     <div className="section-heading"><div><span className="section-label">ÚLTIMOS 10</span><div className="lab-league-results-title"><h2 className="league-hero-title">RESULTADOS</h2>
      {totalResultsPages>1&&<div className="lab-results-pagination">
       <button type="button" aria-label="Resultados anteriores" disabled={currentResultsPage===0} onClick={()=>setResultsPage(currentResultsPage-1)}>‹</button><span>{currentResultsPage+1}/{totalResultsPages}</span>
       <button type="button" aria-label="Resultados más recientes" disabled={currentResultsPage===totalResultsPages-1} onClick={()=>setResultsPage(currentResultsPage+1)}>›</button>
      </div>}
     </div></div></div>
     <div className="results-card">{results.length?results.map(match=><button key={match.id} type="button" className="result-match" style={labMatchStyle(match)} onClick={()=>{if(hasValidLabFinalScore(match.homeScore,match.awayScore))setSelectedMatch(match);else setSelectedUpcomingMatch(match);}}>
      <div className="result-date"><span className="league-card-weekday">{formatLeagueWeekday(match.date)}</span><span>{formatLeagueDate(match.date)}</span></div>
      <div className="result-teams"><MatchTeam team={match.homeTeam}/><div className="result-score"><strong className={Number(match.homeScore)>Number(match.awayScore)?"league-score-winner":""}>{match.homeScore}</strong><span>-</span><strong className={Number(match.awayScore)>Number(match.homeScore)?"league-score-winner":""}>{match.awayScore}</strong></div><div className="result-team away"><span>{teamLabel(match.awayTeam.name)}</span><img src={labTeamCrest(match.awayTeam)} alt="" className="result-logo" loading="lazy"/></div></div>
     </button>):<div className="column-empty">No hay resultados registrados.</div>}</div>
    </div>
    <div className="league-column">
     <div className="section-heading"><div><span className="section-label">PRÓXIMOS 10</span><h2 className="league-hero-title">PRÓXIMOS <span>PARTIDOS</span></h2></div></div>
     <div className="upcoming-card">{upcomingMatches.length?upcomingMatches.map(match=><button key={match.id} type="button" className="upcoming-match" style={labMatchStyle(match)} onClick={()=>setSelectedUpcomingMatch(match)}>
      <div className="upcoming-date"><small className="league-card-weekday">{formatLeagueWeekday(match.date)}</small><span>{formatLeagueDate(match.date)}</span><strong>{match.time||"A confirmar"}</strong></div>
      <div className="upcoming-teams"><div><img src={labTeamCrest(match.homeTeam)} alt="" className="upcoming-logo" loading="lazy"/><span>{teamLabel(match.homeTeam.name)}</span></div><span className="upcoming-vs">VS</span><div><span>{teamLabel(match.awayTeam.name)}</span><img src={labTeamCrest(match.awayTeam)} alt="" className="upcoming-logo" loading="lazy"/></div></div>
     </button>):<div className="column-empty">No hay próximos partidos programados.</div>}</div>
    </div>
   </section>
   <p className="lab-source">Fixture y planillas: <a href="https://www.laliganacional.com.ar/laligaargentina/fixture" target="_blank" rel="noreferrer">sitio oficial de Liga Argentina ↗</a>.</p>
  </div></section>
   {selectedTeam&&createPortal(<div className="home-modal-overlay" onClick={()=>setSelectedTeam(null)}><div className="home-team-modal home-team-modal-v2" role="dialog" aria-modal="true" aria-label={teamLabel(selectedTeam.name)} onClick={event=>event.stopPropagation()}>
    <header className="team-v2-hero"><img className="team-v2-watermark" src={labTeamCrest(selectedTeam)} alt="" aria-hidden="true"/><button type="button" className="home-modal-close team-v2-close" onClick={()=>setSelectedTeam(null)} aria-label="Cerrar">×</button><div className="team-v2-identity"><div className="team-v2-crest"><img src={labTeamCrest(selectedTeam)} alt=""/></div><div><span>LIGA ARGENTINA 2026/27</span><h2>{teamLabel(selectedTeam.name)} <span className="team-v2-record">({selectedTeam.wins}-{selectedTeam.losses})</span></h2><p>Conferencia {conference==="norte"?"Norte":"Sur"}</p></div></div></header>
    <div className="team-v2-body">
     {(()=>{const games=classified.filter(m=>m.status==="finished"&&(m.homeTeam.teamId===selectedTeam.teamId||m.awayTeam.teamId===selectedTeam.teamId));const totals={points:0,pointsAgainst:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0};const shots={fieldGoals:[0,0],twoPointers:[0,0],threePointers:[0,0],freeThrows:[0,0]};let n=0;games.forEach(g=>{const home=g.homeTeam.teamId===selectedTeam.teamId,cmp=boxscores?.[g.id]?.teamComparison?.[home?"home":"away"];if(!cmp)return;n++;totals.points+=Number(home?g.homeScore:g.awayScore)||0;totals.pointsAgainst+=Number(home?g.awayScore:g.homeScore)||0;Object.keys(totals).filter(k=>!["points","pointsAgainst"].includes(k)).forEach(k=>totals[k]+=Number(cmp[k])||0);Object.keys(shots).forEach(k=>{shots[k][0]+=Number(cmp[k]?.made)||0;shots[k][1]+=Number(cmp[k]?.attempted)||0;});});const metrics=[["PTS/P","points"],["REC/P","pointsAgainst"],["REB/P","rebounds"],["AST/P","assists"],["RECUP/P","steals"],["TAP/P","blocks"],["PÉRD/P","turnovers"],["FALTAS/P","fouls"]];return <section className="team-v2-section team-v2-collective-section"><div className="team-v2-section-head"><h3>ESTADÍSTICAS COLECTIVAS</h3><span className="team-v2-official-count">{n} PJ con datos</span></div><div className="team-v2-collective-grid">{metrics.map(([l,k])=><div className="team-v2-collective-item" key={k}><span>{l}</span><strong>{n?(totals[k]/n).toFixed(1):"—"}</strong></div>)}</div><div className="team-v2-collective-shooting">{[["TC","fieldGoals"],["T2","twoPointers"],["T3","threePointers"],["TL","freeThrows"]].map(([l,k])=><div className="team-v2-collective-item" key={k}><span>{l}</span><strong>{shots[k][1]?(100*shots[k][0]/shots[k][1]).toFixed(1)+"%":"—"}</strong></div>)}</div></section>;})()}
     {(()=>{const m=classified.filter(g=>g.status!=="finished"&&(g.homeTeam.teamId===selectedTeam.teamId||g.awayTeam.teamId===selectedTeam.teamId)&&g.date>=today).sort((a,b)=>(a.date+" "+(a.time||"")).localeCompare(b.date+" "+(b.time||"")))[0];return m?<section className="team-v2-section"><div className="team-v2-section-head"><h3>PRÓXIMO PARTIDO</h3><Link to="/liga" onClick={()=>setSelectedTeam(null)}>Ver fixture completo →</Link></div><button type="button" className="team-v2-next" onClick={()=>{setSelectedTeam(null);setSelectedUpcomingMatch(m);}}><div><img src={labTeamCrest(m.homeTeam)} alt=""/><strong>{teamLabel(m.homeTeam.name)}</strong></div><div className="team-v2-next-center"><span>{formatLeagueDate(m.date)}</span><strong>{m.time||"A confirmar"}</strong><span>{m.tv?.join(" · ")||"Transmisión a confirmar"}</span></div><div><img src={labTeamCrest(m.awayTeam)} alt=""/><strong>{teamLabel(m.awayTeam.name)}</strong></div></button></section>:null;})()}
     <section className="team-v2-section"><div className="team-v2-section-head"><h3>ÚLTIMOS 2 PARTIDOS</h3><span>Resultados oficiales</span></div><div className="team-v2-recent">{classified.filter(g=>g.status==="finished"&&(g.homeTeam.teamId===selectedTeam.teamId||g.awayTeam.teamId===selectedTeam.teamId)).sort((a,b)=>(b.date+" "+(b.time||"")).localeCompare(a.date+" "+(a.time||""))).slice(0,2).map(g=>{const home=g.homeTeam.teamId===selectedTeam.teamId,won=Number(home?g.homeScore:g.awayScore)>Number(home?g.awayScore:g.homeScore);return <button type="button" key={g.id} onClick={()=>{setSelectedTeam(null);setSelectedMatch(g);}}><span className="team-v2-date">{formatLeagueDate(g.date)}</span><div className="team-v2-result"><img src={labTeamCrest(g.homeTeam)} alt=""/><strong>{g.homeScore} - {g.awayScore}</strong><img src={labTeamCrest(g.awayTeam)} alt=""/></div><span className={won?"team-v2-win":"team-v2-loss"}>{won?"VICTORIA":"DERROTA"}</span></button>;})}</div></section>
     <section className="team-v2-section"><div className="team-v2-section-head"><h3>JUGADORES DESTACADOS</h3><span>Promedios de temporada</span></div><div className="team-v2-players">{[["PUNTOS","points","PTS"],["REBOTES","rebounds","REB"],["ASISTENCIAS","assists","AST"]].map(([label,key,unit])=><div className="team-v2-player-category" key={key}><h4>{label}</h4>{Object.values(rosters.teams||{}).flatMap(t=>t.players||[]).filter(p=>Number(p.teamId)===Number(selectedTeam.teamId)&&Number(p.gamesPlayed)>0&&Number.isFinite(Number(p.averages?.[key]))).sort((a,b)=>Number(b.averages[key])-Number(a.averages[key])).slice(0,2).map(p=><div className="team-v2-player-entry" key={p.id}><span>{p.name}</span><strong>{Number(p.averages[key]).toFixed(1)} {unit}</strong></div>)}</div>)}</div></section>
     <Link className="team-v2-full-link" to={"/equipos/"+selectedTeam.teamId} onClick={()=>setSelectedTeam(null)}>Ver equipo completo →</Link>
    </div><div className="home-team-modal-footer"><span>LNA</span><strong>LAB</strong></div>
   </div></div>,document.body)}
  {selectedMatch&&<LabHomeBoxscore match={selectedMatch} onClose={()=>setSelectedMatch(null)}/>}
  {selectedUpcomingMatch&&<LabUpcomingMatchModal match={selectedUpcomingMatch} onClose={()=>setSelectedUpcomingMatch(null)}/>}
  {selectedLiveMatch&&<LabLiveMatchModal match={selectedLiveMatch.match} live={selectedLiveMatch.live} onClose={()=>setSelectedLiveMatch(null)}/>}
 </main>;
}
