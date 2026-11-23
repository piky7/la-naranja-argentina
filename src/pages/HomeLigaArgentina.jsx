import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLabBoxscores } from "../utils/labData";
import { createPortal } from "react-dom";
import MatchStatsTabs from "../components/MatchStatsTabs";
import { Link } from "react-router-dom";
import { useLiveSnapshot } from "../hooks/useLiveSnapshot";
import LiveLedScore, { LiveLedPeriod } from "../components/LiveLedScore";
import LiveMatchInfo from "../components/LiveMatchInfo";
import "../components/LiveRosters.css";
import FixtureCalendar from "../components/FixtureCalendar";
import fixture from "../../data/lab/labSchedule.json";
import rosters from "../../data/lab/labRosters.json";

import { isLabMatchFinished, hasValidLabFinalScore } from "../utils/labMatchStatus";
import { LAB_CONFERENCES, labMatchColor, formatLabLiveRemaining } from "../utils/labPresentation";
export { LAB_TEAM_COLORS, labMatchColor } from "../utils/labPresentation";
import "./LigaArgentina.css";
import "./Home.css";
import "./HomeLigaArgentina.css";
import "../components/PopupDeferredOverrides.css";
import "../components/PlayerModalSeason.css";

export const labCrest = team => {
  const id = team?.teamId || String(team?.crestUrl || "").split("/").filter(Boolean).at(-1);
  return id ? "/lab-team-logos/" + id + ".webp" : "";
};



const todayInArgentina = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const displayPersonName = name => {
  const clean = String(name || "").trim();
  if (!clean) return clean;
  return clean.toLocaleLowerCase("es-AR").replace(/(^|[\s'’\-])([\p{L}])/gu, (_, separator, letter) => separator + letter.toLocaleUpperCase("es-AR"));
};
const displayName = name => {
  const clean = String(name || "").replace(/\s+\([^)]*\)$/i, "").trim();
  if (!clean) return clean;
  const lower = clean.toLocaleLowerCase("es-AR");
  return lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
};
const dateFromKey = key => new Date(key + "T12:00:00Z");

const formatDay = key => new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC", weekday: "short", day: "2-digit", month: "short"
}).format(dateFromKey(key)).replace(/\./g, "").toUpperCase();

function LabTeamComparison({comparison, homeTeam, awayTeam}) {
  if (!comparison) return <p className="lab-team-comparison-empty">La comparativa oficial no está disponible para este partido.</p>;
  const shotText = shot => `${shot.made} / ${shot.attempted} · ${Number(shot.percentage).toFixed(0)}%`;
  const rows = [
    ['TIROS DE CAMPO', 'fieldGoals', true], ['DOBLES', 'twoPointers', true],
    ['TRIPLES', 'threePointers', true], ['LIBRES', 'freeThrows', true],
    ['REBOTES', 'rebounds'], ['ASISTENCIAS', 'assists'], ['RECUPERACIONES', 'steals'],
    ['TAPONES', 'blocks'], ['PÉRDIDAS', 'turnovers'], ['FALTAS COMETIDAS', 'fouls']
  ];
  return <section className='lab-team-comparison' style={{'--comparison-home-color':labMatchColor(homeTeam),'--comparison-away-color':labMatchColor(awayTeam)}}>
    <div className='lab-team-comparison-heading'><span>ESTADÍSTICAS COLECTIVAS OFICIALES</span><strong>COMPARATIVA DE EQUIPOS</strong></div>
    <div className='lab-team-comparison-teams'><span><img src={homeTeam.logo} alt=''/>{homeTeam.name}</span><small>LOCAL</small><span><img src={awayTeam.logo} alt=''/>{awayTeam.name}</span></div>
    <div className='lab-team-comparison-rows'>{rows.map(([label,key,isShot]) => {
      const homeValue = comparison.home[key], awayValue = comparison.away[key];
      const homeNumber = isShot ? homeValue.made : homeValue, awayNumber = isShot ? awayValue.made : awayValue;
      const max = Math.max(homeNumber, awayNumber, 1);
      const display = value => isShot ? shotText(value) : String(value);
      return <div className='lab-team-comparison-row' key={key}>
        <div className='lab-team-comparison-values'><strong>{display(homeValue)}</strong><span>{label}</span><strong>{display(awayValue)}</strong></div>
        <div className='lab-team-comparison-bars'><span className='lab-team-comparison-bar-home' style={{width: `${homeNumber / max * 100}%`}}/><span className='lab-team-comparison-bar-away' style={{width: `${awayNumber / max * 100}%`}}/></div>
      </div>;
    })}</div>
    <p>Datos extraídos directamente de la comparativa oficial publicada en el boxscore de Liga Argentina.</p>
  </section>;
}

export function LabPlayerModal({player, match, team, onClose, initialTab = "match"}) {
  const boxscores = useLabBoxscores();
  const [tab,setTab]=useState(initialTab);
  // Los promedios deben calcularse solo con partidos de la temporada del encuentro
  // desde el que se abrió la ficha. El archivo también conserva boxscores históricos.
  const seasonMatchIds = new Set(fixture.matches
    .filter(game => String(game.season || "") === String(match.season || ""))
    .map(game => String(game.id)));
  const appearances=Object.entries(boxscores||{})
    .filter(([matchId]) => seasonMatchIds.has(String(matchId)))
    .flatMap(([matchId,box])=>(Array.isArray(box?.players)?box.players:[])
      .filter(p=>String(p.id)===String(player.id)&&String(p.teamId)===String(player.teamId))
      .map(p=>({...p,__matchId:matchId})));
  const games=[...new Map(appearances.map(p=>[p.__matchId,p])).values()];
  const rosterPlayer=Object.values(rosters.teams||{}).flatMap(entry=>entry.players||[])
    .find(p=>String(p.id)===String(player.id)&&String(p.teamId)===String(player.teamId))||{};
  const mean=key=>games.length?(games.reduce((sum,p)=>sum+(Number(p[key])||0),0)/games.length).toFixed(1):"—";
  const shot=key=>{const values=games.map(p=>p[key]).filter(v=>v&&typeof v==="object"&&v.made!=null&&v.attempted!=null);const made=values.reduce((n,v)=>n+Number(v.made||0),0),attempted=values.reduce((n,v)=>n+Number(v.attempted||0),0);return {made,attempted,pct:attempted?made/attempted*100:null};};
  const minutes=games.map(p=>{const v=String(p.minutes||"");const m=v.match(/^(\d+):(\d{2})$/);return m?Number(m[1])+Number(m[2])/60:Number(v)||0;});
  const avgMinutes=minutes.length?minutes.reduce((a,b)=>a+b,0)/minutes.length:0;
  const formatMinutes=v=>{if(v==null||!Number.isFinite(v))return "—";const n=Math.round(v*60);return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
  const matchDate=new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(new Date(match.date+"T12:00:00Z"));
  const teamLogo=team.logo||labCrest(team);
  const radar=[["PTS",Number(mean("points"))||0,25],["REB",Number(mean("rebounds"))||0,12],["AST",Number(mean("assists"))||0,10],["ROB",Number(mean("steals"))||0,4]];
  const xy=(i,r)=>{const pts=[[110,68],[178,132],[110,196],[42,132]];return [110+(pts[i][0]-110)*r,132+(pts[i][1]-132)*r];};
  const radarPoints=r=>radar.map((_,i)=>xy(i,r).join(",")).join(" ");
  const radarFill=radar.map(([label,value,max],i)=>xy(i,Math.min(1,value/max)).join(",")).join(" ");
  const extra=[["REB OF","offensiveRebounds"],["REB DEF","defensiveRebounds"],["ROB","steals"],["TAP","blocks"],["PÉRD","turnovers"],["FALTAS","fouls"]];
  const shooting=[["DOBLES","twoPointers"],["TRIPLES","threePointers"],["LIBRES","freeThrows"]].map(([label,key])=>[label,shot(key)]);
  const matchShots=[["DOBLES",player.twoPointers],["TRIPLES",player.threePointers],["LIBRES",player.freeThrows]];
  return createPortal(<div className="home-modal-overlay lab-player-modal-overlay" onClick={onClose}>
    <div className="home-player-modal lab-player-modal" role="dialog" aria-modal="true" aria-label={player.name} onClick={e=>e.stopPropagation()}>
      <header className="home-player-modal-header">
        <img className="home-player-modal-watermark" src={teamLogo} alt="" aria-hidden="true"/>
        <div className="home-player-modal-logo"><img src={teamLogo} alt=""/></div>
        <div className="home-player-modal-info"><span>{player.position||rosterPlayer.position||"JUGADOR"}</span><h2>{player.name}</h2><p>{team.name}</p><small>{player.nationality||rosterPlayer.nationality||"Liga Argentina"}</small></div>
        <button type="button" className="home-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <nav className="lna-player-modal-tabs" role="tablist" aria-label="Estadísticas del jugador">
        <button type="button" role="tab" aria-selected={tab==="match"} className={tab==="match"?"active":""} onClick={()=>setTab("match")}>Este partido</button>
        <button type="button" role="tab" aria-selected={tab==="season"} className={tab==="season"?"active":""} onClick={()=>setTab("season")}>Promedios temporada</button>
      </nav>
      {tab==="match"?<section className="lna-player-match-panel">
        <div className="lna-player-match-context"><span>ESTADÍSTICAS DEL PARTIDO · {matchDate}</span><strong>{match.homeTeam.name}<em>{match.homeScore} - {match.awayScore}</em>{match.awayTeam.name}</strong></div>
        <div className="lna-player-match-main">{[["PTS",player.points],["REB",player.rebounds],["AST",player.assists],["VAL",player.valuation],["MIN",player.minutes]].map(([label,value])=><div key={label} className={label==="PTS"?"is-primary":""}><strong>{value??"—"}</strong><span>{label}</span></div>)}</div>
        <span className="home-player-modal-label">PLANILLA COMPLETA</span>
        <div className="lna-player-match-extra">{[...extra.map(([label,key])=>[label,player[key]]),["+/-",player.plusMinus]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value??"—"}</strong></div>)}</div>
        <div className="lna-player-match-shots">{matchShots.map(([label,value])=>{const made=value?.made,attempted=value?.attempted;const rawPct=value?.percentage;const pct=rawPct!=null&&Number.isFinite(Number(rawPct))?Number(rawPct):(made!=null&&attempted!=null&&Number(attempted)>0?Number(made)/Number(attempted)*100:null);const validPct=pct!=null&&Number.isFinite(pct);return <div key={label}><span>{label}</span><strong>{made!=null&&attempted!=null?made+"/"+attempted:"—"}</strong><div className="lna-player-shot-track"><span style={{width:validPct?Math.max(0,Math.min(100,pct))+"%":"0%"}}/></div><small>{validPct?pct.toFixed(1)+"%":"Sin intentos"}</small></div>;})}</div>
      </section>:<>
        <div className="home-player-modal-details"><div><span>POSICIÓN</span><strong>{player.position||rosterPlayer.position||"—"}</strong></div><div><span>NACIONALIDAD</span><strong>{player.nationality||rosterPlayer.nationality||"—"}</strong></div><div><span>NÚMERO</span><strong>{player.number??rosterPlayer.number??"—"}</strong></div></div>
        <div className="home-player-modal-season"><span className="home-player-modal-label">ESTADÍSTICAS DE LA TEMPORADA</span><div className="home-player-modal-stats">{[["PJ",games.length],["PTS",mean("points")],["REB",mean("rebounds")],["AST",mean("assists")],["VAL",mean("valuation")],["MIN",formatMinutes(avgMinutes)]].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></div>
        <section className="lna-player-radar-section"><span className="home-player-modal-label">PERFIL ESTADÍSTICO</span><div className="lna-player-radar-content">
          <svg className="lna-player-radar-graphic" viewBox="0 45 220 175" role="img" aria-label="Perfil de puntos, rebotes, asistencias y robos">
            {[.25,.5,.75,1].map(level=><polygon key={level} points={radarPoints(level)} fill="none" stroke="#446178" strokeWidth="1"/>)}{radar.map((_,i)=>{const [x,y]=xy(i,1);return <line key={i} x1="110" y1="132" x2={x} y2={y} stroke="#446178"/>;})}
            <polygon points={radarFill} fill="#f68b2c" fillOpacity=".25" stroke="#fa9233" strokeWidth="2.8"/>{radar.map(([label],i)=>{const pos=[[110,52],[190,137],[110,216],[30,137]][i];return <text key={label} x={pos[0]} y={pos[1]} textAnchor="middle" fill="#e8f1f8" fontSize="12" fontWeight="800">{label}</text>;})}
          </svg><div className="lna-player-radar-values">{radar.map(([label,value],i)=><div key={label}><span>{label}</span><strong>{mean(["points","rebounds","assists","steals"][i])}</strong></div>)}</div>
        </div></section>
        <section className="lna-player-season-expanded"><span className="home-player-modal-label">PROMEDIOS POR PARTIDO</span><div className="lna-player-match-extra lna-player-season-extra">{extra.map(([label,key])=><div key={key}><span>{label}</span><strong>{mean(key)}</strong></div>)}</div>
          <span className="home-player-modal-label lna-player-season-shots-title">EFECTIVIDAD DE TIRO</span><div className="lna-player-shot-bars">{shooting.map(([label,s])=><div className="lna-player-shot-bar-row" key={label}><span className="lna-player-shot-bar-label">{label}</span><div className="lna-player-shot-bar-track"><span style={{width:s.pct==null?"0%":Math.min(100,s.pct)+"%"}}/></div><strong>{s.pct==null?"—":s.pct.toFixed(1)+"%"}</strong><small>{s.attempted?s.made+"/"+s.attempted:"S/D"}</small></div>)}</div></section>
      </>}
      <footer className="home-player-modal-footer"><span>LIGA ARGENTINA 2026/27</span><strong>{team.name}</strong></footer>
    </div>
  </div>,document.body);
}

export function LabHomeBoxscore({match, onClose}) {
  const boxscores = useLabBoxscores();
  const box = boxscores?.[match.id];
  const players = box?.players || [];
  const homeTeam = { ...match.homeTeam, id: String(match.homeTeam.teamId), name: displayName(match.homeTeam.name), shortName: displayName(match.homeTeam.name), logo: labCrest(match.homeTeam) };
  const awayTeam = { ...match.awayTeam, id: String(match.awayTeam.teamId), name: displayName(match.awayTeam.name), shortName: displayName(match.awayTeam.name), logo: labCrest(match.awayTeam) };
  const homePlayers = players.filter(player => Number(player.teamId) === Number(match.homeTeam.teamId));
  const awayPlayers = players.filter(player => Number(player.teamId) === Number(match.awayTeam.teamId));
  const stats = { [match.homeTeam.teamId]: homePlayers, [match.awayTeam.teamId]: awayPlayers };
  const matchForTabs = { ...match, homeTeam: String(match.homeTeam.teamId), awayTeam: String(match.awayTeam.teamId) };
  const mvp = players.slice().sort((a,b) => Number(b.valuation || 0)-Number(a.valuation || 0) || Number(b.points || 0)-Number(a.points || 0))[0];
  const mvpTeam = mvp && (Number(mvp.teamId) === Number(match.homeTeam.teamId) ? homeTeam : awayTeam);
  const teamComparison = box?.teamComparison || null;
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [dateYear,dateMonth,dateDay] = String(match.date).split("-").map(Number);
  const dateObject = new Date(dateYear,dateMonth-1,dateDay);
  const weekdays = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const date = `${weekdays[dateObject.getDay()]} ${dateDay}/${dateMonth}`;
  const formatStat = value => value == null ? "0" : value;
  const hasPlayed = player => {
    const raw = String(player.minutes ?? "").trim();
    if (!raw || raw === "—" || raw === "-") return false;
    if (/^\d+:\d+(?::\d+)?$/.test(raw)) return raw.split(":").some(part => Number(part)>0);
    const minutes = Number(raw.replace(",", "."));
    return Number.isFinite(minutes) && minutes>0;
  };
  const renderTeamRows = (teamPlayers, teamId) => teamPlayers.filter(hasPlayed).slice()
    .sort((a,b)=>Number(b.points||0)-Number(a.points||0))
    .map(player=><button type="button" className="match-stat-player" key={player.id} onClick={()=>setSelectedPlayer(player)}>
      <strong>{player.number != null && /^\d{1,3}$/.test(String(player.number).trim()) ? "#"+player.number+" · " : ""}{displayPersonName(player.name)}</strong>
      <span>{formatStat(player.points)}</span><span>{formatStat(player.rebounds)}</span>
      <span>{formatStat(player.assists)}</span><span>{player.minutes || "—"}</span>
      <span>{formatStat(player.valuation)}</span>
    </button>);
  const renderTeam = (team, teamPlayers, label) => <section className="match-stats-team">
    <div className="match-stats-team-header"><div>
      <img src={team.logo} alt=""/>
      <div><span>{label}</span><h3>{team.name}</h3></div>
    </div></div>
    <div className="match-stats-head"><span>JUGADOR</span><span>PTS</span><span>REB</span><span>AST</span><span>MIN</span><span>VAL</span></div>
    <div className="match-stats-list">{renderTeamRows(teamPlayers,team.id)}</div>
  </section>;
  return <>{createPortal(
    <div className="match-modal-overlay match-modal-finished-overlay" onClick={onClose}>
      <div className="match-modal-finished-scroll">
        <div className="match-modal match-modal-finished lab-finished-match" onClick={event=>event.stopPropagation()}>
          <button className="match-modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
          <div className="match-modal-header">
            <div className="match-finished-watermarks" aria-hidden="true"><img src={homeTeam.logo} alt=""/><img src={awayTeam.logo} alt=""/></div>
            <div className="match-finished-compact-heading">
              <span className="match-modal-label">LIGA ARGENTINA 2026/27</span>
              <div className="match-finished-date-status"><strong className="match-modal-date">{date}</strong><span className="match-finished-heading-dot">•</span><span className="match-modal-status">FINAL</span></div>
            </div>
            <div className="match-modal-teams">
              <div className="match-modal-team"><img src={homeTeam.logo} alt=""/><strong>{homeTeam.shortName}</strong></div>
              <div className="match-modal-score"><strong>
                <span className={Number(match.homeScore)>Number(match.awayScore)?"match-score-winner":"match-score-loser"}>{match.homeScore}</span>
                <span className="match-score-dash"> - </span>
                <span className={Number(match.awayScore)>Number(match.homeScore)?"match-score-winner":"match-score-loser"}>{match.awayScore}</span>
              </strong></div>
              <div className="match-modal-team"><img src={awayTeam.logo} alt=""/><strong>{awayTeam.shortName}</strong></div>
            </div>
          </div>
          {mvp && <div className="match-desktop-summary">
            <div className="match-mvp-card" style={{"--mvp-team-color":labMatchColor(mvpTeam)}}>
              <span className="match-mvp-heading">♛ JUGADOR DEL PARTIDO</span>
              <span className="match-mvp-body">
                <span className="match-mvp-identity"><img src={mvpTeam.logo} alt=""/><span className="match-mvp-name"><strong>{displayPersonName(mvp.name)}</strong><small>{mvpTeam.name}</small></span></span>
                <span className="match-mvp-numbers">
                  <span><strong>{formatStat(mvp.points)}</strong><small>PTS</small></span>
                  <span><strong>{formatStat(mvp.rebounds)}</strong><small>REB</small></span>
                  <span><strong>{formatStat(mvp.assists)}</strong><small>AST</small></span>
                  <span><strong>{mvp.minutes || "—"}</strong><small>MIN</small></span>
                  <span className="match-mvp-valuation"><strong>{formatStat(mvp.valuation)}</strong><small>VAL</small></span>
                </span>
              </span>
            </div>
          </div>}
          {players.length ? <>
            <MatchStatsTabs match={matchForTabs} stats={stats} home={homeTeam} away={awayTeam}
              customTeamComparison={<LabTeamComparison comparison={teamComparison} homeTeam={homeTeam} awayTeam={awayTeam}/>}
              teamColors={{[match.homeTeam.teamId]:labMatchColor(match.homeTeam),[match.awayTeam.teamId]:labMatchColor(match.awayTeam)}}
              competitionLabel="LIGA ARGENTINA">
            <div className="match-modal-content">
              {renderTeam(homeTeam,homePlayers,"LOCAL")}
              {renderTeam(awayTeam,awayPlayers,"VISITANTE")}
            </div>
            </MatchStatsTabs>
          </> : <div className="match-modal-no-stats"><span>📊</span><h3>Estadísticas no disponibles</h3><p>La planilla detallada de este partido todavía no fue cargada.</p></div>}
          <div className="match-modal-footer"><span>LNA</span><strong>ESTADÍSTICAS DEL PARTIDO</strong></div>
        </div>
      </div>
    </div>, document.body
  )}{selectedPlayer&&<LabPlayerModal player={selectedPlayer} match={match} team={String(selectedPlayer.teamId)===String(match.homeTeam.teamId)?homeTeam:awayTeam} onClose={()=>setSelectedPlayer(null)}/>}</>;
}


export function LabUpcomingMatchModal({match,onClose,onNavigateTeam}) {
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const boxscores = useLabBoxscores();
  const [tab,setTab]=useState("comparativa");
  const home={...match.homeTeam,name:displayName(match.homeTeam.name),shortName:displayName(match.homeTeam.name),logo:labCrest(match.homeTeam)};
  const away={...match.awayTeam,name:displayName(match.awayTeam.name),shortName:displayName(match.awayTeam.name),logo:labCrest(match.awayTeam)};
  const date=(()=>{const [y,m,d]=String(match.date).split("-").map(Number);return new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,d,12))).replace(/\./g,"").toUpperCase()})();
  const completed=fixture.matches.filter(isLabMatchFinished);
  const metrics=[["Puntos","points"],["Puntos recibidos","pointsAgainst"],["Rebotes","rebounds"],["Asistencias","assists"],["Recuperaciones","steals"],["Tapones","blocks"],["Pérdidas","turnovers"],["Faltas","fouls"],["Dobles","twoPointersPct"],["Triples","threePointersPct"],["Libres","freeThrowsPct"]];
  const aggregate=teamId=>{
    const totals={games:0,points:0,pointsAgainst:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0,twoPointersMade:0,twoPointersAttempted:0,threePointersMade:0,threePointersAttempted:0,freeThrowsMade:0,freeThrowsAttempted:0};
    completed.forEach(game=>{
      const side=Number(game.homeTeam.teamId)===Number(teamId)?"home":Number(game.awayTeam.teamId)===Number(teamId)?"away":null;
      if(!side)return;
      const box=boxscores?.[game.id];
      if(!box?.players?.length)return;
      const teamPlayers=box.players.filter(player=>Number(player.teamId)===Number(teamId));
      if(!teamPlayers.length)return;
      totals.games++;
      totals.points+=Number(side==="home"?game.homeScore:game.awayScore)||0;
      totals.pointsAgainst+=Number(side==="home"?game.awayScore:game.homeScore)||0;
      const official=box.teamComparison?.[side];
      const sum=key=>teamPlayers.reduce((n,p)=>n+(Number(p[key])||0),0);
      ["rebounds","assists","steals","blocks","turnovers","fouls"].forEach(key=>{
        totals[key]+=official?.[key]!=null?Number(official[key]):sum(key);
      });
      for(const [key,stat] of [["twoPointers","twoPointers"],["threePointers","threePointers"],["freeThrows","freeThrows"]]){
        totals[key+"Made"]+=official?.[stat]?.made!=null?Number(official[stat].made):teamPlayers.reduce((n,p)=>n+(Number(p[stat]?.made)||0),0);
        totals[key+"Attempted"]+=official?.[stat]?.attempted!=null?Number(official[stat].attempted):teamPlayers.reduce((n,p)=>n+(Number(p[stat]?.attempted)||0),0);
      }
    });
    const games=Math.max(1,totals.games);
    return {
      games:totals.games,
      points:totals.points/games,pointsAgainst:totals.pointsAgainst/games,
      rebounds:totals.rebounds/games,assists:totals.assists/games,steals:totals.steals/games,
      blocks:totals.blocks/games,turnovers:totals.turnovers/games,fouls:totals.fouls/games,
      twoPointersPct:totals.twoPointersAttempted?100*totals.twoPointersMade/totals.twoPointersAttempted:0,
      threePointersPct:totals.threePointersAttempted?100*totals.threePointersMade/totals.threePointersAttempted:0,
      freeThrowsPct:totals.freeThrowsAttempted?100*totals.freeThrowsMade/totals.freeThrowsAttempted:0
    };
  };
  const homeStats=aggregate(home.teamId),awayStats=aggregate(away.teamId);
  const colorFor=team=>labMatchColor(team);
  const recentFor=teamId=>completed.filter(game=>Number(game.homeTeam.teamId)===Number(teamId)||Number(game.awayTeam.teamId)===Number(teamId))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,2).map(game=>{
      const isHome=Number(game.homeTeam.teamId)===Number(teamId);
      const scored=Number(isHome?game.homeScore:game.awayScore)||0;
      const conceded=Number(isHome?game.awayScore:game.homeScore)||0;
      const opponent=isHome?game.awayTeam:game.homeTeam;
      return {...game,scored,conceded,opponent,result:scored>conceded?"G":"P"};
    });
  const hexRgba=(hex,alpha)=>{const value=String(hex||"#315a7b").replace("#","");const n=parseInt(value.length===3?value.split("").map(x=>x+x).join(""):value,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;};
  const homeColor=colorFor(match.homeTeam),awayColor=colorFor(match.awayTeam);
  const fmt=value=>Number.isFinite(value)?value.toFixed(1).replace(".",","):"—";
  const players=Object.values(rosters.teams||{}).flatMap(team=>(team.players||[]).map(player=>({...player,teamName:team.name})));
  const categories=[["PUNTOS","points","🏀"],["VALORACIÓN","valuation","⭐"],["REBOTES","rebounds","↟"],["ASISTENCIAS","assists","↗"]];
  const leadersFor=(teamId,key)=>players.filter(p=>Number(p.teamId)===Number(teamId)&&Number(p.gamesPlayed)>0&&Number.isFinite(Number(p.averages?.[key])))
    .sort((a,b)=>Number(b.averages[key])-Number(a.averages[key])).slice(0,2);
  const time=match.time||"A CONFIRMAR";
  return <>{createPortal(<div className="match-modal-overlay lab-upcoming-overlay" onClick={onClose}>
    <div className="match-modal match-modal-upcoming lab-upcoming-match" onClick={event=>event.stopPropagation()}>
      <button className="match-modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="match-modal-header">
        <div className="upcoming-header-meta"><span className="match-modal-label">LIGA ARGENTINA 2026/27</span><strong className="match-modal-date">{date}</strong></div>
        <div className="match-modal-teams">
          <div className="match-modal-team"><button type="button" className="home-modal-team-logo-button" onClick={()=>onNavigateTeam?.(home.teamId)} aria-label={"Ver equipo "+home.name}><img src={home.logo} alt=""/></button><strong>{home.shortName}</strong></div>
          <div className="match-modal-score"><span className="match-modal-status">PRÓXIMO PARTIDO</span><strong>{time}</strong>{match.tv?.length>0&&<span>{match.tv.join(" · ")}</span>}</div>
          <div className="match-modal-team"><button type="button" className="home-modal-team-logo-button" onClick={()=>onNavigateTeam?.(away.teamId)} aria-label={"Ver equipo "+away.name}><img src={away.logo} alt=""/></button><strong>{away.shortName}</strong></div>
        </div>
      </div>
      <div className="match-modal-coaches lab-upcoming-venue"><span>ESTADIO · {match.venue||"A CONFIRMAR"}</span></div>
      <div className="upcoming-tabs lab-upcoming-tabs" role="tablist" aria-label="Información del próximo partido">
        <button type="button" style={{width:"100%",minWidth:0,maxWidth:"none",height:"42px",minHeight:"42px",maxHeight:"42px",boxSizing:"border-box",margin:0,padding:"4px 3px",display:"flex",alignItems:"center",justifyContent:"center",whiteSpace:"nowrap",fontSize:"inherit",lineHeight:1.1}} role="tab" aria-selected={tab==="comparativa"} className={tab==="comparativa"?"is-active":""} onClick={()=>setTab("comparativa")}>▥ Comparativa</button>
        <button type="button" role="tab" aria-selected={tab==="jugadores"} className={tab==="jugadores"?"is-active":""} onClick={()=>setTab("jugadores")}>♟ Jugadores</button>
      </div>
      {tab==="comparativa"&&<section className="upcoming-tab-panel lab-upcoming-comparison">
        <div className="upcoming-team-comparison upcoming-official-comparison lab-upcoming-team-comparison" style={{"--lab-home-color":homeColor,"--lab-away-color":awayColor,"background":`linear-gradient(110deg,${hexRgba(homeColor,.24)},#0d1b2a 48%,${hexRgba(awayColor,.24)})`}}>
          <span className="upcoming-comparison-label">COMPARATIVA COLECTIVA · 2026/27</span>
          <div className="lab-upcoming-team-head"><span><img src={home.logo} alt=""/>{home.name}</span><b>VS</b><span><img src={away.logo} alt=""/>{away.name}</span></div>
          <p className="upcoming-collective-source">Promedios de temporada · {Math.round(homeStats.games)} / {Math.round(awayStats.games)} partidos</p>
          {metrics.map(([label,key])=>{const hv=homeStats[key],av=awayStats[key],lower=["pointsAgainst","turnovers","fouls"].includes(key),homeBetter=lower?hv<av:hv>av,awayBetter=lower?av<hv:av>hv,max=Math.max(hv||0,av||0,1);return <div className="lab-team-stat-row" key={key} style={{background:`linear-gradient(90deg,${hexRgba(homeColor,.14)},rgba(13,27,42,.12) 50%,${hexRgba(awayColor,.14)})`}}>
            <strong className={homeBetter?"collective-better":""}>{fmt(hv)}</strong><div className="lab-team-stat-track"><span className={homeBetter?"is-better":""} style={{width:`${Math.max(0,hv||0)/max*100}%`}}/></div><span className="lab-team-stat-label">{label}</span><div className="lab-team-stat-track"><span className={awayBetter?"is-better":""} style={{width:`${Math.max(0,av||0)/max*100}%`}}/></div><strong className={awayBetter?"collective-better":""}>{fmt(av)}</strong>
          </div>})}
          <div className="lab-upcoming-last-matches">
            <h3>ÚLTIMOS 2 PARTIDOS</h3>
            <div className="lab-upcoming-last-grid">
              {[{team:match.homeTeam,view:home,color:homeColor},{team:match.awayTeam,view:away,color:awayColor}].map(({team,view,color})=><div className="lab-upcoming-last-team" key={team.teamId} style={{background:`linear-gradient(120deg,${hexRgba(color,.24)},#101a27 80%)`,borderColor:hexRgba(color,.75)}}>
                <strong>{view.shortName}</strong>
                {recentFor(team.teamId).map(game=><div className="lab-upcoming-last-result" key={game.id}>
                  <span>{formatDay(game.date)}</span><img src={labCrest(game.opponent)} alt=""/><b>{game.scored} - {game.conceded}</b><span className={game.result==="G"?"is-win":"is-loss"}>{game.result}</span>
                </div>)}
                {!recentFor(team.teamId).length&&<p>Sin resultados recientes</p>}
              </div>)}
            </div>
          </div>
        </div>
      </section>}
      {tab==="jugadores"&&<section className="upcoming-tab-panel upcoming-players-comparison lab-upcoming-players">
        <div className="match-highlighted-title"><h3>JUGADORES DESTACADOS</h3><span className="upcoming-highlighted-subtitle">PROMEDIOS DE TEMPORADA 2026/27</span></div>
        {categories.map(([title,key,icon])=>{const h=leadersFor(home.teamId,key),a=leadersFor(away.teamId,key),max=Math.max(0,...[...h,...a].map(p=>Number(p.averages[key])));const side=(items,team)=><div className="upcoming-player-side">{items.length?items.map(p=>{const value=Number(p.averages[key]);return <button type="button" className="upcoming-player-entry" key={p.id} onClick={()=>setSelectedPlayer({...p,teamId:team.teamId})} aria-label={"Ver ficha de "+p.name}><img className="upcoming-player-crest" src={team.logo} alt=""/><div className="upcoming-player-info"><span className="upcoming-player-name">{displayPersonName(p.name)}</span><div className="upcoming-player-meter"><span style={{width:`${max?value/max*100:0}%`}}/></div></div><strong>{fmt(value)}</strong></button>}):<span className="upcoming-player-empty">Sin datos disponibles</span>}</div>;return <div className="upcoming-player-category" key={key}><div className="upcoming-player-category-title">{title}</div><div className="upcoming-player-versus">{side(h,home)}<div className="upcoming-player-center-icon">{icon}</div>{side(a,away)}</div></div>})}
      </section>}
      <div className="match-modal-footer"><span>LNA</span><strong>PROMEDIOS DE TEMPORADA</strong></div>
    </div>
  </div>,document.body)}{selectedPlayer&&<LabPlayerModal player={selectedPlayer} match={match} team={String(selectedPlayer.teamId)===String(match.homeTeam.teamId)?home:away} initialTab="season" onClose={()=>setSelectedPlayer(null)}/>}</>;
}

export function LabLiveMatchModal({match, live, onClose}) {
  const [tab,setTab]=useState("quintetos");
  const boxscores = useLabBoxscores(tab === "comparativa");
  const {liveMatches:latestLiveMatches=[]}=useLiveSnapshot();
  const currentLive=latestLiveMatches.find(item=>item.competition==="LAB"&&String(item.matchId)===String(match?.id))||live;
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  if(!match||!live)return null;
  const homeTeam={...match.homeTeam,id:String(match.homeTeam.teamId),name:displayName(match.homeTeam.name),shortName:displayName(match.homeTeam.name),logo:labCrest(match.homeTeam)};
  const awayTeam={...match.awayTeam,id:String(match.awayTeam.teamId),name:displayName(match.awayTeam.name),shortName:displayName(match.awayTeam.name),logo:labCrest(match.awayTeam)};
  const allLabRosterPlayers=Object.values(rosters.teams||{}).flatMap(entry=>entry.players||[]);
  const homeRoster=allLabRosterPlayers.filter(player=>String(player.teamId)===String(match.homeTeam.teamId));
  const awayRoster=allLabRosterPlayers.filter(player=>String(player.teamId)===String(match.awayTeam.teamId));
  const renderRoster=(team,list)=> <section className="live-roster-team" key={team.id}>
    <div className="live-roster-team-head"><img src={team.logo} alt=""/><strong>{team.shortName}</strong></div>
    <div className="live-roster-row live-roster-labels"><span>#</span><span>JUGADOR</span><span>PTS</span><span>REB</span><span>AST</span><span>PJ</span></div>
    {list.slice().sort((a,b)=>(Number(b.averages?.points)||0)-(Number(a.averages?.points)||0)).map(player=><button type="button" className="live-roster-row live-roster-player" key={player.id} onClick={()=>setSelectedPlayer(player)}>
      <span className="live-roster-number">{player.number??"—"}</span><span className="live-roster-name" title={player.name}>{displayPersonName(player.name)}</span>
      <span>{Number.isFinite(Number(player.averages?.points))?Number(player.averages.points).toFixed(1):"—"}</span>
      <span>{Number.isFinite(Number(player.averages?.rebounds))?Number(player.averages.rebounds).toFixed(1):"—"}</span>
      <span>{Number.isFinite(Number(player.averages?.assists))?Number(player.averages.assists).toFixed(1):"—"}</span>
      <strong>{player.gamesPlayed??"—"}</strong>
    </button>)}
    {!list.length&&<p className="live-roster-empty">Sin plantel publicado</p>}
  </section>;
  const quintets=currentLive.quintetos;
  const formatScore=value=>value==null?"—":value;
  return <>{createPortal(<div className="match-modal-overlay match-modal-live-overlay" onClick={onClose}>
    <div className="match-modal match-modal-upcoming match-modal-is-live lab-live-match-modal" role="dialog" aria-modal="true" aria-label={`Partido en vivo: ${homeTeam.name} vs ${awayTeam.name}`} onClick={e=>e.stopPropagation()}>
      <button className="match-modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="match-modal-header">
        <div className="upcoming-header-meta"><span className="match-modal-label">LIGA ARGENTINA 2026/27</span><strong className="match-modal-date">{formatDay(match.date)}</strong></div>
        <div className="match-modal-teams">
          <div className="match-modal-team"><img src={homeTeam.logo} alt=""/><strong>{homeTeam.shortName}</strong></div>
          <div className="match-modal-score">
            <span className="match-modal-status">EN VIVO · {currentLive.isHalftime?"ENTRETIEMPO":currentLive.quarter?currentLive.quarter+"° CUARTO":"PARTIDO EN JUEGO"}{!currentLive.isHalftime&&currentLive.quarter&&formatLabLiveRemaining(currentLive)!=null?<span className="match-modal-live-remaining">{formatLabLiveRemaining(currentLive)} RESTANTES</span>:null}</span>
            <strong className="lna-live-score-numbers"><span className={Number(currentLive.homeScore)>Number(currentLive.awayScore)?"is-leading":"is-trailing"}>{formatScore(currentLive.homeScore)}</span><span className="lna-live-score-dash"> - </span><span className={Number(currentLive.awayScore)>Number(currentLive.homeScore)?"is-leading":"is-trailing"}>{formatScore(currentLive.awayScore)}</span></strong>
            
          </div>
          <div className="match-modal-team"><img src={awayTeam.logo} alt=""/><strong>{awayTeam.shortName}</strong></div>
        </div>
      </div>
      {(match.homeTeam.coach||match.awayTeam.coach)&&<div className="match-modal-coaches"><div className="match-modal-coach-item"><span>DT:</span><strong>{match.homeTeam.coach||"—"}</strong></div><div className="match-modal-coach-item"><span>DT:</span><strong>{match.awayTeam.coach||"—"}</strong></div></div>}
      <LiveMatchInfo live={currentLive} homeName={homeTeam.shortName} awayName={awayTeam.shortName}/>
      <div className="upcoming-tabs upcoming-live-tabs lab-live-tabs" role="tablist" aria-label="Información del partido en vivo" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",width:"100%",boxSizing:"border-box",gap:"6px",margin:"8px 0 0",padding:0,alignItems:"stretch"}}>
        <button type="button" style={{width:"100%",minWidth:0,maxWidth:"none",height:"42px",minHeight:"42px",maxHeight:"42px",boxSizing:"border-box",margin:0,padding:"4px 3px",display:"flex",alignItems:"center",justifyContent:"center",whiteSpace:"nowrap",fontSize:"inherit",lineHeight:1.1}} role="tab" aria-selected={tab==="quintetos"} className={tab==="quintetos"?"is-active":""} onClick={()=>setTab("quintetos")}>🏀 Quintetos</button>
        <button type="button" style={{width:"100%",minWidth:0,maxWidth:"none",height:"42px",minHeight:"42px",maxHeight:"42px",boxSizing:"border-box",margin:0,padding:"4px 3px",display:"flex",alignItems:"center",justifyContent:"center",whiteSpace:"nowrap",fontSize:"inherit",lineHeight:1.1}} role="tab" aria-selected={tab==="planteles"} className={tab==="planteles"?"is-active":""} onClick={()=>setTab("planteles")}>♟ Planteles</button>
        <button type="button" role="tab" aria-selected={tab==="comparativa"} className={tab==="comparativa"?"is-active":""} onClick={()=>setTab("comparativa")}>▥ Comparativa</button>
        
      </div>
      {tab==="quintetos"&&<section className="live-five lab-live-five">
        <h3>QUINTETOS INICIALES</h3>
        {Array.isArray(quintets?.home)&&quintets.home.length===5&&Array.isArray(quintets?.away)&&quintets.away.length===5?<div className="lab-live-five-court"><div className="lab-live-five-half lab-live-five-home"><div className="lab-live-five-team"><img src={homeTeam.logo} alt=""/><strong>{homeTeam.shortName}</strong></div><div className="lab-live-five-players">{quintets.home.map((p,i)=><div className={"lab-live-five-player lab-live-five-player-"+i} key={p.officialPlayerId||p.id||i}><b>#{p.number??"—"}</b><span>{displayPersonName(p.name)}</span></div>)}</div></div><div className="lab-live-five-half lab-live-five-away"><div className="lab-live-five-team"><img src={awayTeam.logo} alt=""/><strong>{awayTeam.shortName}</strong></div><div className="lab-live-five-players">{quintets.away.map((p,i)=><div className={"lab-live-five-player lab-live-five-player-"+i} key={p.officialPlayerId||p.id||i}><b>#{p.number??"—"}</b><span>{displayPersonName(p.name)}</span></div>)}</div></div></div>:<p className="live-five-unavailable">La planilla oficial todavía no publicó los quintetos iniciales de este partido.</p>}
        <p className="live-five-source">Fuente: planilla oficial Liga Argentina</p>
      </section>}
      {tab==="planteles"&&<section className="live-rosters lab-live-rosters"><h3>PLANTELES · 2026/27</h3><div className="live-rosters-grid">{renderRoster(homeTeam,homeRoster)}{renderRoster(awayTeam,awayRoster)}</div><p className="live-five-source">Promedios oficiales de temporada · Tocá un jugador para ver su ficha</p></section>}
      {tab==="comparativa"&&<div className="lab-live-comparison"><LabTeamComparison comparison={currentLive.teamComparison||boxscores?.[match.id]?.teamComparison||null} homeTeam={homeTeam} awayTeam={awayTeam}/></div>}
      <div className="match-modal-footer"><span>LNA</span><strong>SEGUIMIENTO EN VIVO · LIGA ARGENTINA</strong></div>
    </div>
  </div>,document.body)}{selectedPlayer&&<LabPlayerModal player={selectedPlayer} match={match} team={String(selectedPlayer.teamId)===String(match.homeTeam.teamId)?homeTeam:awayTeam} onClose={()=>setSelectedPlayer(null)}/>}</>;
}


function HomeLigaArgentina() {
  const navigate = useNavigate();
  const goToLabTeam = teamId => { if (teamId == null) return; setSelectedTeam(null); setSelectedUpcomingMatch(null); navigate("/equipos/"+teamId); };
  const today = todayInArgentina();
  const { liveMatches = [] } = useLiveSnapshot();
  const labLiveById = useMemo(() => new Map(liveMatches.filter(item => item.competition === "LAB" && item.matchId).map(item => [String(item.matchId), item])), [liveMatches]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [statsTab, setStatsTab] = useState("posiciones");
  const [conferenceTab, setConferenceTab] = useState("norte");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const boxscores = useLabBoxscores(Boolean(selectedTeam));

  const data = useMemo(() => {
    const table = new Map(fixture.teams.map(team => [team.teamId, {
      ...team, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0
    }]));
    const finished = fixture.matches.filter(match =>
      match.date <= today && isLabMatchFinished(match) && match.homeScore != null && match.awayScore != null &&
      !(Number(match.homeScore) === 0 && Number(match.awayScore) === 0) &&
      Number.isFinite(Number(match.homeScore)) && Number.isFinite(Number(match.awayScore))
    );
    finished.forEach(match => {
      const home = table.get(match.homeTeam.teamId), away = table.get(match.awayTeam.teamId);
      if (!home || !away) return;
      const hs = Number(match.homeScore), as = Number(match.awayScore);
      home.played++; away.played++;
      home.pointsFor += hs; home.pointsAgainst += as;
      away.pointsFor += as; away.pointsAgainst += hs;
      if (hs > as) { home.wins++; away.losses++; }
      else if (as > hs) { away.wins++; home.losses++; }
    });
    const standings = [...table.values()].map(team => ({
      ...team, diff: team.pointsFor - team.pointsAgainst
    })).sort((a,b) => b.wins-a.wins || b.diff-a.diff || b.pointsFor-a.pointsFor);
    // La Liga Argentina tiene dos tablas independientes de 17 equipos.
    const conferenceStandings = {
      norte: standings.filter(team => LAB_CONFERENCES.norte.includes(team.slug)),
      sur: standings.filter(team => LAB_CONFERENCES.sur.includes(team.slug))
    };

    const todayGames = fixture.matches.filter(match => match.date === selectedDate)
      .sort((a,b) => (a.time || "").localeCompare(b.time || ""));
    const allDates = [...new Set(fixture.matches.map(match => match.date).filter(Boolean))].sort();
    const scorers = Object.values(rosters.teams).flatMap(team => team.players.map(player => ({
      ...player, teamName: team.name, crestUrl: labCrest(team)
    }))).filter(player => player.gamesPlayed > 0)
      .sort((a,b) => (b.averages?.points || 0) - (a.averages?.points || 0) || a.name.localeCompare(b.name, "es"))
      .slice(0,10);
    return { standings, conferenceStandings, todayGames, allDates, scorers, finishedCount: finished.length };
  }, [today, selectedDate]);

  const classified = useMemo(() => fixture.matches.map(match => ({
    ...match,
    status: isLabMatchFinished(match) ? "finished" :
      (match.date > today || (match.date === today && match.time && match.time > new Intl.DateTimeFormat("en-GB", {timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date()))) ? "scheduled" : "needs_review"
  })), [today]);

  const changeDate = direction => {
    const current = dateFromKey(selectedDate);
    current.setUTCDate(current.getUTCDate() + direction);
    setSelectedDate(current.toISOString().slice(0,10));
  };

  const Match = ({match}) => {
    const liveData = labLiveById.get(String(match.id));
    const isLive = !isLabMatchFinished(match) && liveData?.status === "live";
    const isFinished = isLabMatchFinished(match) || (liveData?.status === "finished" && hasValidLabFinalScore(liveData?.homeScore ?? match.homeScore, liveData?.awayScore ?? match.awayScore));
    const homeScore = liveData?.homeScore ?? match.homeScore;
    const awayScore = liveData?.awayScore ?? match.awayScore;
    const hasScore = !isLive && isFinished && homeScore != null && awayScore != null &&
      !(Number(homeScore) === 0 && Number(awayScore) === 0);
    const home = data.standings.find(team => team.teamId === match.homeTeam.teamId);
    const away = data.standings.find(team => team.teamId === match.awayTeam.teamId);
    const conference = LAB_CONFERENCES.norte.includes(match.homeTeam.slug) ? "norte" :
      LAB_CONFERENCES.sur.includes(match.homeTeam.slug) ? "sur" : null;
    const matchConference = conference && (
      (conference === "norte" ? LAB_CONFERENCES.norte : LAB_CONFERENCES.sur).includes(match.awayTeam.slug)
    ) ? conference : null;
    const conferenceStandings = matchConference ? data.conferenceStandings[matchConference] : data.standings;
    const homeIndex = conferenceStandings.findIndex(team => team.teamId === match.homeTeam.teamId);
    const awayIndex = conferenceStandings.findIndex(team => team.teamId === match.awayTeam.teamId);
    return <button key={match.id} type="button" onClick={() => { if (isLive) { setSelectedLiveMatch({match,live:liveData}); return; } if (hasScore) setSelectedMatch(match); else setSelectedUpcomingMatch(match); }}
      className={`home-fixture lab-home-fixture ${hasScore ? "home-fixture-finished home-fixture-clickable" : ""} ${isLive ? "home-fixture-live" : ""}`}
      style={{"--match-home-logo":`url("${labCrest(match.homeTeam)}")`,"--match-away-logo":`url("${labCrest(match.awayTeam)}")`,"--match-home-color":labMatchColor(match.homeTeam),"--match-away-color":labMatchColor(match.awayTeam)}}>
      <div className="fixture-team fixture-home">
        <div className="fixture-team-name">
          <span>{displayName(match.homeTeam.name)}</span>
          <small><b className="fixture-rank">{homeIndex + 1}°</b> <span className="fixture-record-separator">•</span> <b className="fixture-record">{home?.wins || 0}-{home?.losses || 0}</b></small>
        </div>
        <img src={labCrest(match.homeTeam)} alt="" loading="lazy"/>
      </div>
      <div className="fixture-center">
        {isLive ? <div className="lab-home-live-center">
          <span className="fixture-live-badge"><span className="fixture-live-dot"></span>EN VIVO</span>
          <LiveLedScore home={homeScore ?? 0} away={awayScore ?? 0}/>
          <LiveLedPeriod quarter={liveData?.quarter} time={formatLabLiveRemaining(liveData)} isHalftime={liveData?.isHalftime}/>
        </div> : hasScore ? <>
          <strong className="fixture-score">
            <span className={Number(homeScore) > Number(awayScore) ? "fixture-score-winner" : "fixture-score-loser"}>{homeScore}</span>
            <span className="fixture-score-separator"> - </span>
            <span className={Number(awayScore) > Number(homeScore) ? "fixture-score-winner" : "fixture-score-loser"}>{awayScore}</span>
          </strong>
          <span>FINAL</span>
        </> : <strong className="fixture-time">{match.time || "A CONFIRMAR"}</strong>}
        {matchConference && <small className="lab-fixture-conference">ZONA {matchConference.toUpperCase()}</small>}
      </div>
      <div className="fixture-team fixture-away">
        <img src={labCrest(match.awayTeam)} alt="" loading="lazy"/>
        <div className="fixture-team-name">
          <span>{displayName(match.awayTeam.name)}</span>
          <small><b className="fixture-rank">{awayIndex + 1}°</b> <span className="fixture-record-separator">•</span> <b className="fixture-record">{away?.wins || 0}-{away?.losses || 0}</b></small>
        </div>
      </div>
    </button>;
  };

  const conferenceTeams = useMemo(() => {
    const allowed = new Set(LAB_CONFERENCES[conferenceTab]);
    return data.standings.filter(team => allowed.has(team.slug));
  }, [data.standings, conferenceTab]);

  const positionClass = index => index < 4 ? "standing-position-direct" :
    index < 12 ? "standing-position-reclasificacion" : index === conferenceTeams.length - 1 ? "standing-position-descenso" : "";

  const StandingRows = ({teams, offset=0}) => teams.map((team,index) => {
    const position = offset + index + 1;
    return <button type="button" key={team.teamId} className="home-standing-row lab-standing-clickable"
      onClick={() => setSelectedTeam(team)} aria-label={`Ver ficha de ${displayName(team.name)}`}>
      <span className={`standing-position ${positionClass(position-1)}`}>{position}</span>
      <span className="home-standing-team"><img src={labCrest(team)} alt="" loading="lazy"/><span>{displayName(team.name)}</span></span>
      <strong>{team.wins}</strong><strong>{team.losses}</strong>
    </button>;
  });

  return <main className="home-page lab-home-page">
    <section className="home-content"><div className="home-container">
      <div className="home-dashboard lab-home-dashboard">
        <section className="home-panel standings-panel">
          <div className="home-panel-header"><div><span>{statsTab === "posiciones" ? "TEMPORADA" : "ESTADÍSTICAS"}</span>
            <h2 className="home-stats-hero-title">{statsTab === "posiciones" ? <>TABLA DE <span>POSICIONES</span></> : <>MÁXIMOS <span>ANOTADORES</span></>}</h2>
          </div><Link to="/liga">Ver liga →</Link></div>
          <div className="home-stats-tabs">
            <button type="button" className={`home-stats-tab ${statsTab === "posiciones" ? "active" : ""}`} onClick={()=>setStatsTab("posiciones")}>POSICIONES</button>
            <button type="button" className={`home-stats-tab ${statsTab === "anotadores" ? "active" : ""}`} onClick={()=>setStatsTab("anotadores")}>MÁXIMOS ANOTADORES</button>
          </div>
          {statsTab === "posiciones" ? <>
            <div className="home-stats-tabs lab-conference-tabs" aria-label="Conferencias">
              <button type="button" className={`home-stats-tab ${conferenceTab === "norte" ? "active" : ""}`} onClick={()=>setConferenceTab("norte")}>NORTE</button>
              <button type="button" className={`home-stats-tab ${conferenceTab === "sur" ? "active" : ""}`} onClick={()=>setConferenceTab("sur")}>SUR</button>
            </div>
            <div className="standings-table standings-table-desktop">
              <div className="standings-table-header"><span>#</span><span>Equipo</span><span>PG</span><span>PP</span></div>
              <StandingRows teams={conferenceTeams}/>
            </div>
          </> : <div className="home-scorers home-scorers-grid">
            {data.scorers.map((player,index)=><div className="home-scorer" key={player.id}>
              <span className="scorer-position">{String(index+1).padStart(2,"0")}</span>
              <div className="scorer-info"><img src={player.crestUrl} alt=""/><div className="scorer-player-data"><strong>{player.name}</strong><span>{displayName(player.teamName)}</span></div></div>
              <div className="scorer-points"><div className="scorer-average"><strong>{Number(player.averages.points).toFixed(1)}</strong><span>PTS</span></div></div>
            </div>)}
            {!data.scorers.length&&<div className="home-no-games"><span>SIN DATOS</span><p>Todavía no hay estadísticas disponibles.</p></div>}
          </div>}
        </section>

        <section className="home-panel fixture-panel">
          <div className="fixture-hero-header">
            <span className="fixture-hero-league">LIGA ARGENTINA 2026/27</span>
            <h2 className="fixture-hero-title">{selectedDate === today ? <>PARTIDOS <span>DE HOY</span></> : selectedDate < today ? <>RESULTADOS <span>DEL DÍA</span></> : <>PRÓXIMOS <span>PARTIDOS</span></>}</h2>
            <Link to="/liga" className="fixture-hero-link">Ver todos →</Link>
          </div>
          <div className="fixture-date-navigation">
            <button type="button" className="fixture-day-button" onClick={()=>changeDate(-1)} aria-label="Día anterior">‹</button>
            <FixtureCalendar selectedDate={selectedDate} onSelect={setSelectedDate}/>
            <button type="button" className="fixture-day-button" onClick={()=>changeDate(1)} aria-label="Día siguiente">›</button>
          </div>
          <div className="home-fixtures">
            {data.todayGames.length ? data.todayGames.map(match=>Match({match})) :
              <div className="home-no-games"><span>LIGA ARGENTINA</span><h3>No hay partidos para esta fecha</h3><p>Usá las flechas para consultar otros días de la temporada.</p></div>}
          </div>

        </section>
      </div>
    </div></section>

{selectedTeam&&createPortal(<div className="home-modal-overlay" onClick={()=>setSelectedTeam(null)}><div className="home-team-modal home-team-modal-v2" role="dialog" aria-modal="true" aria-label={displayName(selectedTeam.name)} onClick={event=>event.stopPropagation()}>
       <header className="team-v2-hero"><img className="team-v2-watermark" src={labCrest(selectedTeam)} alt="" aria-hidden="true"/><button type="button" className="home-modal-close team-v2-close" onClick={()=>setSelectedTeam(null)} aria-label="Cerrar">×</button><div className="team-v2-identity"><button type="button" className="team-v2-crest" onClick={()=>goToLabTeam(selectedTeam.teamId)} aria-label={"Ver equipo "+displayName(selectedTeam.name)}><img src={labCrest(selectedTeam)} alt=""/></button><div><span>LIGA ARGENTINA 2026/27</span><h2>{displayName(selectedTeam.name)} <span className="team-v2-record">({selectedTeam.wins}-{selectedTeam.losses})</span></h2><p>Conferencia {conferenceTab==="norte"?"Norte":"Sur"}</p></div></div></header>
       <div className="team-v2-body">
        {(()=>{const games=classified.filter(m=>m.status==="finished"&&(m.homeTeam.teamId===selectedTeam.teamId||m.awayTeam.teamId===selectedTeam.teamId));const totals={points:0,pointsAgainst:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0};const shots={fieldGoals:[0,0],twoPointers:[0,0],threePointers:[0,0],freeThrows:[0,0]};let n=0;games.forEach(g=>{const home=g.homeTeam.teamId===selectedTeam.teamId,cmp=boxscores?.[g.id]?.teamComparison?.[home?"home":"away"];if(!cmp)return;n++;totals.points+=Number(home?g.homeScore:g.awayScore)||0;totals.pointsAgainst+=Number(home?g.awayScore:g.homeScore)||0;Object.keys(totals).filter(k=>!["points","pointsAgainst"].includes(k)).forEach(k=>totals[k]+=Number(cmp[k])||0);Object.keys(shots).forEach(k=>{shots[k][0]+=Number(cmp[k]?.made)||0;shots[k][1]+=Number(cmp[k]?.attempted)||0;});});const metrics=[["PTS/P","points"],["REC/P","pointsAgainst"],["REB/P","rebounds"],["AST/P","assists"],["RECUP/P","steals"],["TAP/P","blocks"],["PÉRD/P","turnovers"],["FALTAS/P","fouls"]];return <section className="team-v2-section team-v2-collective-section"><div className="team-v2-section-head"><h3>ESTADÍSTICAS COLECTIVAS</h3><span className="team-v2-official-count">{n} PJ con datos</span></div><div className="team-v2-collective-grid">{metrics.map(([l,k])=><div className="team-v2-collective-item" key={k}><span>{l}</span><strong>{n?(totals[k]/n).toFixed(1):"—"}</strong></div>)}</div><div className="team-v2-collective-shooting">{[["TC","fieldGoals"],["T2","twoPointers"],["T3","threePointers"],["TL","freeThrows"]].map(([l,k])=><div className="team-v2-collective-item" key={k}><span>{l}</span><strong>{shots[k][1]?(100*shots[k][0]/shots[k][1]).toFixed(1)+"%":"—"}</strong></div>)}</div></section>;})()}
        {(()=>{const m=classified.filter(g=>g.status!=="finished"&&(g.homeTeam.teamId===selectedTeam.teamId||g.awayTeam.teamId===selectedTeam.teamId)&&g.date>=today).sort((a,b)=>(a.date+" "+(a.time||"")).localeCompare(b.date+" "+(b.time||"")))[0];return m?<section className="team-v2-section"><div className="team-v2-section-head"><h3>PRÓXIMO PARTIDO</h3><Link to="/liga" onClick={()=>setSelectedTeam(null)}>Ver fixture completo →</Link></div><button type="button" className="team-v2-next" onClick={()=>{setSelectedTeam(null);setSelectedUpcomingMatch(m);}}><div><img src={labCrest(m.homeTeam)} alt=""/><strong>{displayName(m.homeTeam.name)}</strong></div><div className="team-v2-next-center"><span>{formatDay(m.date)}</span><strong>{m.time||"A confirmar"}</strong><span>{m.tv?.join(" · ")||"Transmisión a confirmar"}</span></div><div><img src={labCrest(m.awayTeam)} alt=""/><strong>{displayName(m.awayTeam.name)}</strong></div></button></section>:null;})()}
        <section className="team-v2-section"><div className="team-v2-section-head"><h3>ÚLTIMOS 2 PARTIDOS</h3><span>Resultados oficiales</span></div><div className="team-v2-recent">{classified.filter(g=>g.status==="finished"&&(g.homeTeam.teamId===selectedTeam.teamId||g.awayTeam.teamId===selectedTeam.teamId)).sort((a,b)=>(b.date+" "+(b.time||"")).localeCompare(a.date+" "+(a.time||""))).slice(0,2).map(g=>{const home=g.homeTeam.teamId===selectedTeam.teamId,won=Number(home?g.homeScore:g.awayScore)>Number(home?g.awayScore:g.homeScore);return <button type="button" key={g.id} onClick={()=>{setSelectedTeam(null);setSelectedMatch(g);}}><span className="team-v2-date">{formatDay(g.date)}</span><div className="team-v2-result"><img src={labCrest(g.homeTeam)} alt=""/><strong>{g.homeScore} - {g.awayScore}</strong><img src={labCrest(g.awayTeam)} alt=""/></div><span className={won?"team-v2-win":"team-v2-loss"}>{won?"VICTORIA":"DERROTA"}</span></button>;})}</div></section>
        <section className="team-v2-section"><div className="team-v2-section-head"><h3>JUGADORES DESTACADOS</h3><span>Promedios de temporada</span></div><div className="team-v2-players">{[["PUNTOS","points","PTS"],["REBOTES","rebounds","REB"],["ASISTENCIAS","assists","AST"]].map(([label,key,unit])=><div className="team-v2-player-category" key={key}><h4>{label}</h4>{Object.values(rosters.teams||{}).flatMap(t=>t.players||[]).filter(p=>Number(p.teamId)===Number(selectedTeam.teamId)&&Number(p.gamesPlayed)>0&&Number.isFinite(Number(p.averages?.[key]))).sort((a,b)=>Number(b.averages[key])-Number(a.averages[key])).slice(0,2).map(p=><div className="team-v2-player-entry" key={p.id}><span>{p.name}</span><strong>{Number(p.averages[key]).toFixed(1)} {unit}</strong></div>)}</div>)}</div></section>
        <Link className="team-v2-full-link" to={"/equipos/"+selectedTeam.teamId} onClick={()=>setSelectedTeam(null)}>Ver equipo completo →</Link>
       </div><div className="home-team-modal-footer"><span>LNA</span><strong>LAB</strong></div>
      </div></div>,document.body)}
      {selectedMatch && <LabHomeBoxscore match={selectedMatch} onClose={() => setSelectedMatch(null)}/>}
      {selectedUpcomingMatch && <LabUpcomingMatchModal match={selectedUpcomingMatch} onClose={() => setSelectedUpcomingMatch(null)} onNavigateTeam={goToLabTeam}/>}
      {selectedLiveMatch && <LabLiveMatchModal match={selectedLiveMatch.match} live={selectedLiveMatch.live} onClose={() => setSelectedLiveMatch(null)}/>}
  </main>;
}
export default HomeLigaArgentina;
