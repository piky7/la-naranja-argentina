import { createPortal } from "react-dom";
import PlayerModal from "../components/PlayerModal";
import MatchStatsTabs from "../components/MatchStatsTabs";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { teams } from "../data/teams";
import { matches as baseMatches } from "../data/matches";
import { matchResults } from "../data/matchResults";
import { matchPlayerStats } from "../data/matchStats";
import { players } from "../data/players";
import { playerStats } from "../data/stats";
import { getOfficialValuation } from "../utils/getOfficialValuation";
import "./Liga.css";
import "./Home.css";
const matches = baseMatches.map((match) => {
  const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const result = matchResults[key] ?? matchResults[match.id];

  return result ? { ...match, ...result } : match;
});
function getUpcomingOfficialCollective(teamId) {
  const keys = ["rebounds", "assists", "steals", "blocks", "turnovers", "fouls"];
  const shooting = ["fieldGoals", "twoPointers", "threePointers", "freeThrows"];
  const totals = Object.fromEntries(keys.map(key => [key, 0]));
  const shots = Object.fromEntries(shooting.map(key => [key, { made: 0, attempted: 0 }]));
  const seen = new Set();
  let games = 0, points = 0, pointsAgainst = 0;
  for (const match of matches) {
    if (match.status !== "finished" || !/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
    if (match.homeTeam !== teamId && match.awayTeam !== teamId) continue;
    const matchKey = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(matchKey)) continue;
    const record = matchPlayerStats[match.id] || matchPlayerStats[matchKey];
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
    const collective = record.teamStats?.[teamId];
    if (!collective || !keys.every(key => Number.isFinite(Number(collective[key]))) ||
      !shooting.every(key => Number.isFinite(Number(collective[key]?.made)) &&
        Number.isFinite(Number(collective[key]?.attempted)) &&
        Number(collective[key].attempted) >= Number(collective[key].made))) continue;
    const score = match.homeTeam === teamId ? match.homeScore : match.awayScore;
    const conceded = match.homeTeam === teamId ? match.awayScore : match.homeScore;
    if (score == null || conceded == null || !Number.isFinite(Number(score)) || !Number.isFinite(Number(conceded))) continue;
    seen.add(matchKey);
    games++;
    points += Number(score);
    pointsAgainst += Number(conceded);
    keys.forEach(key => { totals[key] += Number(collective[key]); });
    shooting.forEach(key => {
      shots[key].made += Number(collective[key].made);
      shots[key].attempted += Number(collective[key].attempted);
    });
  }
  if (!games) return { games: 0, values: {} };
  const values = { points: points / games, pointsAgainst: pointsAgainst / games };
  keys.forEach(key => { values[key] = totals[key] / games; });
  shooting.forEach(key => { values[key] = shots[key].attempted ? 100 * shots[key].made / shots[key].attempted : null; });
  return { games, values };
}

function Liga() {
  const getLocalDate = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getLocalDate();

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
const [resultsPage, setResultsPage] = useState(null);
  const getTeam = (teamId) =>
    teams.find((team) => team.id === teamId);
  const getMatchStats = (match) => {
  if (!match) return null;

  const dateKey = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const directStats = matchPlayerStats[match.id] || matchPlayerStats[dateKey];
  if (directStats) return directStats;

  if (match.officialUrl) return null;

  const teamsKey = `${match.homeTeam}-${match.awayTeam}`;
  return matchPlayerStats[teamsKey] || null;
};
  const getTeamLastTwoMatches = (teamId) => {
  return matches
    .filter(
      (match) =>
        match.status === "finished" &&
        match.homeScore != null &&
        match.awayScore != null &&
        (match.homeTeam === teamId ||
          match.awayTeam === teamId)
    )
    .sort((a, b) => {
      const dateA = `${a.date} ${a.time || "00:00"}`;
      const dateB = `${b.date} ${b.time || "00:00"}`;

      return dateB.localeCompare(dateA);
    })
    .slice(0, 2)
    .map((match) => {
      const isHome = match.homeTeam === teamId;

      const teamScore = Number(
        isHome ? match.homeScore : match.awayScore
      );

      const opponentScore = Number(
        isHome ? match.awayScore : match.homeScore
      );

      return {
        ...match,
        home: getTeam(match.homeTeam),
        away: getTeam(match.awayTeam),
        result: teamScore > opponentScore ? "G" : "P",
      };
    });
};
  const getMatchPlayerInfo = (matchPlayer) => {
  if (!matchPlayer) return null;

  const playerInfo = players.find(
    (player) => player.id === matchPlayer.id
  );

  if (!playerInfo) return null;

  return {
    ...playerInfo,
    team: getTeam(playerInfo.teamId),
    stats: playerStats.find(
      (stats) => stats.playerId === playerInfo.id
    ),
  };
};

const getPlayerLastMatches = (player) => {
  if (!player) return [];

  return matches
    .filter((match) => {
      if (match.status !== "finished") return false;

      const teamId = player.teamId;

      if (
        match.homeTeam !== teamId &&
        match.awayTeam !== teamId
      ) {
        return false;
      }

      const stats = getMatchStats(match);

      return stats?.[teamId]?.some(
        (item) => item.id === player.id
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2)
    .map((match) => {
      const stats = getMatchStats(match);

      const playerMatch = stats[player.teamId].find(
        (item) => item.id === player.id
      );

      const rivalId =
        match.homeTeam === player.teamId
          ? match.awayTeam
          : match.homeTeam;

      return {
        id: match.id,
        date: match.date,
        rival: getTeam(rivalId)?.shortName || rivalId,
        points: playerMatch.points,
        rebounds: playerMatch.rebounds,
        assists: playerMatch.assists,
      };
    });
};

  const formatDate = (date) => {
    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;
  };

  const getTeamStats = (teamId) => {
    const teamMatches = matches.filter(
      (match) =>
        (match.homeTeam === teamId ||
          match.awayTeam === teamId) &&
        match.status === "finished"
    );

    let gamesPlayed = teamMatches.length;
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    teamMatches.forEach((match) => {
      const isHome = match.homeTeam === teamId;

      const teamScore = isHome
        ? match.homeScore
        : match.awayScore;

      const opponentScore = isHome
        ? match.awayScore
        : match.homeScore;

      if (
        teamScore === null ||
        opponentScore === null
      ) {
        return;
      }

      pointsFor += teamScore;
      pointsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins++;
      } else if (teamScore < opponentScore) {
        losses++;
      }
    });

    return {
      gamesPlayed,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      difference: pointsFor - pointsAgainst,
    };
  };

  const getTeamAverages = (teamId) => {
  const stats = getTeamStats(teamId);

  if (!stats.gamesPlayed) {
    return {
      pointsFor: null,
      pointsAgainst: null,
    };
  }

  return {
    pointsFor: (
      stats.pointsFor / stats.gamesPlayed
    ).toFixed(1),

    pointsAgainst: (
      stats.pointsAgainst / stats.gamesPlayed
    ).toFixed(1),
  };
};
const getHighlightedPlayers = (teamId, stat) => {
  return players
    .filter((player) => player.teamId === teamId)
    .map((player) => ({
      ...player,
      team: getTeam(player.teamId),
      stats: playerStats.find(
        (item) => item.playerId === player.id
      ),
    }))
    .filter(
      (player) =>
        player.stats?.gamesPlayed > 0 &&
        player.stats?.[stat] != null
    )
    .sort(
      (a, b) =>
        Number(b.stats[stat]) - Number(a.stats[stat])
    )
    .slice(0, 2);
};

  const standings = useMemo(() => {
    return teams
      .map((team) => {
        const stats = getTeamStats(team.id);

        return {
          ...team,
          ...stats,
        };
      })


.sort((a, b) => {
  const percentageA = a.gamesPlayed > 0
    ? a.wins / a.gamesPlayed
    : 0;

  const percentageB = b.gamesPlayed > 0
    ? b.wins / b.gamesPlayed
    : 0;

  // 1. Mayor porcentaje de victorias
  if (Math.abs(percentageB - percentageA) > 0.000001) {
    return percentageB - percentageA;
  }

  // 2. Enfrentamientos directos
  const directMatches = matches.filter(
    (match) =>
      match.status === "finished" &&
      (
        (match.homeTeam === a.id && match.awayTeam === b.id) ||
        (match.homeTeam === b.id && match.awayTeam === a.id)
      ) &&
      match.homeScore != null &&
      match.awayScore != null
  );

  let directWinsA = 0;
  let directWinsB = 0;
  let directPointsA = 0;
  let directPointsB = 0;

  directMatches.forEach((match) => {
    const scoreA = Number(
      match.homeTeam === a.id
        ? match.homeScore
        : match.awayScore
    );

    const scoreB = Number(
      match.homeTeam === b.id
        ? match.homeScore
        : match.awayScore
    );

    if (scoreA > scoreB) directWinsA++;
    if (scoreB > scoreA) directWinsB++;

    directPointsA += scoreA;
    directPointsB += scoreB;
  });

  if (directWinsA !== directWinsB) {
    return directWinsB - directWinsA;
  }

  // 3. Diferencia de puntos entre ambos equipos
  if (
    directMatches.length > 0 &&
    directPointsA !== directPointsB
  ) {
    return directPointsB - directPointsA;
  }

  // 4. Mayor cantidad de partidos jugados
  if (b.gamesPlayed !== a.gamesPlayed) {
    return b.gamesPlayed - a.gamesPlayed;
  }

  // 5. Mejor diferencia general de puntos
  if (b.difference !== a.difference) {
    return b.difference - a.difference;
  }

  // 6. Orden alfabético
  return a.name.localeCompare(b.name, "es");
});


  }, []);

  /*
    =========================
    PARTIDOS DE HOY
    =========================
  */

  const todayMatches = matches
    .filter(
      (match) =>
        match.date === today &&
        match.status === "scheduled"
    )
    .sort((a, b) =>
      (a.time || "").localeCompare(b.time || "")
    );

  /*
    =========================
    ÚLTIMOS 10 RESULTADOS
    =========================
  */

  const allResults = matches
  .filter((match) => match.status === "finished")
  .sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    return (b.time || "").localeCompare(
      a.time || ""
    );
  });

const resultsPerPage = 10;

const totalResultsPages = Math.ceil(
  allResults.length / resultsPerPage
);

const currentResultsPage = Math.min(
  Math.max(resultsPage ?? totalResultsPages - 1, 0),
  Math.max(totalResultsPages - 1, 0)
);

const results = allResults.slice(
  (totalResultsPages - 1 - currentResultsPage) * resultsPerPage,
  (totalResultsPages - currentResultsPage) * resultsPerPage
);

  /*
    =========================
    PRÓXIMOS 10 PARTIDOS
    =========================
  */

  const upcomingMatches = matches
    .filter(
      (match) =>
        match.status === "scheduled" &&
        match.date >= today
    )
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }

      return (a.time || "").localeCompare(
        b.time || ""
      );
    })
    .slice(0, 10);

  /*
    =========================
    TABLA
    =========================
  */

  const renderStandingRow = (team, index) => {
    const position = index + 1;

    return (
      <button
        key={team.id}
        type="button"
        className="standing-row"
        onClick={() => setSelectedTeam(team)}
      >
  
<span
  className={`standing-position ${
    position <= 4
      ? "standing-position-direct"
      : position <= 12
        ? "standing-position-reclasificacion"
        : position >= 17
          ? "standing-position-descenso"
          : ""
  }`}
>
  {position}
</span>


        <span className="standing-team">
          <Link
            to={`/equipos/${team.id}`}
            className="team-logo-link"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={team.logo}
              alt={`Escudo de ${team.name}`}
              className="standing-logo"
            />
          </Link>

          <span>{team.shortName}</span>
        </span>

        <span className="standing-value">
          {team.wins}
        </span>

        <span className="standing-value">
          {team.losses}
        </span>
      </button>
    );
  };

  return (
    <main className="league-page">

     


      {/* =========================
          CONTENIDO
      ========================= */}

      <section className="league-content">
        <div className="page-container">

          {/* =========================
              PARTIDOS DE HOY
          ========================= */}

          <section className="league-section today-section">

            <div className="section-heading">
              <div>

                <span className="section-label">
                  HOY
                </span>

                <h2 className="league-hero-title">
  PARTIDOS <span>DE HOY</span>
</h2>

              </div>
            </div>


            {todayMatches.length > 0 ? (

              <div className="today-matches">

                {todayMatches.map((match) => {

                  const homeTeam =
                    getTeam(match.homeTeam);

                  const awayTeam =
                    getTeam(match.awayTeam);

                  return (
                    <button
                      key={match.id}
                      type="button"
                      className="today-match-card"
onClick={() => {
  setSelectedMatch(null);
  setSelectedUpcomingMatch(match);
}}
                    >

                      
<div className="match-date">
  <span>{formatDate(match.date)}</span>

  {match.tv?.length > 0 && (
    <span className="match-date-tv">
      📺 {match.tv.join(" · ")}
    </span>
  )}
</div>



                      <div className="match-teams">

                        <div className="match-team">

                          <Link
                            to={`/equipos/${homeTeam.id}`}
                            className="team-logo-link"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <img
                              src={homeTeam.logo}
                              alt={`Escudo de ${homeTeam.name}`}
                              className="match-team-logo"
                            />
                          </Link>

                          <span>
                            {homeTeam.shortName}
                          </span>

                        </div>

<div className="match-vs">
  
  <span>VS</span>
</div>


                        <div className="match-team">

                          <Link
                            to={`/equipos/${awayTeam.id}`}
                            className="team-logo-link"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <img
                              src={awayTeam.logo}
                              alt={`Escudo de ${awayTeam.name}`}
                              className="match-team-logo"
                            />
                          </Link>

                          <span>
                            {awayTeam.shortName}
                          </span>

                        </div>

                      </div>


                      <div className="match-details">

                        <strong>
                          {match.time ||
                            "A confirmar"}
                        </strong>

                        {match.venue && (
                          <span>
                            📍 {match.venue}
                          </span>
                        )}

                        {match.tv &&
                          match.tv.length > 0 && (
                            <span className="match-tv">
                              📺{" "}
                              {match.tv.join(
                                " · "
                              )}
                            </span>
                          )}

                      </div>

                    </button>
                  );
                })}

              </div>

            ) : (

              <div className="no-today-matches">

                <span className="no-matches-label">
                  SIN PARTIDOS
                </span>

                <h3>
                  Hoy no hay partidos
                </h3>

                <p>
                  No hay encuentros programados
                  para hoy.
                </p>

              </div>

            )}

          </section>


          {/* =========================
              TRES COLUMNAS
          ========================= */}

          <section className="league-columns">


            {/* =========================
                POSICIONES
            ========================= */}

            <div className="league-column standings-column-section">

              <div className="section-heading">
                <div>

                  <span className="section-label">
                    TEMPORADA
                  </span>

                 <h2 className="league-hero-title">
  TABLA DE <span>POSICIONES</span>
</h2>

                </div>
              </div>


              <div className="standings-card">

              <div className="league-standings-grid">
  <div className="standings-column">
    <div className="standings-header">
      <span>#</span>
      <span>Equipo</span>
      <span>PG</span>
      <span>PP</span>
    </div>

    {standings.slice(0, 9).map((team, index) =>
      renderStandingRow(team, index)
    )}
  </div>

  <div className="standings-column">
    <div className="standings-header">
      <span>#</span>
      <span>Equipo</span>
      <span>PG</span>
      <span>PP</span>
    </div>

    {standings.slice(9, 18).map((team, index) =>
      renderStandingRow(team, index + 9)
    )}
  </div>
</div>

              </div>

            </div>


            {/* =========================
                RESULTADOS
            ========================= */}

            <div className="league-column">

              <div className="section-heading">
                <div>

                  <span className="section-label">
                    ÚLTIMOS 10
                  </span>

                  
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
  }}
>
  <h2 className="league-hero-title" style={{ margin: 0 }}>
  RESULTADOS
</h2>

  {totalResultsPages > 1 && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <button
        type="button"
        aria-label="Ver resultados anteriores"
        disabled={currentResultsPage === 0}
        onClick={() =>
          setResultsPage(currentResultsPage - 1)
        }
        style={{
          background: "#22252b",
          color: currentResultsPage === 0 ? "#777" : "#ff8c00",
          border: "1px solid #444",
          borderRadius: "6px",
          width: "26px",
          height: "26px",
          cursor: currentResultsPage === 0 ? "not-allowed" : "pointer",
        }}
      >
        ‹
      </button>

      <span
        style={{
          color: "#bbb",
          fontSize: "12px",
          whiteSpace: "nowrap",
        }}
      >
        {currentResultsPage + 1}/{totalResultsPages}
      </span>

      <button
        type="button"
        aria-label="Ver resultados más recientes"
        disabled={currentResultsPage === totalResultsPages - 1}
        onClick={() =>
          setResultsPage(currentResultsPage + 1)
        }
        style={{
          background: "#22252b",
          color:
            currentResultsPage === totalResultsPages - 1
              ? "#777"
              : "#ff8c00",
          border: "1px solid #444",
          borderRadius: "6px",
          width: "26px",
          height: "26px",
          cursor:
            currentResultsPage === totalResultsPages - 1
              ? "not-allowed"
              : "pointer",
        }}
      >
        ›
      </button>
    </div>
  )}
</div>


                </div>
              </div>




              <div className="results-card">

                {results.length > 0 ? (

                  results.map((match) => {

                    const homeTeam =
                      getTeam(match.homeTeam);

                    const awayTeam =
                      getTeam(match.awayTeam);

                    return (
                      <button
                        key={match.id}
                        type="button"
                        className="result-match"
                        onClick={() =>
                          setSelectedMatch(match)
                        }
                      >

                        <div className="result-date">
                          {formatDate(
                            match.date
                          )}
                        </div>


                        <div className="result-teams">

                          <div className="result-team">

                            <Link
                              to={`/equipos/${homeTeam.id}`}
                              className="team-logo-link"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <img
                                src={homeTeam.logo}
                                alt={`Escudo de ${homeTeam.name}`}
                                className="result-logo"
                              />
                            </Link>

                            <span>
                              {homeTeam.shortName}
                            </span>

                          </div>


                          <div className="result-score">

                            <strong>
                              {match.homeScore}
                            </strong>

                            <span>
                              -
                            </span>

                            <strong>
                              {match.awayScore}
                            </strong>

                          </div>


                          <div className="result-team away">

                            <span>
                              {awayTeam.shortName}
                            </span>

                            <Link
                              to={`/equipos/${awayTeam.id}`}
                              className="team-logo-link"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <img
                                src={awayTeam.logo}
                                alt={`Escudo de ${awayTeam.name}`}
                                className="result-logo"
                              />
                            </Link>

                          </div>

                        </div>

                      </button>
                    );
                  })

                ) : (

                  <div className="column-empty">
                    No hay resultados
                    registrados.
                  </div>

                )}

              </div>



            </div>


            {/* =========================
                PRÓXIMOS
            ========================= */}

            <div className="league-column">

              <div className="section-heading">
                <div>

                  <span className="section-label">
                    PRÓXIMOS 10
                  </span>

                  <h2 className="league-hero-title">
  PRÓXIMOS <span>PARTIDOS</span>
</h2>

                </div>
              </div>


              <div className="upcoming-card">

                {upcomingMatches.length > 0 ? (

                  upcomingMatches.map(
                    (match) => {

                      const homeTeam =
                        getTeam(
                          match.homeTeam
                        );

                      const awayTeam =
                        getTeam(
                          match.awayTeam
                        );

                      return (
                        <button
                          key={match.id}
                          type="button"
                          className="upcoming-match"
                          onClick={() =>
  setSelectedUpcomingMatch(match)
}
                        >

                          <div className="upcoming-date">

                            <span>
                              {formatDate(
                                match.date
                              )}
                            </span>

                            <strong>
                              {match.time ||
                                "A confirmar"}
                            </strong>

                          </div>


                          <div className="upcoming-teams">

                            <div>

                              <Link
                                to={`/equipos/${homeTeam.id}`}
                                className="team-logo-link"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                <img
                                  src={homeTeam.logo}
                                  alt={`Escudo de ${homeTeam.name}`}
                                  className="upcoming-logo"
                                />
                              </Link>

                              <span>
                                {homeTeam.shortName}
                              </span>

                            </div>


                            <span className="upcoming-vs">
                              VS
                            </span>


                            <div>

                              <span>
                                {awayTeam.shortName}
                              </span>

                              <Link
                                to={`/equipos/${awayTeam.id}`}
                                className="team-logo-link"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                <img
                                  src={awayTeam.logo}
                                  alt={`Escudo de ${awayTeam.name}`}
                                  className="upcoming-logo"
                                />
                              </Link>

                            </div>

                          </div>

                        </button>
                      );
                    }
                  )

                ) : (

                  <div className="column-empty">
                    No hay próximos partidos
                    programados.
                  </div>

                )}

              </div>

            </div>

          </section>

        </div>
      </section>

{/* POPUP PRÓXIMO PARTIDO */}

{selectedUpcomingMatch && !selectedMatch && createPortal(
  <div
    className="match-modal-overlay"
    onClick={() => setSelectedUpcomingMatch(null)}
  >
    <div
      className="match-modal match-modal-upcoming"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="match-modal-close"
        onClick={() => setSelectedUpcomingMatch(null)}
        aria-label="Cerrar"
      >
        ×
      </button>

      <div className="match-modal-header">
        <span className="match-modal-label">
          LIGA NACIONAL 2026/27
        </span>

        <strong className="match-modal-date">
          {formatDate(selectedUpcomingMatch.date)}
        </strong>

        <span className="match-modal-status">
          PRÓXIMO PARTIDO
        </span>

        <div className="match-modal-teams">
          <div className="match-modal-team">
            <img
              src={getTeam(selectedUpcomingMatch.homeTeam)?.logo}
              alt=""
            />
            <strong>
              {getTeam(selectedUpcomingMatch.homeTeam)?.shortName}
            </strong>
          </div>

          <div className="match-modal-score">
            <strong>
              {selectedUpcomingMatch.time || "VS"}
            </strong>

            {selectedUpcomingMatch.tv?.length > 0 && (
              <span>
                {selectedUpcomingMatch.tv.join(" · ")}
              </span>
            )}
          </div>

          <div className="match-modal-team">
            <img
              src={getTeam(selectedUpcomingMatch.awayTeam)?.logo}
              alt=""
            />
            <strong>
              {getTeam(selectedUpcomingMatch.awayTeam)?.shortName}
            </strong>
          </div>
        </div>
      </div>

      <section className="match-highlighted-section">
        <div className="upcoming-team-comparison">
  <span className="upcoming-comparison-label">
    COMPARATIVA DE EQUIPOS
  </span>

  <div className="upcoming-comparison-row">
    <strong>
      {getTeam(selectedUpcomingMatch.homeTeam)?.shortName}
    </strong>
    <span>EQUIPOS</span>
    <strong>
      {getTeam(selectedUpcomingMatch.awayTeam)?.shortName}
    </strong>
  </div>

  <div className="upcoming-comparison-row">
    <strong>
      {getTeamAverages(selectedUpcomingMatch.homeTeam)
        .pointsFor ?? "—"}
    </strong>
    <span>PTS/P</span>
    <strong>
      {getTeamAverages(selectedUpcomingMatch.awayTeam)
        .pointsFor ?? "—"}
    </strong>
  </div>

  <div className="upcoming-comparison-row">
    <strong>
      {getTeamAverages(selectedUpcomingMatch.homeTeam)
        .pointsAgainst ?? "—"}
    </strong>
    <span>REC/P</span>
    <strong>
      {getTeamAverages(selectedUpcomingMatch.awayTeam)
        .pointsAgainst ?? "—"}
    </strong>
  </div>
</div>
        <div className="upcoming-last-matches">
          <h3>ÚLTIMOS 2 PARTIDOS</h3>

          <div className="upcoming-last-matches-grid">
            {[
              selectedUpcomingMatch.homeTeam,
              selectedUpcomingMatch.awayTeam,
            ].map((teamId) => (
              <div className="upcoming-last-team" key={teamId}>
                <strong>{getTeam(teamId)?.shortName}</strong>

                {getTeamLastTwoMatches(teamId).map((match) => {
                  const hasStats = Boolean(getMatchStats(match));

                  return (
                    <button
                      type="button"
                      key={match.id}
                      className="upcoming-last-result"
                      disabled={!hasStats}
                      onClick={() => setSelectedMatch(match)}
                      title={
                        hasStats
                          ? "Ver estadísticas del partido"
                          : "Estadísticas no disponibles"
                      }
                    >
                      <span>{formatDate(match.date)}</span>

                      <div className="upcoming-last-score">
                        <div className="upcoming-last-score-team">
                          {match.home?.logo && (
                            <img src={match.home.logo} alt="" />
                          )}
                          <span>{match.home?.shortName}</span>
                        </div>

                        <strong>
                          {match.homeScore} - {match.awayScore}
                        </strong>

                        <div className="upcoming-last-score-team">
                          {match.away?.logo && (
                            <img src={match.away.logo} alt="" />
                          )}
                          <span>{match.away?.shortName}</span>
                        </div>
                      </div>

                      <span
                        className={
                          match.result === "G"
                            ? "is-win"
                            : "is-loss"
                        }
                      >
                        {match.result}
                      </span>
                    </button>
                  );
                })}

                {getTeamLastTwoMatches(teamId).length === 0 && (
                  <p>Sin resultados recientes</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="match-highlighted-title">
  <span>PROMEDIOS DE TEMPORADA</span>
  <h3>Jugadores destacados</h3>
</div>

<div className="match-highlighted-teams">
  {[
    selectedUpcomingMatch.homeTeam,
    selectedUpcomingMatch.awayTeam,
  ].map((teamId) => {
    const team = getTeam(teamId);

    return (
      <div className="match-highlighted-team" key={teamId}>
        <div className="match-highlighted-team-header">
          {team?.logo && <img src={team.logo} alt="" />}

          <div className="match-highlighted-team-title">
  <strong>{team?.shortName || team?.name}</strong>

  <div className="team-form">
    {getTeamLastTwoMatches(teamId).map((match) => (
      <span
        key={match.id}
        className={`team-form-result ${
          match.result === "G"
            ? "team-form-win"
            : "team-form-loss"
        }`}
      >
        {match.result}
      </span>
    ))}
  </div>
</div>
        </div>

        <div className="match-highlighted-grid">
          {[
            { label: "PUNTOS", stat: "points", unit: "PTS" },
            { label: "REBOTES", stat: "rebounds", unit: "REB" },
            { label: "ASISTENCIAS", stat: "assists", unit: "AST" },
          ].map(({ label, stat, unit }) => (
            <div className="match-highlighted-category" key={stat}>
              <span>{label}</span>

              {getHighlightedPlayers(teamId, stat).map(
                (player) => (
                  <button
                    type="button"
                    key={player.id}
                    className="match-highlighted-player"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <strong>{player.name}</strong>
                    <span>
                      {Number(player.stats[stat]).toFixed(1)}{" "}
                      {unit}
                    </span>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    );
  })}
</div>
      </section>
    </div>
  </div>
 , document.body)}
      {/* =========================
          MODAL EQUIPO
      ========================= */}

      {/* POPUP DEL EQUIPO - FICHA COMPACTA LNA */}
      {selectedTeam && !selectedMatch && createPortal(
        <div className="home-modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div className="home-team-modal home-team-modal-v2" role="dialog" aria-modal="true" aria-label={selectedTeam.name} onClick={(event) => event.stopPropagation()}>
            <header className="team-v2-hero">
              <img className="team-v2-watermark" src={selectedTeam.logo} alt="" aria-hidden="true" />
              <button type="button" className="home-modal-close team-v2-close" onClick={() => setSelectedTeam(null)} aria-label="Cerrar">×</button>
              <div className="team-v2-identity">
                <button type="button" className="team-v2-crest" onClick={() => setSelectedTeam(null)} aria-label={"Ver " + selectedTeam.name}>
                  <img src={selectedTeam.logo} alt="" />
                </button>
                <div>
                  <span>LIGA NACIONAL 2026/27</span>
                  <h2>{selectedTeam.name} <span className="team-v2-record">({selectedTeam.wins}-{selectedTeam.losses})</span></h2>
                  <p>{[selectedTeam.city, selectedTeam.province].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</p>
                </div>
              </div>
            </header>
            <div className="team-v2-body">
              {(() => {
                const official = getUpcomingOfficialCollective(selectedTeam.id);
                const metrics = [
                  ["PTS/P", "points"], ["REC/P", "pointsAgainst"],
                  ["REB/P", "rebounds"], ["AST/P", "assists"],
                  ["RECUP/P", "steals"], ["TAP/P", "blocks"],
                  ["PÉRD/P", "turnovers"], ["FALTAS/P", "fouls"],
                ];
                const shooting = [
                  ["TC", "fieldGoals"], ["T2", "twoPointers"],
                  ["T3", "threePointers"], ["TL", "freeThrows"],
                ];
                const display = (key, percentage = false) => {
                  const value = official.values[key];
                  return Number.isFinite(value) ? value.toFixed(1) + (percentage ? "%" : "") : "—";
                };
                return (
                  <section className="team-v2-section team-v2-collective-section">
                    <div className="team-v2-section-head">
                      <h3>ESTADÍSTICAS COLECTIVAS</h3>
                      <span className="team-v2-official-count">{official.games} PJ con datos</span>
                    </div>
                    <div className="team-v2-collective-grid">
                      {metrics.map(([label, key]) => (
                        <div className="team-v2-collective-item" key={key}>
                          <span>{label}</span><strong>{display(key)}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="team-v2-collective-shooting">
                      {shooting.map(([label, key]) => (
                        <div className="team-v2-collective-item" key={key}>
                          <span>{label}</span><strong>{display(key, true)}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}
              {(() => {
                const nextMatch = matches
                  .filter((match) => !isMatchFinished(match) && (match.homeTeam === selectedTeam.id || match.awayTeam === selectedTeam.id) && match.date >= today)
                  .sort((a, b) => (a.date + " " + (a.time || "")).localeCompare(b.date + " " + (b.time || "")))[0];
                if (!nextMatch) return null;
                const homeTeam = getTeam(nextMatch.homeTeam);
                const awayTeam = getTeam(nextMatch.awayTeam);
                return (
                  <section className="team-v2-section">
                    <div className="team-v2-section-head"><h3>PRÓXIMO PARTIDO</h3><Link to={"/equipos/" + selectedTeam.id} onClick={() => setSelectedTeam(null)}>Ver fixture completo →</Link></div>
                    <button type="button" className="team-v2-next" onClick={() => { setSelectedTeam(null); setSelectedUpcomingMatch(nextMatch); }}>
                      <div><img src={homeTeam?.logo} alt="" /><strong>{homeTeam?.shortName || homeTeam?.name}</strong></div>
                      <div className="team-v2-next-center"><span>{formatDate(nextMatch.date)}</span><strong>{nextMatch.time || "A confirmar"}</strong><span>{nextMatch.tv || "Transmisión a confirmar"}</span></div>
                      <div><img src={awayTeam?.logo} alt="" /><strong>{awayTeam?.shortName || awayTeam?.name}</strong></div>
                    </button>
                  </section>
                );
              })()}
              <section className="team-v2-section">
                <div className="team-v2-section-head"><h3>ÚLTIMOS 2 PARTIDOS</h3><Link to={"/equipos/" + selectedTeam.id} onClick={() => setSelectedTeam(null)}>Ver todos →</Link></div>
                <div className="team-v2-recent">
                  {getTeamLastTwoMatches(selectedTeam.id).map((match) => (
                    <button key={match.id} type="button" disabled={!getMatchStats(match)} onClick={() => { if (getMatchStats(match)) { setSelectedTeam(null); setSelectedMatch(match); } }}>
                      <span className="team-v2-date">{formatDate(match.date)}</span>
                      <div className="team-v2-result">
                        <img src={match.home?.logo} alt="" />
                        <strong>{match.homeScore} - {match.awayScore}</strong>
                        <img src={match.away?.logo} alt="" />
                      </div>
                      <span className={match.result === "G" ? "team-v2-win" : "team-v2-loss"}>{match.result === "G" ? "VICTORIA" : "DERROTA"}</span>
                    </button>
                  ))}
                  {getTeamLastTwoMatches(selectedTeam.id).length === 0 && <p>Sin resultados recientes</p>}
                </div>
              </section>
              <section className="team-v2-section">
                <div className="team-v2-section-head"><h3>JUGADORES DESTACADOS</h3><Link to={"/equipos/" + selectedTeam.id} onClick={() => setSelectedTeam(null)}>Ver plantel →</Link></div>
                <div className="team-v2-players">
                  {[
                    ["PUNTOS", "points", "PTS"],
                    ["REBOTES", "rebounds", "REB"],
                    ["ASISTENCIAS", "assists", "AST"],
                  ].map(([label, stat, unit]) => (
                    <div className="team-v2-player-category" key={stat}>
                      <h4>{label}</h4>
                      {getHighlightedPlayers(selectedTeam.id, stat).map((player) => (
                        <button type="button" key={player.id} onClick={() => { setSelectedTeam(null); setSelectedPlayer(player); }}>
                          <span>{player.name}</span>
                          <strong>{Number(player.stats[stat]).toFixed(1)} {unit}</strong>
                        </button>
                      ))}
                      {getHighlightedPlayers(selectedTeam.id, stat).length === 0 && <p>Sin estadísticas</p>}
                    </div>
                  ))}
                </div>
              </section>
              <Link className="team-v2-full-link" to={"/equipos/" + selectedTeam.id} onClick={() => setSelectedTeam(null)}>Ver equipo completo →</Link>
            </div>
            <div className="home-team-modal-footer"><span>LNA</span><strong>{selectedTeam.abbreviation}</strong></div>
          </div>
        </div>
      , document.body)}

      {/* =========================
          MODAL PARTIDO
      ========================= */}

      {selectedMatch && createPortal((() => {

        const homeTeam =
          getTeam(selectedMatch.homeTeam);

        const awayTeam =
          getTeam(selectedMatch.awayTeam);

        const isFinished =
          selectedMatch.status === "finished";

        const homeScore =
          selectedMatch.homeScore;

        const awayScore =
          selectedMatch.awayScore;

        const difference =
          isFinished &&
          homeScore !== null &&
          awayScore !== null
            ? Math.abs(
                homeScore - awayScore
              )
            : null;

        /*
          =========================
          ESTADÍSTICAS DEL PARTIDO
          =========================
        */

        const matchStats = getMatchStats(selectedMatch);

const quarterScores = matchStats?.quarterScores || null;

console.table(quarterScores);
        const homePlayerStats =
          matchStats?.[selectedMatch.homeTeam] || [];

        const awayPlayerStats =
          matchStats?.[selectedMatch.awayTeam] || [];

        const sortPlayersByPoints = (players) =>
          [...players].sort(
            (a, b) =>
              (Number(b.points) || 0) -
              (Number(a.points) || 0)
          );

        const sortedHomePlayers =
          sortPlayersByPoints(homePlayerStats);

        const sortedAwayPlayers =
          sortPlayersByPoints(awayPlayerStats);

        const renderPlayerStats = (team, stats) => {
  return (
    <>
      <div className="match-stats-head">
        <span>JUGADOR</span>
        <span>PTS</span>
        <span>REB</span>
        <span>AST</span>
        <span>MIN</span>
        <span>VAL</span>
      </div>

      <div className="match-stats-list">
        {stats.length > 0 ? (
          stats.map((player, index) => (
            <button
              type="button"
              className="match-stat-player"
              key={`${player.id}-${index}`}
              onClick={(event) => {
                event.stopPropagation();

                const playerInfo =
                  getMatchPlayerInfo(player);

                if (!playerInfo) return;

                setSelectedPlayer(playerInfo);
              }}
            >
              <strong>{player.name}</strong>

              <span>{player.points ?? "—"}</span>

              <span>{player.rebounds ?? "—"}</span>

              <span>{player.assists ?? "—"}</span>

              <span>{player.minutes || "—"}</span>
              <span>
  {getOfficialValuation(
    selectedMatch,
    team.id,
    player.id
) ?? "—"}
</span>
            </button>
          ))
        ) : (
          <div className="match-player-empty">
            No hay estadísticas disponibles.
          </div>
        )}
      </div>
    </>
  );
};

        return (
          <div
  className="match-modal-overlay match-modal-finished-overlay"
  onClick={() => setSelectedMatch(null)}
>
  <div className="match-modal-finished-scroll">
    <div
      className="match-modal match-modal-finished"
      onClick={(event) => event.stopPropagation()}
    >

              <button
                type="button"
                className="match-modal-close"
                onClick={() =>
                  setSelectedMatch(null)
                }
              >
                ×
              </button>


             <div className="match-modal-header">
  <span className="match-modal-label">
    LIGA NACIONAL 2026/27
  </span>

  <strong className="match-modal-date">
    {formatDate(selectedMatch.date)}
  </strong>

  <span className="match-modal-status">
    {isFinished ? "FINAL" : "PRÓXIMO PARTIDO"}
  </span>

  <div className="match-modal-teams">
    <div className="match-modal-team">
      {homeTeam && (
        <Link
          to={`/equipos/${homeTeam.id}`}
          className="home-modal-team-logo-button"
        >
          <img src={homeTeam.logo} alt={homeTeam.name} />
        </Link>
      )}

      <strong>
        {homeTeam?.shortName || homeTeam?.name}
        <small>
          {getTeamStats(selectedMatch.homeTeam).wins}-
          {getTeamStats(selectedMatch.homeTeam).losses}
        </small>
      </strong>
    </div>

    <div className="match-modal-score">
      <strong>
        {isFinished
          ? `${homeScore} - ${awayScore}`
          : selectedMatch.time || "VS"}
      </strong>
    </div>

    <div className="match-modal-team">
      {awayTeam && (
        <Link
          to={`/equipos/${awayTeam.id}`}
          className="home-modal-team-logo-button"
        >
          <img src={awayTeam.logo} alt={awayTeam.name} />
        </Link>
      )}

      <strong>
        {awayTeam?.shortName || awayTeam?.name}
        <small>
          {getTeamStats(selectedMatch.awayTeam).wins}-
          {getTeamStats(selectedMatch.awayTeam).losses}
        </small>
      </strong>
    </div>
  </div>
</div>


              {/* INFORMACIÓN COMPLEMENTARIA */}

              {(selectedMatch.venue ||
                (selectedMatch.tv &&
                  selectedMatch.tv.length > 0)) && (

                <div className="match-modal-info">

                  {selectedMatch.venue && (
                    <div>
                      <span>ESTADIO</span>

                      <strong>
                        {selectedMatch.venue}
                      </strong>
                    </div>
                  )}

                  {selectedMatch.tv &&
                    selectedMatch.tv.length > 0 && (
                      <div>
                        <span>TV</span>

                        <strong>
                          {selectedMatch.tv.join(
                            " · "
                          )}
                        </strong>
                      </div>
                    )}

                </div>
              )}

{/* =========================
    PUNTOS POR CUARTO
========================= */}

{isFinished && quarterScores?.length > 0 && (
  <section className="match-quarters">
    <div className="match-quarters-title">
      <span>DESGLOSE DEL MARCADOR</span>
      <h3>Puntos por cuarto</h3>
    </div>

    <div className="match-quarters-scroll">
      <table className="match-quarters-table">
        <thead>
          <tr>
            <th>Equipo</th>

            {quarterScores.map((quarter, index) => (
              <th key={index}>
                {quarter.period === "OT" ||
                quarter.period === "PR"
                  ? "PR"
                  : quarter.period
                    ? `${quarter.period}C`
                    : `${index + 1}C`}
              </th>
            ))}

            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <th>
              {homeTeam?.shortName ||
                selectedMatch.homeTeam}
            </th>

            {quarterScores.map((quarter, index) => (
              <td key={index}>{quarter.home}</td>
            ))}

            <td className="match-quarters-total">
              {homeScore}
            </td>
          </tr>

          <tr>
            <th>
              {awayTeam?.shortName ||
                selectedMatch.awayTeam}
            </th>

            {quarterScores.map((quarter, index) => (
              <td key={index}>{quarter.away}</td>
            ))}

            <td className="match-quarters-total">
              {awayScore}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
)}
              {/* =========================
                  ESTADÍSTICAS INDIVIDUALES
              ========================= */}

              {isFinished && matchStats && (
                <div className="match-player-stats">
<div className="match-player-stats-title">
  <span className="section-label">
    ESTADÍSTICAS
  </span>

  <h3>
    Rendimiento de los jugadores
  </h3>
</div>

                <MatchStatsTabs
                  key={selectedMatch.date + selectedMatch.homeTeam + selectedMatch.awayTeam}
                  match={selectedMatch}
                  stats={matchStats}
                  home={homeTeam}
                  away={awayTeam}
                >
<div className="match-modal-content">    
                 <section className="match-stats-team">

                     <div className="match-stats-team-header">
  <div>
    <Link
      to={`/equipos/${homeTeam.id}`}
      className="team-logo-link"
      onClick={(event) => event.stopPropagation()}
    >
      <img
        src={homeTeam.logo}
        alt={`Escudo de ${homeTeam.name}`}
      />
    </Link>

    <div>
      <span>LOCAL</span>
      <h3>{homeTeam.name}</h3>
    </div>
  </div>
</div>

                      {renderPlayerStats(
                        homeTeam,
                        sortedHomePlayers
                      )}

                    </section>


                    <section className="match-stats-team">

                     <div className="match-stats-team-header">
  <div>
    <Link
      to={`/equipos/${awayTeam.id}`}
      className="team-logo-link"
      onClick={(event) => event.stopPropagation()}
    >
      <img
        src={awayTeam.logo}
        alt={`Escudo de ${awayTeam.name}`}
      />
    </Link>

    <div>
      <span>VISITANTE</span>
      <h3>{awayTeam.name}</h3>
    </div>
  </div>
</div>

                      {renderPlayerStats(
                        awayTeam,
                        sortedAwayPlayers
                      )}

                                       </section>

                  
                </div>
                </MatchStatsTabs>
              </div>
              )}

            </div>
          </div>
        </div>
  );
})(), document.body)}
{/* POPUP DEL JUGADOR */}

{selectedPlayer && (
  <PlayerModal
    player={selectedPlayer}
    team={selectedPlayer.team || getTeam(selectedPlayer.teamId)}
    stats={selectedPlayer.stats || playerStats.find((entry) => entry.playerId === selectedPlayer.id)}
    onClose={() => setSelectedPlayer(null)}
    onTeamClick={(id) => {
      setSelectedPlayer(null);
      window.location.assign(`/equipos/${id}`);
    }}
  />
)}
    </main>
  );
}

export default Liga;
