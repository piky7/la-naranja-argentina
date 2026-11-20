import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FixtureCalendar from "../components/FixtureCalendar";
import fixture from "../../data/lab/labSchedule.json";
import rosters from "../../data/lab/labRosters.json";
import boxscores from "../../data/lab/labBoxscores.json";
import "./LigaArgentina.css";
import "./Home.css";
import "./HomeLigaArgentina.css";

const todayInArgentina = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const displayName = name => String(name || "").replace(/\\s+\\([^)]*\\)$/i, "");
const dateFromKey = key => new Date(key + "T12:00:00Z");
const formatDay = key => new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC", weekday: "short", day: "2-digit", month: "short"
}).format(dateFromKey(key)).replace(/\\./g, "").toUpperCase();

function LabHomeBoxscore({match}) {
  const box = boxscores[match.id];
  const [side, setSide] = useState("home");
  const [tab, setTab] = useState("players");
  if (!box) return <div className="lab-boxscore-empty"><strong>Estadísticas en preparación</strong><span>La planilla individual de este partido todavía no está incorporada a LNA.</span></div>;
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const rows = box.players.filter(player => player.teamId === team.teamId).sort((a,b) => b.points-a.points);
  const mvp = box.players.slice().sort((a,b) => b.valuation-a.valuation || b.points-a.points)[0];
  const mvpTeam = mvp && (mvp.teamId === match.homeTeam.teamId ? match.homeTeam : match.awayTeam);
  const crest = team => team.crestUrl || "";
  const teamLabel = name => String(name || "").replace(/ \\((MDP|SF|CC|LR|T|VT|J)\\)/g, "");
  const date = new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"numeric",month:"numeric",timeZone:"UTC"}).format(new Date(match.date+"T12:00:00Z")).replace(/\\./g,"").toUpperCase();
  return <div className="lab-native-boxscore">
    <header className="lab-native-head"><b>LIGA ARGENTINA 2026/27</b><span>{date} <i>•</i> FINAL</span>
      <div className="lab-native-score"><div><img src={crest(match.homeTeam)} alt=""/><strong>{teamLabel(match.homeTeam.name)}</strong></div><b><em>{match.homeScore}</em> - <em>{match.awayScore}</em></b><div><img src={crest(match.awayTeam)} alt=""/><strong>{teamLabel(match.awayTeam.name)}</strong></div></div>
      <small>{match.venue || "LIGA ARGENTINA"}</small>
    </header>
    {mvp && <section className="lab-native-mvp"><label>♛ JUGADOR DESTACADO · MAYOR VALORACIÓN</label><div><img src={crest(mvpTeam)} alt=""/><strong>{mvp.name}</strong><small>{teamLabel(mvpTeam.name)}</small></div><aside>{[[mvp.points,"PTS"],[mvp.rebounds,"REB"],[mvp.assists,"AST"],[mvp.minutes,"MIN"],[mvp.valuation,"VAL"]].map(([value,label])=><b key={label}>{value}<small>{label}</small></b>)}</aside></section>}
    <nav className="lab-native-tabs"><button className={tab==="players"?"active":""} onClick={()=>setTab("players")}>Stats jugadores</button><button className={tab==="teams"?"active":""} onClick={()=>setTab("teams")}>Estadísticas equipos</button></nav>
    {tab==="players" ? <><nav className="lab-native-team-tabs">{[["home",match.homeTeam],["away",match.awayTeam]].map(([key,current])=><button key={key} className={side===key?"active":""} onClick={()=>setSide(key)}><img src={crest(current)} alt=""/>{teamLabel(current.name)}</button>)}</nav><div className="lab-native-table"><div className="lab-native-th"><b>JUGADOR</b><b>PTS</b><b>REB</b><b>AST</b><b>MIN</b><b>VAL</b></div>{rows.map(player=><div className="lab-native-tr" key={player.id}><strong>{player.number ? "#"+player.number+" · " : ""}{player.name}</strong><b>{player.points}</b><span>{player.rebounds}</span><span>{player.assists}</span><span>{player.minutes}</span><b>{player.valuation}</b></div>)}</div></> : <div className="lab-native-unavailable">Las estadísticas colectivas comparadas todavía no están disponibles para esta competencia.</div>}
    <footer className="lab-native-footer"><b>LNA</b><strong>ESTADÍSTICAS DEL PARTIDO</strong></footer>
  </div>;
}

function HomeLigaArgentina() {
  const today = todayInArgentina();
  const [selectedDate, setSelectedDate] = useState(today);
  const [statsTab, setStatsTab] = useState("posiciones");
  const [selectedMatch, setSelectedMatch] = useState(null);

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
      ...player, teamName: team.name, crestUrl: team.crestUrl
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
    const hasScore = match.date < today && match.homeScore != null && match.awayScore != null &&
      !(Number(match.homeScore) === 0 && Number(match.awayScore) === 0);
    const home = data.standings.find(team => team.teamId === match.homeTeam.teamId);
    const away = data.standings.find(team => team.teamId === match.awayTeam.teamId);
    const homeIndex = data.standings.findIndex(team => team.teamId === match.homeTeam.teamId);
    const awayIndex = data.standings.findIndex(team => team.teamId === match.awayTeam.teamId);
    return <button type="button" disabled={!hasScore} onClick={() => setSelectedMatch(match)} className={`home-fixture lab-home-fixture ${hasScore ? "home-fixture-finished" : ""}`}
      style={{"--match-home-logo":`url("${match.homeTeam.crestUrl || ""}")`,"--match-away-logo":`url("${match.awayTeam.crestUrl || ""}")`}}>
      <div className="fixture-team fixture-home">
        <div className="fixture-team-name"><span>{displayName(match.homeTeam.name)}</span>
          <small>{home ? `${homeIndex+1}° · ${home.wins}-${home.losses}` : ""}</small></div>
        <img src={match.homeTeam.crestUrl} alt="" loading="lazy"/>
      </div>
      <div className="fixture-center">
        <span>{formatDay(match.date)} · {match.time || "A CONFIRMAR"}</span>
        {hasScore ? <strong className="fixture-score">{match.homeScore} - {match.awayScore}</strong> :
          <strong className="fixture-time">{match.time || "HORARIO A CONFIRMAR"}</strong>}
        <small>{match.venue || "ESTADIO A CONFIRMAR"}</small>
      </div>
      <div className="fixture-team fixture-away">
        <img src={match.awayTeam.crestUrl} alt="" loading="lazy"/>
        <div className="fixture-team-name"><span>{displayName(match.awayTeam.name)}</span>
          <small>{away ? `${awayIndex+1}° · ${away.wins}-${away.losses}` : ""}</small></div>
      </div>
    </button>;
  };

  const positionClass = index => index < 4 ? "standing-position-direct" :
    index < 12 ? "standing-position-reclasificacion" : index >= data.standings.length - 2 ? "standing-position-descenso" : "";

  const StandingRows = ({teams, offset=0}) => teams.map((team,index) => {
    const position = offset + index + 1;
    return <div key={team.teamId} className="home-standing-row">
      <span className={`standing-position ${positionClass(position-1)}`}>{position}</span>
      <span className="home-standing-team"><img src={team.crestUrl} alt="" loading="lazy"/><span>{displayName(team.name)}</span></span>
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
            <div className="standings-table standings-table-desktop">
              <div className="standings-table-header"><span>#</span><span>Equipo</span><span>PG</span><span>PP</span></div>
              <StandingRows teams={data.standings}/>
            </div>
            <div className="standings-table-mobile">
              {[data.standings.slice(0,17),data.standings.slice(17)].map((column,i)=><div className="standings-mobile-column" key={i}>
                <div className="standings-table-header"><span>#</span><span>Equipo</span><span>PG</span><span>PP</span></div>
                <StandingRows teams={column} offset={i*17}/>
              </div>)}
            </div>
            <p className="lab-home-note">Tabla general provisoria según resultados identificados. Las zonas Norte y Sur se mostrarán cuando estén confirmadas.</p>
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
      {selectedMatch && <div className="lab-modal-backdrop" role="presentation" onClick={() => setSelectedMatch(null)}>
        <section className="lab-team-modal lab-match-modal" role="dialog" aria-modal="true" aria-label="Estadísticas del partido" onClick={event => event.stopPropagation()}>
          <button className="lab-modal-close" onClick={() => setSelectedMatch(null)} aria-label="Cerrar">×</button>
          <span className="lab-kicker">{formatDay(selectedMatch.date)} · {selectedMatch.time || "FINAL"}</span>
          <h2>{displayName(selectedMatch.homeTeam.name)} <strong>{selectedMatch.homeScore} - {selectedMatch.awayScore}</strong> {displayName(selectedMatch.awayTeam.name)}</h2>
          <p>{selectedMatch.venue || "Liga Argentina"}</p>
          <LabHomeBoxscore match={selectedMatch}/>
        </section>
      </div>}
  </main>;
}
export default HomeLigaArgentina;
