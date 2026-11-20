import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MatchStatsTabs from "../components/MatchStatsTabs";
import { Link } from "react-router-dom";
import { useLiveSnapshot } from "../hooks/useLiveSnapshot";
import LiveLedScore, { LiveLedPeriod } from "../components/LiveLedScore";
import FixtureCalendar from "../components/FixtureCalendar";
import fixture from "../../data/lab/labSchedule.json";
import rosters from "../../data/lab/labRosters.json";
import boxscores from "../../data/lab/labBoxscores.json";
import { isLabMatchFinished } from "../utils/labMatchStatus";
import { LAB_CONFERENCES, labMatchColor, formatLabLiveRemaining } from "../utils/labPresentation";
export { LAB_TEAM_COLORS } from "../utils/labPresentation";
import "./LigaArgentina.css";
import "./Home.css";
import "./HomeLigaArgentina.css";

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
export function LabHomeBoxscore({match, onClose}) {
  const box = boxscores[match.id];
  const players = box?.players || [];
  const homeTeam = { ...match.homeTeam, id: String(match.homeTeam.teamId), name: displayName(match.homeTeam.name), shortName: displayName(match.homeTeam.name), logo: labCrest(match.homeTeam) };
  const awayTeam = { ...match.awayTeam, id: String(match.awayTeam.teamId), name: displayName(match.awayTeam.name), shortName: displayName(match.awayTeam.name), logo: labCrest(match.awayTeam) };
  const homePlayers = players.filter(player => player.teamId === match.homeTeam.teamId);
  const awayPlayers = players.filter(player => player.teamId === match.awayTeam.teamId);
  const stats = { [match.homeTeam.teamId]: homePlayers, [match.awayTeam.teamId]: awayPlayers };
  const matchForTabs = { ...match, homeTeam: String(match.homeTeam.teamId), awayTeam: String(match.awayTeam.teamId) };
  const mvp = players.slice().sort((a,b) => Number(b.valuation || 0)-Number(a.valuation || 0) || Number(b.points || 0)-Number(a.points || 0))[0];
  const mvpTeam = mvp && (mvp.teamId === match.homeTeam.teamId ? homeTeam : awayTeam);
  const teamComparison = box?.teamComparison || null;
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
    .map(player=><button type="button" className="match-stat-player" key={player.id}>
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
  return createPortal(
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
  );
}


export function LabUpcomingMatchModal({match,onClose}) {
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
      const box=boxscores[game.id];
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
  return createPortal(<div className="match-modal-overlay lab-upcoming-overlay" onClick={onClose}>
    <div className="match-modal match-modal-upcoming lab-upcoming-match" onClick={event=>event.stopPropagation()}>
      <button className="match-modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="match-modal-header">
        <div className="upcoming-header-meta"><span className="match-modal-label">LIGA ARGENTINA 2026/27</span><strong className="match-modal-date">{date}</strong></div>
        <div className="match-modal-teams">
          <div className="match-modal-team"><img src={home.logo} alt=""/><strong>{home.shortName}</strong></div>
          <div className="match-modal-score"><span className="match-modal-status">PRÓXIMO PARTIDO</span><strong>{time}</strong>{match.tv?.length>0&&<span>{match.tv.join(" · ")}</span>}</div>
          <div className="match-modal-team"><img src={away.logo} alt=""/><strong>{away.shortName}</strong></div>
        </div>
      </div>
      <div className="match-modal-coaches lab-upcoming-venue"><span>ESTADIO · {match.venue||"A CONFIRMAR"}</span></div>
      <div className="upcoming-tabs lab-upcoming-tabs" role="tablist" aria-label="Información del próximo partido">
        <button type="button" role="tab" aria-selected={tab==="comparativa"} className={tab==="comparativa"?"is-active":""} onClick={()=>setTab("comparativa")}>▥ Comparativa</button>
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
        {categories.map(([title,key,icon])=>{const h=leadersFor(home.teamId,key),a=leadersFor(away.teamId,key),max=Math.max(0,...[...h,...a].map(p=>Number(p.averages[key])));const side=(items,team)=><div className="upcoming-player-side">{items.length?items.map(p=>{const value=Number(p.averages[key]);return <div className="upcoming-player-entry" key={p.id}><img className="upcoming-player-crest" src={team.logo} alt=""/><div className="upcoming-player-info"><span className="upcoming-player-name">{displayPersonName(p.name)}</span><div className="upcoming-player-meter"><span style={{width:`${max?value/max*100:0}%`}}/></div></div><strong>{fmt(value)}</strong></div>}):<span className="upcoming-player-empty">Sin datos disponibles</span>}</div>;return <div className="upcoming-player-category" key={key}><div className="upcoming-player-category-title">{title}</div><div className="upcoming-player-versus">{side(h,home)}<div className="upcoming-player-center-icon">{icon}</div>{side(a,away)}</div></div>})}
      </section>}
      <div className="match-modal-footer"><span>LNA</span><strong>PROMEDIOS DE TEMPORADA</strong></div>
    </div>
  </div>,document.body);
}

function HomeLigaArgentina() {
  const today = todayInArgentina();
  const { liveMatches = [] } = useLiveSnapshot();
  const labLiveById = useMemo(() => new Map(liveMatches.filter(item => item.competition === "LAB" && item.matchId).map(item => [String(item.matchId), item])), [liveMatches]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [statsTab, setStatsTab] = useState("posiciones");
  const [conferenceTab, setConferenceTab] = useState("norte");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);

  const data = useMemo(() => {
    const table = new Map(fixture.teams.map(team => [team.teamId, {
      ...team, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0
    }]));
    const finished = fixture.matches.filter(match =>
      match.date < today && match.homeScore != null && match.awayScore != null &&
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

    const todayGames = fixture.matches.filter(match => match.date === selectedDate)
      .sort((a,b) => (a.time || "").localeCompare(b.time || ""));
    const allDates = [...new Set(fixture.matches.map(match => match.date).filter(Boolean))].sort();
    const scorers = Object.values(rosters.teams).flatMap(team => team.players.map(player => ({
      ...player, teamName: team.name, crestUrl: labCrest(team)
    }))).filter(player => player.gamesPlayed > 0)
      .sort((a,b) => (b.averages?.points || 0) - (a.averages?.points || 0) || a.name.localeCompare(b.name, "es"))
      .slice(0,10);
    return { standings, todayGames, allDates, scorers, finishedCount: finished.length };
  }, [today, selectedDate]);

  const changeDate = direction => {
    const current = dateFromKey(selectedDate);
    current.setUTCDate(current.getUTCDate() + direction);
    setSelectedDate(current.toISOString().slice(0,10));
  };

  const Match = ({match}) => {
    const liveData = labLiveById.get(String(match.id));
    const isLive = match.status !== "finished" && liveData?.status === "live";
    const homeScore = liveData?.homeScore ?? match.homeScore;
    const awayScore = liveData?.awayScore ?? match.awayScore;
    const hasScore = !isLive && match.date < today && match.homeScore != null && match.awayScore != null &&
      !(Number(match.homeScore) === 0 && Number(match.awayScore) === 0);
    const home = data.standings.find(team => team.teamId === match.homeTeam.teamId);
    const away = data.standings.find(team => team.teamId === match.awayTeam.teamId);
    const homeIndex = data.standings.findIndex(team => team.teamId === match.homeTeam.teamId);
    const awayIndex = data.standings.findIndex(team => team.teamId === match.awayTeam.teamId);
    return <button type="button" onClick={() => { if (isLive) return; if (hasScore) setSelectedMatch(match); else setSelectedUpcomingMatch(match); }}
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
            <span className={Number(match.homeScore) > Number(match.awayScore) ? "fixture-score-winner" : "fixture-score-loser"}>{match.homeScore}</span>
            <span className="fixture-score-separator"> - </span>
            <span className={Number(match.awayScore) > Number(match.homeScore) ? "fixture-score-winner" : "fixture-score-loser"}>{match.awayScore}</span>
          </strong>
          <span>FINAL</span>
        </> : <strong className="fixture-time">{match.time || "A CONFIRMAR"}</strong>}
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
    return <div key={team.teamId} className="home-standing-row">
      <span className={`standing-position ${positionClass(position-1)}`}>{position}</span>
      <span className="home-standing-team"><img src={labCrest(team)} alt="" loading="lazy"/><span>{displayName(team.name)}</span></span>
      <strong>{team.wins}</strong><strong>{team.losses}</strong>
    </div>;
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
            {data.todayGames.length ? data.todayGames.map(match=><Match match={match} key={match.id}/>) :
              <div className="home-no-games"><span>LIGA ARGENTINA</span><h3>No hay partidos para esta fecha</h3><p>Usá las flechas para consultar otros días de la temporada.</p></div>}
          </div>

        </section>
      </div>
    </div></section>
      {selectedMatch && <LabHomeBoxscore match={selectedMatch} onClose={() => setSelectedMatch(null)}/>}
      {selectedUpcomingMatch && <LabUpcomingMatchModal match={selectedUpcomingMatch} onClose={() => setSelectedUpcomingMatch(null)}/>}
  </main>;
}
export default HomeLigaArgentina;
