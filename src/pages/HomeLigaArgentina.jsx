import { useMemo } from "react";
import { Link } from "react-router-dom";
import fixture from "../../data/lab/labSchedule.json";
import "./Home.css";
import "./HomeLigaArgentina.css";

const todayInArgentina = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const displayName = name => name.replace(/\\s+\\((MDP|SF|CC|LR|T|VT|J|SDE|POSADAS|BB|LP|G|R|A|SN)\\)$/i, "");

function HomeLigaArgentina() {
  const today = todayInArgentina();
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
    const todayGames = fixture.matches.filter(match => match.date === today)
      .sort((a,b) => (a.time || "").localeCompare(b.time || ""));
    const nextGames = fixture.matches.filter(match => match.date > today)
      .sort((a,b) => (a.date+" "+(a.time||"")).localeCompare(b.date+" "+(b.time||""))).slice(0,5);
    return { standings, todayGames, nextGames, finishedCount: finished.length };
  }, [today]);

  const formatDate = date => new Date(date+"T12:00:00").toLocaleDateString("es-AR", {
    weekday:"short", day:"2-digit", month:"short"
  }).toUpperCase().replace(".", "");

  const Match = ({match}) => {
    const hasScore = match.date < today && match.homeScore != null && match.awayScore != null &&
      !(Number(match.homeScore) === 0 && Number(match.awayScore) === 0);
    return <a className={`home-fixture ${hasScore ? "home-fixture-finished" : ""} lab-home-fixture`}
      href={match.officialUrl} target="_blank" rel="noreferrer">
      <div className="fixture-team fixture-home">
        <div className="fixture-team-name"><span>{displayName(match.homeTeam.name)}</span></div>
        <img src={match.homeTeam.crestUrl} alt="" loading="lazy"/>
      </div>
      <div className="fixture-center">
        <span>{formatDate(match.date)} · {match.time || "A CONFIRMAR"}</span>
        {hasScore ? <strong className="fixture-score">{match.homeScore} - {match.awayScore}</strong> :
          <strong className="fixture-time">{match.time || "HORARIO A CONFIRMAR"}</strong>}
        <small>{match.venue || "ESTADIO A CONFIRMAR"}</small>
      </div>
      <div className="fixture-team fixture-away">
        <img src={match.awayTeam.crestUrl} alt="" loading="lazy"/>
        <div className="fixture-team-name"><span>{displayName(match.awayTeam.name)}</span></div>
      </div>
    </a>;
  };

  return <main className="home-page lab-home-page">
    <div className="home-content"><div className="home-container">
      <div className="lab-home-heading">
        <div><span>LIGA ARGENTINA · TEMPORADA 2026/27</span><h1>LIGA <strong>ARGENTINA</strong></h1>
          <p>Fixture, resultados y posiciones de los 34 clubes de la segunda categoría.</p></div>
        <img src="/tournament-logos/lab.svg" alt="Liga Argentina"/>
      </div>
      <div className="home-dashboard lab-home-dashboard">
        <section className="home-panel standings-panel">
          <div className="home-panel-header"><div><span>TEMPORADA 2026/27</span><h2>Posiciones</h2></div><Link to="/liga">Ver tabla</Link></div>
          <div className="standings-table">
            <div className="standings-table-header"><span>#</span><span>Equipo</span><span>PG</span><span>PP</span></div>
            {data.standings.slice(0,10).map((team,index)=><a className="home-standing-row" href={team.url} target="_blank" rel="noreferrer" key={team.teamId}>
              <span className="home-standing-position">{index+1}</span>
              <span className="home-standing-team"><img src={team.crestUrl} alt="" loading="lazy"/><span>{displayName(team.name)}</span></span>
              <strong>{team.wins}</strong><strong>{team.losses}</strong>
            </a>)}
          </div>
          <p className="lab-home-note">Tabla general provisoria según resultados identificados. Las zonas Norte y Sur se mostrarán cuando estén confirmadas.</p>
        </section>
        <section className="home-panel fixture-panel">
          <div className="home-panel-header"><div><span>COMPETENCIA 2026/27</span><h2>Partidos de hoy</h2></div><Link to="/liga">Ver fixture</Link></div>
          <div className="home-fixtures">
            {data.todayGames.length ? data.todayGames.map(match=><Match match={match} key={match.id}/>) :
              <div className="home-no-games"><span>LIGA ARGENTINA</span><h3>Hoy no hay partidos programados</h3><p>Consultá los próximos encuentros de la competencia.</p></div>}
          </div>
          {data.nextGames.length>0&&<div className="lab-home-next"><div className="home-panel-header"><div><span>PRÓXIMOS ENCUENTROS</span><h2>Lo que viene</h2></div></div><div className="home-fixtures">{data.nextGames.slice(0,3).map(match=><Match match={match} key={match.id}/>)}</div></div>}
        </section>
        <section className="home-panel lab-home-teams">
          <div className="home-panel-header"><div><span>LOS CLUBES</span><h2>Equipos</h2></div><Link to="/equipos">Ver todos</Link></div>
          {data.standings.slice(0,8).map(team=><a className="lab-home-team" href={team.url} target="_blank" rel="noreferrer" key={team.teamId}><img src={team.crestUrl} alt="" loading="lazy"/><span>{displayName(team.name)}</span><strong>{team.wins} PG</strong></a>)}
        </section>
      </div>
    </div></div>
  </main>;
}
export default HomeLigaArgentina;
