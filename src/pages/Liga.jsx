import { useMemo, useState } from "react";

import { teams } from "../data/teams";
import { matches } from "../data/matches";

import "./Liga.css";

function Liga() {
  const today = new Date()
    .toISOString()
    .split("T")[0];

  const [selectedTeam, setSelectedTeam] =
    useState(null);

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
      difference:
        pointsFor - pointsAgainst,
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

  const firstHalfStandings =
    standings.slice(0, 9);

  const secondHalfStandings =
    standings.slice(9, 18);

  const todayMatches = matches.filter(
    (match) =>
      match.date === today &&
      match.status === "scheduled"
  );

  const upcomingMatches = matches
    .filter(
      (match) =>
        match.date > today &&
        match.status === "scheduled"
    )
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    );

  const renderStandingRow = (
    team,
    index
  ) => {
    const position = index + 1;

    return (
      <button
        key={team.id}
        type="button"
        className="standing-row"
        onClick={() =>
          setSelectedTeam(team)
        }
      >
        <span className="standing-position">
          {position}
        </span>

        <span className="standing-team">
          <img
            src={team.logo}
            alt={`Escudo de ${team.name}`}
            className="standing-logo"
          />

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

          <section className="league-section">

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
                    <div
                      key={match.id}
                      className="today-match-card"
                    >

                      <div className="match-date">
                        {formatDate(match.date)}
                      </div>


                      <div className="match-teams">

                        <div className="match-team">
                          <img
                            src={homeTeam.logo}
                            alt={`Escudo de ${homeTeam.name}`}
                            className="match-team-logo"
                          />

                          <span>
                            {homeTeam.shortName}
                          </span>
                        </div>


                        <div className="match-vs">
                          VS
                        </div>


                        <div className="match-team">
                          <img
                            src={awayTeam.logo}
                            alt={`Escudo de ${awayTeam.name}`}
                            className="match-team-logo"
                          />

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

                    </div>
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
              PARTE INFERIOR
          ========================= */}

          <section className="league-bottom">


            {/* =========================
                TABLA
            ========================= */}

            <div className="standings-section">

              <div className="section-heading">

                <div>
                  <span className="section-label">
                    TEMPORADA
                  </span>

                  <h2>
                    Tabla de posiciones
                  </h2>
                </div>

              </div>


              <div className="standings-card">


                {/* COLUMNA 1 */}

                <div className="standings-column">

                  <div className="standings-header">
                    <span>#</span>
                    <span>Equipo</span>
                    <span>PG</span>
                    <span>PP</span>
                  </div>

                  {firstHalfStandings.map(
                    (team, index) =>
                      renderStandingRow(
                        team,
                        index
                      )
                  )}

                </div>


                {/* COLUMNA 2 */}

                <div className="standings-column">

                  <div className="standings-header">
                    <span>#</span>
                    <span>Equipo</span>
                    <span>PG</span>
                    <span>PP</span>
                  </div>

                  {secondHalfStandings.map(
                    (team, index) =>
                      renderStandingRow(
                        team,
                        index + 9
                      )
                  )}

                </div>

              </div>

            </div>


            {/* =========================
                PRÓXIMOS PARTIDOS
            ========================= */}

            <div className="upcoming-section">

              <div className="section-heading">

                <div>
                  <span className="section-label">
                    AGENDA
                  </span>

                  <h2>
                    Próximos partidos
                  </h2>
                </div>

              </div>


              <div className="upcoming-card">

                {upcomingMatches.length > 0 ? (

                  upcomingMatches
                    .slice(0, 6)
                    .map((match) => {

                      const homeTeam =
                        getTeam(match.homeTeam);

                      const awayTeam =
                        getTeam(match.awayTeam);

                      return (
                        <div
                          key={match.id}
                          className="upcoming-match"
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

                              <img
                                src={homeTeam.logo}
                                alt={`Escudo de ${homeTeam.name}`}
                                className="upcoming-logo"
                              />

                              <span>
                                {homeTeam.shortName}
                              </span>

                            </div>


                            <span className="upcoming-vs">
                              VS
                            </span>


                            <div>

                              <img
                                src={awayTeam.logo}
                                alt={`Escudo de ${awayTeam.name}`}
                                className="upcoming-logo"
                              />

                              <span>
                                {awayTeam.shortName}
                              </span>

                            </div>

                          </div>

                        </div>
                      );
                    })

                ) : (

                  <div className="upcoming-empty">
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

              <img
                src={selectedTeam.logo}
                alt={`Escudo de ${selectedTeam.name}`}
                className="team-modal-logo"
              />

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

    </main>
  );
}

export default Liga;