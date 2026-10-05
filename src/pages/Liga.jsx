import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { teams } from "../data/teams";
import { matches } from "../data/matches";
import { matchPlayerStats } from "../data/matchStats";

import "./Liga.css";

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

  const getTeam = (teamId) =>
    teams.find((team) => team.id === teamId);

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
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }

        if (a.losses !== b.losses) {
          return a.losses - b.losses;
        }

        return b.difference - a.difference;
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

  const results = matches
    .filter(
      (match) =>
        match.status === "finished"
    )
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }

      return (b.time || "").localeCompare(
        a.time || ""
      );
    })
    .slice(0, 10);

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
        <span className="standing-position">
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
          HEADER
      ========================= */}

      <section className="league-header">
        <div className="page-container">

          <span className="league-label">
            LIGA NACIONAL
          </span>

          <h1>Liga</h1>

          <p>
            Partidos, resultados y tabla de
            posiciones de la Liga Nacional.
          </p>

        </div>
      </section>


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

                <h2>
                  Partidos de hoy
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
                      onClick={() =>
                        setSelectedMatch(match)
                      }
                    >

                      <div className="match-date">
                        {formatDate(match.date)}
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
                          VS
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

                  <h2>
                    Posiciones
                  </h2>

                </div>
              </div>


              <div className="standings-card">

                <div className="standings-column">

                  <div className="standings-header">
                    <span>#</span>
                    <span>Equipo</span>
                    <span>PG</span>
                    <span>PP</span>
                  </div>

                  {standings.map(
                    (team, index) =>
                      renderStandingRow(
                        team,
                        index
                      )
                  )}

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

                  <h2>
                    Resultados
                  </h2>

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

                  <h2>
                    Próximos partidos
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
                            setSelectedMatch(match)
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


      {/* =========================
          MODAL EQUIPO
      ========================= */}

      {selectedTeam && (

        <div
          className="team-modal-overlay"
          onClick={() =>
            setSelectedTeam(null)
          }
        >

          <div
            className="team-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="team-modal-close"
              onClick={() =>
                setSelectedTeam(null)
              }
            >
              ×
            </button>


            <div className="team-modal-header">

              <Link
                to={`/equipos/${selectedTeam.id}`}
                className="team-logo-link"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <img
                  src={selectedTeam.logo}
                  alt={`Escudo de ${selectedTeam.name}`}
                  className="team-modal-logo"
                />
              </Link>

              <div>

                <span>
                  {selectedTeam.city}
                </span>

                <h3>
                  {selectedTeam.name}
                </h3>

              </div>

            </div>


            <div className="team-modal-stats">

              <div>
                <span>PJ</span>
                <strong>
                  {selectedTeam.gamesPlayed}
                </strong>
              </div>

              <div>
                <span>PG</span>
                <strong>
                  {selectedTeam.wins}
                </strong>
              </div>

              <div>
                <span>PP</span>
                <strong>
                  {selectedTeam.losses}
                </strong>
              </div>

              <div>
                <span>PF</span>
                <strong>
                  {selectedTeam.pointsFor}
                </strong>
              </div>

              <div>
                <span>PC</span>
                <strong>
                  {selectedTeam.pointsAgainst}
                </strong>
              </div>

              <div>
                <span>DIF</span>
                <strong>
                  {selectedTeam.difference}
                </strong>
              </div>

            </div>

          </div>

        </div>

      )}


      {/* =========================
          MODAL PARTIDO
      ========================= */}

      {selectedMatch && (() => {

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

        const statsKeyWithDate =
          `${selectedMatch.date}-${selectedMatch.homeTeam}-${selectedMatch.awayTeam}`;

        const statsKeyWithoutDate =
          `${selectedMatch.homeTeam}-${selectedMatch.awayTeam}`;

        const matchStats =
          matchPlayerStats[statsKeyWithDate] ||
          matchPlayerStats[statsKeyWithoutDate] ||
          null;

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

        const renderPlayerStats = (
          team,
          playerStats
        ) => {
          if (!playerStats.length) {
            return (
              <div className="match-player-empty">
                No hay estadísticas disponibles.
              </div>
            );
          }

          return (
            <div className="match-player-table">

              <div className="match-player-table-header">
                <span>JUGADOR</span>
                <span>MIN</span>
                <span>PTS</span>
                <span>REB</span>
                <span>AST</span>
              </div>

              {playerStats.map((player) => (
                <div
                  key={player.id}
                  className="match-player-row"
                >

                  <div className="match-player-name">
                    <span>
                      {player.name}
                    </span>
                  </div>

                  <span>
                    {player.minutes || "-"}
                  </span>

                  <strong>
                    {player.points ?? "-"}
                  </strong>

                  <span>
                    {player.rebounds ?? "-"}
                  </span>

                  <span>
                    {player.assists ?? "-"}
                  </span>

                </div>
              ))}

            </div>
          );
        };

        return (
          <div
            className="match-modal-overlay"
            onClick={() =>
              setSelectedMatch(null)
            }
          >

            <div
              className={`match-modal ${
                isFinished && matchStats
                  ? "match-modal-with-player-stats"
                  : ""
              }`}
              onClick={(event) =>
                event.stopPropagation()
              }
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


              <div className="match-modal-top">

                <span className="match-modal-label">
                  {isFinished
                    ? "PARTIDO FINALIZADO"
                    : "PRÓXIMO PARTIDO"}
                </span>

                <span className="match-modal-date">
                  {formatDate(
                    selectedMatch.date
                  )}
                  {selectedMatch.time
                    ? ` · ${selectedMatch.time}`
                    : ""}
                </span>

              </div>


              <div className="match-modal-teams">

                <div className="match-modal-team">

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
                    />
                  </Link>

                  <span>
                    {homeTeam.name}
                  </span>

                  {isFinished && (
                    <strong>
                      {homeScore}
                    </strong>
                  )}

                </div>


                <div className="match-modal-center">

                  {isFinished ? (
                    <>
                      <span className="match-modal-final">
                        FINAL
                      </span>

                      <span className="match-modal-difference">
                        DIF. {difference}
                      </span>
                    </>
                  ) : (
                    <span className="match-modal-vs">
                      VS
                    </span>
                  )}

                </div>


                <div className="match-modal-team">

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
                    />
                  </Link>

                  <span>
                    {awayTeam.name}
                  </span>

                  {isFinished && (
                    <strong>
                      {awayScore}
                    </strong>
                  )}

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


                  <div className="match-player-team-stats">

                    <section className="match-player-team-section">

                      <div className="match-player-team-heading">

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
                          />
                        </Link>

                        <div>

                          <span>
                            LOCAL
                          </span>

                          <strong>
                            {homeTeam.name}
                          </strong>

                        </div>

                      </div>

                      {renderPlayerStats(
                        homeTeam,
                        sortedHomePlayers
                      )}

                    </section>


                    <section className="match-player-team-section">

                      <div className="match-player-team-heading">

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
                          />
                        </Link>

                        <div>

                          <span>
                            VISITANTE
                          </span>

                          <strong>
                            {awayTeam.name}
                          </strong>

                        </div>

                      </div>

                      {renderPlayerStats(
                        awayTeam,
                        sortedAwayPlayers
                      )}

                    </section>

                  </div>

                </div>
              )}

            </div>

          </div>
        );
      })()}

    </main>
  );
}

export default Liga;