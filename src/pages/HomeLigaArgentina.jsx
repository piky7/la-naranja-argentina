import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import fixture from "../../data/lab/labSchedule.json";
import rosters from "../../data/lab/labRosters.json";
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

function HomeLigaArgentina() {
  const today = todayInArgentina();
  const [selectedDate, setSelectedDate] = useState(today);
  const [statsTab, setStatsTab] = useState("posiciones");

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
    return <a className={`home-fixture lab-home-fixture ${hasScore ? "home-fixture-finished" : ""}`}
      href={match.officialUrl} target="_blank" rel="noreferrer"
      style={{"--match-home-logo":`url("${match.homeTeam.crestUrl || ""}")`,"--match-away-logo":`url("${match.awayTeam.crestUrl || ""}")`}}>
      <div className="fixture-team fixture-home">
        <div className="fixture-team-name"><span>{displayName(match.homeTeam.name)}</span>
          <small>{home ? `${home.wins}° · ${home.wins}-${home.losses}` : ""}</small></div>
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
          <small>{away ? `${away.wins}° · ${away.wins}-${away.losses}` : ""}</small></div>
      </div>
    </a>;
  };

  const positionClass = index => index < 4 ? "standing-position-direct" :
    index < 12 ? "standing-position-reclasificacion" : index >= data.standings.length - 2 ? "standing-position-descenso" : "";

  const StandingRows = ({teams, offset=0}) => teams.map((team,index) => {
    const position = offset + index + 1;
    return <a key={team.teamId} href={team.url} target="_blank" rel="noreferrer" className="home-standing-row">
      <span className={`standing-position ${positionClass(position-1)}`}>{position}</span>
      <span className="home-standing-team"><img src={team.crestUrl} alt="" loading="lazy"/><span>{displayName(team.name)}</span></span>
      <strong>{team.wins}</strong><strong>{team.losses}</strong>
    </a>;
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
            <div className="fixture-selected-date"><strong>{formatDay(selectedDate)}</strong></div>
            <button type="button" className="fixture-day-button" onClick={()=>changeDate(1)} aria-label="Día siguiente">›</button>
          </div>
          <div className="home-fixtures">
            {data.todayGames.length ? data.todayGames.map(match=><Match match={match} key={match.id}/>) :
              <div className="home-no-games"><span>LIGA ARGENTINA</span><h3>No hay partidos para esta fecha</h3><p>Usá las flechas para consultar otros días de la temporada.</p></div>}
          </div>
          <div className="lab-home-next"><div className="home-panel-header"><div><span>PRÓXIMOS ENCUENTROS</span><h2>Lo que viene</h2></div></div>
            <div className="home-fixtures">{data.allDates.filter(date=>date>today).slice(0,3).flatMap(date=>fixture.matches.filter(match=>match.date===date)).map(match=><Match match={match} key={match.id}/>)}</div>
          </div>
        </section>
      </div>
    </div></section>
  </main>;
}
export default HomeLigaArgentina;
