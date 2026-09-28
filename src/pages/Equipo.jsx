import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import "./Equipo.css";

import { teams } from "../data/teams";
import { players } from "../data/players";
import { matches } from "../data/matches";
import { playerStats } from "../data/stats";

function getTeam(teamId) {
  return teams.find((team) => team.id === teamId);
}

function getPlayers(teamId) {
  const positionOrder = {
    Base: 1,
    Escolta: 2,
    Alero: 3,
    "Ala-pívot": 4,
    Pívot: 5,
  };

  return players
    .filter((player) => player.teamId === teamId)
    .sort((a, b) => {
      const positionA = positionOrder[a.position] || 99;
      const positionB = positionOrder[b.position] || 99;

      if (positionA !== positionB) {
        return positionA - positionB;
      }

      return a.name.localeCompare(b.name, "es");
    });
}

function getMatches(teamId) {
  return matches
    .filter(
      (match) =>
        match.homeTeam === teamId ||
        match.awayTeam === teamId
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getPlayerStats(playerId) {
  return playerStats.find(
    (stats) => stats.playerId === playerId
  );
}

function formatDate(date) {
  const dateObject = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateObject);
}

function formatDay(date) {
  const dateObject = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
  })
    .format(dateObject)
    .replace(".", "");
}

function getOpponent(match, teamId) {
  const opponentId =
    match.homeTeam === teamId
      ? match.awayTeam
      : match.homeTeam;

  return getTeam(opponentId);
}

function isHome(match, teamId) {
  return match.homeTeam === teamId;
}

function getTeamRecord(teamId) {
  const finishedMatches = matches.filter(
    (match) =>
      match.status === "finished" &&
      (match.homeTeam === teamId ||
        match.awayTeam === teamId)
  );

  let wins = 0;
  let losses = 0;

  finishedMatches.forEach((match) => {
    const home = match.homeTeam === teamId;

    const teamScore = home
      ? match.homeScore
      : match.awayScore;

    const opponentScore = home
      ? match.awayScore
      : match.homeScore;

    if (
      teamScore !== null &&
      opponentScore !== null
    ) {
      if (teamScore > opponentScore) {
        wins++;
      }

      if (teamScore < opponentScore) {
        losses++;
      }
    }
  });

  return {
    wins,
    losses,
  };
}

function Equipo() {
  const { teamId } = useParams();

  const [selectedPlayer, setSelectedPlayer] =
    useState(null);

  const team = getTeam(teamId);

  if (!team) {
    return (
      <main className="team-page">
        <section className="team-not-found">
          <div className="page-container">
            <span className="team-not-found-icon">
              🏀
            </span>

            <span className="page-label">
              LIGA NACIONAL 2026/27
            </span>

            <h1>Equipo no encontrado</h1>

            <p>
              El equipo que estás buscando no existe
              en nuestra base de datos.
            </p>

            <Link
              to="/equipos"
              className="button button-primary"
            >
              Volver a equipos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const teamPlayers = getPlayers(teamId);
  const teamMatches = getMatches(teamId);
  const teamRecord = getTeamRecord(teamId);

  const upcomingMatches = teamMatches
    .filter(
      (match) => match.status === "scheduled"
    )
    .slice(0, 6);

  const finishedMatches = teamMatches
    .filter(
      (match) => match.status === "finished"
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date)
    )
    .slice(0, 5);

  const selectedPlayerStats = selectedPlayer
    ? getPlayerStats(selectedPlayer.id)
    : null;

  return (
    <main className="team-page">

      {/* =========================
          HEADER DEL EQUIPO
      ========================= */}

      <section className="team-header">
        <div className="page-container">

          <Link
            to="/equipos"
            className="back-link"
          >
            ← Volver a equipos
          </Link>

          <div className="team-header-content">

            <div className="team-main-logo">
              <img
                src={team.logo}
                alt={`Escudo de ${team.name}`}
              />
            </div>

            <div className="team-header-info">

              <span className="page-label">
                LIGA NACIONAL 2026/27
              </span>

              <h1>
                {team.name}

                <span className="team-record">
                  ({teamRecord.wins}-
                  {teamRecord.losses})
                </span>
              </h1>

              <p>
                {team.city}, {team.province}
              </p>

            </div>

          </div>
        </div>
      </section>


      {/* =========================
          CONTENIDO
      ========================= */}

      <section className="team-content">
        <div className="page-container">

          {/* INFORMACIÓN */}

          <div className="team-info-grid">

            <article className="team-info-card">
              <span>CIUDAD</span>

              <strong>
                {team.city}
              </strong>
            </article>

            <article className="team-info-card">
              <span>PROVINCIA</span>

              <strong>
                {team.province}
              </strong>
            </article>

            <article className="team-info-card">
              <span>PLANTEL</span>

              <strong>
                {teamPlayers.length} jugadores
              </strong>
            </article>

          </div>


          {/* COLUMNAS */}

          <div className="team-columns">

            {/* PLANTEL */}

            <section className="team-section">

              <div className="section-heading-team">

                <div>
                  <span>PLANTEL</span>

                  <h2>Jugadores</h2>
                </div>

                <strong>
                  {teamPlayers.length}
                </strong>

              </div>

              {teamPlayers.length > 0 ? (
                <div className="team-players">

                  {teamPlayers.map((player) => (
                    <button
                      className="team-player-card"
                      key={player.id}
                      type="button"
                      onClick={() =>
                        setSelectedPlayer(player)
                      }
                    >

                      <div className="team-player-info">

                        <span>
                          {player.position}
                        </span>

                        <h3>
                          {player.name}
                        </h3>

                        <small>
                          {player.nationality}
                        </small>

                      </div>

                      <span className="team-player-arrow">
                        →
                      </span>

                    </button>
                  ))}

                </div>
              ) : (
                <div className="team-empty">

                  <span className="empty-icon">
                    👥
                  </span>

                  <div>
                    <strong>
                      Plantel todavía no disponible
                    </strong>

                    <p>
                      Próximamente vamos a agregar
                      los jugadores de este equipo.
                    </p>
                  </div>

                </div>
              )}

            </section>


            {/* PRÓXIMOS PARTIDOS */}

            <section className="team-section">

              <div className="section-heading-team">

                <div>
                  <span>AGENDA</span>

                  <h2>
                    Próximos partidos
                  </h2>
                </div>

                <strong>
                  {upcomingMatches.length}
                </strong>

              </div>

              {upcomingMatches.length > 0 ? (
                <div className="team-matches">

                  {upcomingMatches.map((match) => {
                    const opponent =
                      getOpponent(
                        match,
                        teamId
                      );

                    const home =
                      isHome(
                        match,
                        teamId
                      );

                    return (
                      <article
                        className="team-match-row"
                        key={match.id}
                      >

                        <div className="team-match-date">

                          <strong>
                            {formatDate(
                              match.date
                            )}
                          </strong>

                          <span>
                            {formatDay(
                              match.date
                            )} ·{" "}
                            {home
                              ? "LOCAL"
                              : "VISITANTE"}
                          </span>

                        </div>

                        <div className="team-match-opponent">

                          {opponent && (
                            <img
                              src={opponent.logo}
                              alt={`Escudo de ${opponent.name}`}
                              className="team-match-logo"
                            />
                          )}

                          <div>

                            <small>
                              {home
                                ? "vs."
                                : "ante"}
                            </small>

                            <strong>
                              {opponent?.name}
                            </strong>

                          </div>

                        </div>

                        <div className="team-match-time">
                          {match.time ||
                            "A confirmar"}
                        </div>

                      </article>
                    );
                  })}

                </div>
              ) : (
                <div className="team-empty">

                  <span className="empty-icon">
                    🏀
                  </span>

                  <div>
                    <strong>
                      No hay próximos partidos
                    </strong>

                    <p>
                      La agenda de este equipo
                      aparecerá aquí.
                    </p>
                  </div>

                </div>
              )}

            </section>

          </div>


          {/* ÚLTIMOS PARTIDOS */}

          <section className="team-section results-team-section">

            <div className="section-heading-team">

              <div>
                <span>RESULTADOS</span>

                <h2>
                  Últimos partidos
                </h2>
              </div>

            </div>

            {finishedMatches.length > 0 ? (
              <div className="team-matches">

                {finishedMatches.map((match) => {
                  const opponent =
                    getOpponent(
                      match,
                      teamId
                    );

                  const home =
                    isHome(
                      match,
                      teamId
                    );

                  return (
                    <article
                      className="team-match-row"
                      key={match.id}
                    >

                      <div className="team-match-date">

                        <strong>
                          {formatDate(
                            match.date
                          )}
                        </strong>

                        <span>
                          {home
                            ? "LOCAL"
                            : "VISITANTE"}
                        </span>

                      </div>

                      <div className="team-match-opponent">

                        {opponent && (
                          <img
                            src={opponent.logo}
                            alt={`Escudo de ${opponent.name}`}
                            className="team-match-logo"
                          />
                        )}

                        <div>

                          <small>
                            {home
                              ? "vs."
                              : "ante"}
                          </small>

                          <strong>
                            {opponent?.name}
                          </strong>

                        </div>

                      </div>

                      <div className="team-result-score">
                        {match.homeScore} -{" "}
                        {match.awayScore}
                      </div>

                    </article>
                  );
                })}

              </div>
            ) : (
              <div className="team-empty">

                <span className="empty-icon">
                  📊
                </span>

                <div>
                  <strong>
                    Todavía no hay resultados
                  </strong>

                  <p>
                    Los resultados aparecerán
                    durante la temporada.
                  </p>
                </div>

              </div>
            )}

          </section>

        </div>
      </section>


      {/* =========================
          POP-UP DEL JUGADOR
      ========================= */}

      {selectedPlayer && (
        <div
          className="player-modal-overlay"
          onClick={() =>
            setSelectedPlayer(null)
          }
        >

          <div
            className="player-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="player-modal-close"
              type="button"
              onClick={() =>
                setSelectedPlayer(null)
              }
              aria-label="Cerrar"
            >
              ×
            </button>


            {/* CABECERA */}

            <div className="player-modal-header">

              <div className="player-modal-logo">
                <img
                  src={team.logo}
                  alt={`Escudo de ${team.name}`}
                />
              </div>

              <div className="player-modal-player-info">

                <span>
                  {selectedPlayer.position}
                </span>

                <h2>
                  {selectedPlayer.name}
                </h2>

                <p>
                  {team.name}
                </p>

                <small>
                  {selectedPlayer.nationality}
                </small>

              </div>

            </div>


            {/* DATOS */}

            <div className="player-modal-details">

              <div>
                <span>POSICIÓN</span>

                <strong>
                  {selectedPlayer.position ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>NACIONALIDAD</span>

                <strong>
                  {selectedPlayer.nationality ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>NÚMERO</span>

                <strong>
                  {selectedPlayer.number ?? "—"}
                </strong>
              </div>

            </div>


            {/* ESTADÍSTICAS */}

            <div className="player-modal-section">

              <span>
                ESTADÍSTICAS DE LA TEMPORADA
              </span>

              <div className="player-stats-grid">

                <div className="player-stat-card">
                  <strong>
                    {selectedPlayerStats?.gamesPlayed ??
                      0}
                  </strong>

                  <span>PJ</span>
                </div>

                <div className="player-stat-card">
                  <strong>
                    {selectedPlayerStats?.points ??
                      0}
                  </strong>

                  <span>PTS</span>
                </div>

                <div className="player-stat-card">
                  <strong>
                    {selectedPlayerStats?.rebounds ??
                      0}
                  </strong>

                  <span>REB</span>
                </div>

                <div className="player-stat-card">
                  <strong>
                    {selectedPlayerStats?.assists ??
                      0}
                  </strong>

                  <span>AST</span>
                </div>

              </div>

            </div>


            {/* FOOTER */}

            <div className="player-modal-footer">

              <span>
                LIGA NACIONAL 2026/27
              </span>

              <strong>
                {team.shortName}
              </strong>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

export default Equipo;