import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { teams } from "../data/teams";
import { matches } from "../data/matches";
import { players } from "../data/players";
import { playerStats } from "../data/stats";
import { matchPlayerStats } from "../data/matchStats";


import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
 const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);
const [liveMatches, setLiveMatches] = useState([]);

  const getTeam = (teamId) => {
    return teams.find((team) => team.id === teamId);
  };

  const goToTeam = (teamId) => {
    if (!teamId) {
      return;
    }

    setSelectedPlayer(null);
    setSelectedTeam(null);
    setSelectedMatch(null);
    setSelectedUpcomingMatch(null);

    navigate(`/equipos/${teamId}`);
  };

  const isMatchFinished = (match) => {
    if (!match) {
      return false;
    }

    if (match.status === "finished") {
      return true;
    }

    if (match.status === "live") {
      return false;
    }

    const hasHomeScore =
      match.homeScore !== null &&
      match.homeScore !== undefined &&
      match.homeScore !== "";

    const hasAwayScore =
      match.awayScore !== null &&
      match.awayScore !== undefined &&
      match.awayScore !== "";

    return hasHomeScore && hasAwayScore;
  };

  const getTeamRecord = (teamId) => {
    const teamMatches = matches.filter(
      (match) =>
        isMatchFinished(match) &&
        (match.homeTeam === teamId || match.awayTeam === teamId)
    );

    let wins = 0;
    let losses = 0;

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
        teamScore === undefined ||
        opponentScore === null ||
        opponentScore === undefined
      ) {
        return;
      }

      if (teamScore > opponentScore) {
        wins++;
      }

      if (teamScore < opponentScore) {
        losses++;
      }
    });

    return {
      wins,
      losses,
    };
  };

  const getRecentForm = (teamId) => {
    const finishedMatches = matches
      .filter(
        (match) =>
          isMatchFinished(match) &&
          (match.homeTeam === teamId || match.awayTeam === teamId)
      )
      .sort((a, b) => {
        const dateA = `${a.date} ${a.time || "00:00"}`;
        const dateB = `${b.date} ${b.time || "00:00"}`;

        return dateB.localeCompare(dateA);
      })
      .slice(0, 3)
      .reverse();

    return finishedMatches.map((match) => {
      const isHome = match.homeTeam === teamId;

      const teamScore = isHome
        ? match.homeScore
        : match.awayScore;

      const opponentScore = isHome
        ? match.awayScore
        : match.homeScore;

      return teamScore > opponentScore ? "G" : "P";
    });
  };

  const getTeamPosition = (teamId) => {
    const positionIndex = standings.findIndex(
      (team) => team.id === teamId
    );

    if (positionIndex === -1) {
      return null;
    }

    return positionIndex + 1;
  };

  const getPlayerStats = (playerId) => {
    return playerStats.find(
      (stats) => stats.playerId === playerId
    );
  };

  const getMatchPlayerInfo = (matchPlayer) => {
    if (!matchPlayer) {
      return null;
    }

    const playerInfo = players.find(
      (player) =>
        player.id === matchPlayer.id ||
        player.name === matchPlayer.name
    );

    if (!playerInfo) {
      return null;
    }

    return {
      ...playerInfo,
      team: getTeam(playerInfo.teamId),
      stats: getPlayerStats(playerInfo.id),
    };
  };

  const getMatchStats = (match) => {
    if (!match) {
      return null;
    }

    const directStats = matchPlayerStats[match.id];

    if (directStats) {
      return directStats;
    }

    const normalizedId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;

    const normalizedStats = matchPlayerStats[normalizedId];

    if (normalizedStats) {
      return normalizedStats;
    }

    const simpleId = `${match.homeTeam}-${match.awayTeam}`;

    const simpleStats = matchPlayerStats[simpleId];

    if (simpleStats) {
      return simpleStats;
    }

    return null;
  };

  const getHighlightedPlayers = (teamId, stat) => {
    return players
      .filter((player) => player.teamId === teamId)
      .map((player) => {
        const stats = getPlayerStats(player.id);

        return {
          ...player,
          team: getTeam(player.teamId),
          stats,
        };
      })
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

  const formatStat = (value) => {
    if (value === null || value === undefined) {
      return "0";
    }

    return value;
  };

  const getTeamAverages = (teamId) => {
  const team = standings.find(
    (item) => item.id === teamId
  );

  if (!team || team.gamesPlayed <= 0) {
    return {
      pointsFor: null,
      pointsAgainst: null,
    };
  }

  return {
    pointsFor: (
      team.pointsFor / team.gamesPlayed
    ).toFixed(1),

    pointsAgainst: (
      team.pointsAgainst / team.gamesPlayed
    ).toFixed(1),
  };
};

  const selectedMatchStats = selectedMatch
    ? getMatchStats(selectedMatch)
    : null;

  const selectedMatchHomeTeam = selectedMatch
    ? getTeam(selectedMatch.homeTeam)
    : null;

  const selectedMatchAwayTeam = selectedMatch
    ? getTeam(selectedMatch.awayTeam)
    : null;

  const selectedUpcomingHomeTeam = selectedUpcomingMatch
    ? getTeam(selectedUpcomingMatch.homeTeam)
    : null;

  const selectedUpcomingAwayTeam = selectedUpcomingMatch
    ? getTeam(selectedUpcomingMatch.awayTeam)
    : null;

  const changeDate = (amount) => {
    const [year, month, day] = selectedDate
      .split("-")
      .map(Number);

    const currentDate = new Date(year, month - 1, day);

    currentDate.setDate(currentDate.getDate() + amount);

    setSelectedDate(getLocalDateString(currentDate));
  };

  const formatDate = (date) => {
    const [year, month, day] = date
      .split("-")
      .map(Number);

    const selected = new Date(year, month - 1, day);

    const weekdays = [
      "Dom",
      "Lun",
      "Mar",
      "Mié",
      "Jue",
      "Vie",
      "Sáb",
    ];

    return `${weekdays[selected.getDay()]} ${day}/${month}`;
  };

  const getDateLabel = (date) => {
    if (date === today) {
      return "HOY";
    }

    const [year, month, day] = date
      .split("-")
      .map(Number);

    const selected = new Date(year, month - 1, day);
    const todayDate = new Date();

    todayDate.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);

    const difference = Math.round(
      (selected - todayDate) / (1000 * 60 * 60 * 24)
    );

    if (difference === -1) {
      return "AYER";
    }

    if (difference === 1) {
      return "MAÑANA";
    }

    return formatDate(date);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedPlayer(null);
        setSelectedTeam(null);
        setSelectedMatch(null);
        setSelectedUpcomingMatch(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
  let active = true;

  const fetchLiveMatches = async () => {
    try {
      const response = await fetch(
        "https://lna-live.lnab.workers.dev/api/live",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!active) {
        return;
      }

      setLiveMatches(
        Array.isArray(data.liveMatches)
          ? data.liveMatches
          : []
      );
    } catch (error) {
      console.error(
        "Error obteniendo partidos LIVE:",
        error
      );
    }
  };

  fetchLiveMatches();

  const interval = setInterval(
    fetchLiveMatches,
    10000
  );

  return () => {
    active = false;
    clearInterval(interval);
  };
}, []);

  const standings = useMemo(() => {
    return teams
      .map((team) => {
        const teamMatches = matches.filter(
          (match) =>
            isMatchFinished(match) &&
            (match.homeTeam === team.id ||
              match.awayTeam === team.id)
        );

        let wins = 0;
        let losses = 0;
        let pointsFor = 0;
        let pointsAgainst = 0;

        teamMatches.forEach((match) => {
          const isHome = match.homeTeam === team.id;

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
          }

          if (teamScore < opponentScore) {
            losses++;
          }
        });

        return {
          ...team,
          gamesPlayed: teamMatches.length,
          wins,
          losses,
          pointsFor,
          pointsAgainst,
          difference: pointsFor - pointsAgainst,
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

  const selectedDayMatches = useMemo(() => {
    return matches
      .filter((match) => match.date === selectedDate)
      .sort((a, b) => {
        const getStatusOrder = (match) => {
          if (isMatchFinished(match)) {
            return 0;
          }

          if (match.status === "live") {
            return 1;
          }

          return 2;
        };

        const statusA = getStatusOrder(a);
        const statusB = getStatusOrder(b);

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        return (a.time || "").localeCompare(b.time || "");
      });
  }, [selectedDate]);

  const topScorers = useMemo(() => {
    return players
      .map((player) => {
        const stats = getPlayerStats(player.id);
        const team = getTeam(player.teamId);

        return {
          ...player,
          team,
          stats,
          points: stats?.points ?? null,
        };
      })
      .filter(
        (player) => player.stats?.gamesPlayed > 0
      )
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return a.name.localeCompare(b.name, "es");
      })
      .slice(0, 5);
  }, []);

    

  return (
    <main className="home-page">
      <section className="home-content">
        <div className="home-container">
          {liveMatches.length > 0 && (
  <section className="home-live-panel">
   <div className="home-live-header">
  <div>
    <span>ACTUALIDAD</span>
    <h2>
      {liveMatches.some(
        (match) => match.status === "live"
      )
        ? "Partidos en vivo"
        : "Últimos partidos"}
    </h2>
  </div>

  <div className="home-live-indicator">
    <span></span>
    {liveMatches.some(
      (match) => match.status === "live"
    )
      ? "EN VIVO"
      : "FINALIZADO"}
  </div>
</div>

    <div className="home-live-matches">
      {liveMatches.map((liveMatch) => {
        const homeTeam = getTeam(liveMatch.homeTeam);
        const awayTeam = getTeam(liveMatch.awayTeam);

        return (
          <article
            key={liveMatch.eventId}
            className="home-live-match"
          >
            <div className="home-live-team home-live-team-home">
              {homeTeam && (
                <img
                  src={homeTeam.logo}
                  alt={`Escudo de ${homeTeam.name}`}
                />
              )}

              <strong>
                {homeTeam?.shortName ||
                  liveMatch.homeName}
              </strong>
            </div>

            <div className="home-live-score">
  <span>
    {liveMatch.status === "finished"
      ? "FINALIZADO"
      : "EN VIVO"}
  </span>

  <strong>
    {liveMatch.homeScore} - {liveMatch.awayScore}
  </strong>

  {liveMatch.status === "finished" ? (
    <small className="home-live-period">
      FINALIZADO
    </small>
  ) : liveMatch.isHalftime ? (
    <small className="home-live-period">
      ENTRETIEMPO
    </small>
  ) : liveMatch.quarter ? (
    <small className="home-live-period">
      {liveMatch.quarter}.º CUARTO
      {liveMatch.minutesRemaining !== null &&
      liveMatch.minutesRemaining !== undefined
        ? ` · ${String(
            liveMatch.minutesRemaining
          ).padStart(2, "0")} MIN`
        : ""}
    </small>
  ) : null}
</div>

            <div className="home-live-team home-live-team-away">
              {awayTeam && (
                <img
                  src={awayTeam.logo}
                  alt={`Escudo de ${awayTeam.name}`}
                />
              )}

              <strong>
                {awayTeam?.shortName ||
                  liveMatch.awayName}
              </strong>
            </div>
          </article>
        );
      })}
    </div>
  </section>
)}

<div className="home-dashboard"></div>
          <div className="home-dashboard">

            {/* TABLA DE POSICIONES */}

            <section className="home-panel standings-panel">
              <div className="home-panel-header">
                <div>
                  <span>TEMPORADA</span>
                  <h2>Tabla de posiciones</h2>
                </div>

                <Link to="/liga">
                  Ver liga →
                </Link>
              </div>

              <div className="standings-table">
                <div className="standings-table-header">
                  <span>#</span>
                  <span>Equipo</span>
                  <span>PG</span>
                  <span>PP</span>
                </div>

                {standings.map((team, index) => (
                  <button
                    key={team.id}
                    type="button"
                    className="home-standing-row"
                    onClick={() => setSelectedTeam(team)}
                  >
                    <span
  className={`standing-position ${
    index + 1 <= 4
      ? "standing-position-direct"
      : index + 1 <= 12
        ? "standing-position-reclasificacion"
        : index + 1 >= 17
          ? "standing-position-descenso"
          : ""
  }`}
>
  {index + 1}
</span>

                    <span className="home-standing-team">
                      <img
                        src={team.logo}
                        alt={`Escudo de ${team.name}`}
                      />

                      <span>
                        {team.shortName}
                      </span>
                    </span>

                    <strong>{team.wins}</strong>
                    <strong>{team.losses}</strong>
                  </button>
                ))}
              </div>
            </section>

            {/* FIXTURE */}

            <section className="home-panel fixture-panel">
              <div className="home-panel-header">
                <div>
                  <span>{getDateLabel(selectedDate)}</span>
                  <h2>Fixture</h2>
                </div>

                <Link to="/liga">
                  Ver todos →
                </Link>
              </div>

              <div className="fixture-date-navigation">
                <button
                  type="button"
                  className="fixture-day-button"
                  onClick={() => changeDate(-1)}
                  aria-label="Día anterior"
                >
                  ←
                </button>

                <div className="fixture-selected-date">
                  <strong>
                    {formatDate(selectedDate)}
                  </strong>
                </div>

                <button
                  type="button"
                  className="fixture-day-button"
                  onClick={() => changeDate(1)}
                  aria-label="Día siguiente"
                >
                  →
                </button>
              </div>

              {selectedDayMatches.length > 0 ? (
                <div className="home-fixtures">
                  {selectedDayMatches.map((match) => {
                    const homeTeam = getTeam(match.homeTeam);
                    const awayTeam = getTeam(match.awayTeam);

                    const homeRecord = homeTeam
                      ? getTeamRecord(homeTeam.id)
                      : { wins: 0, losses: 0 };

                    const awayRecord = awayTeam
                      ? getTeamRecord(awayTeam.id)
                      : { wins: 0, losses: 0 };

                    const homePosition = homeTeam
                      ? getTeamPosition(homeTeam.id)
                      : null;

                    const awayPosition = awayTeam
                      ? getTeamPosition(awayTeam.id)
                      : null;

                    const liveMatch = liveMatches.find(
  (live) =>
    live.homeTeam === match.homeTeam &&
    live.awayTeam === match.awayTeam &&
    live.status === "live"
);

const isFinished = isMatchFinished(match);

const isLive =
  !isFinished &&
  (Boolean(liveMatch) || match.status === "live");

                    const hasMatchStats =
                      Boolean(getMatchStats(match));

                    const openMatchStats = () => {
                      if (isFinished) {
                        if (!hasMatchStats) {
                          return;
                        }

                        setSelectedMatch(match);
                        return;
                      }

                      if (match.status === "scheduled") {
                        setSelectedUpcomingMatch(match);
                      }
                    };

                    const isClickable =
                      (isFinished && hasMatchStats) ||
                      (match.status === "scheduled" &&
                        !isFinished);

                    return (
                      <article
                        className={`home-fixture ${
                          isFinished
                            ? "home-fixture-finished"
                            : ""
                        } ${
                          isLive
                            ? "home-fixture-live"
                            : ""
                        } ${
                          isClickable
                            ? "home-fixture-clickable"
                            : ""
                        }`}
                        key={match.id}
                        onClick={
                          isClickable
                            ? openMatchStats
                            : undefined
                        }
                        onKeyDown={(event) => {
                          if (!isClickable) {
                            return;
                          }

                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            openMatchStats();
                          }
                        }}
                        role={
                          isClickable
                            ? "button"
                            : undefined
                        }
                        tabIndex={
                          isClickable ? 0 : undefined
                        }
                      >
                        <div className="fixture-team fixture-home">
                          <div className="fixture-team-name">
                            <span>
                              {homeTeam?.shortName}
                            </span>

                            {homeTeam && (
                              <small>
                                {homePosition}° •{" "}
                                {homeRecord.wins}-
                                {homeRecord.losses}
                              </small>
                            )}
                          </div>

                          {homeTeam && (
                            <img
                              src={homeTeam.logo}
                              alt={`Escudo de ${homeTeam.name}`}
                            />
                          )}
                        </div>

                        <div className="fixture-center">
                          {isFinished ? (
                            <>
                              <strong className="fixture-score">
                                {match.homeScore} -{" "}
                                {match.awayScore}
                              </strong>

                              <span>FINAL</span>
                            </>
                          ) : isLive ? (
  <>
    <strong className="fixture-live-text">
      EN VIVO
    </strong>

    <span>
      {liveMatch?.homeScore ?? match.homeScore} -{" "}
      {liveMatch?.awayScore ?? match.awayScore}
    </span>

    {liveMatch?.isHalftime ? (
      <small className="fixture-live-period">
        ENTRETIEMPO
      </small>
    ) : liveMatch?.quarter ? (
      <small className="fixture-live-period">
        {liveMatch.quarter}.º CUARTO
        {liveMatch.minutesRemaining !== null &&
        liveMatch.minutesRemaining !== undefined
          ? ` · ${String(
              liveMatch.minutesRemaining
            ).padStart(2, "0")} MIN`
          : ""}
      </small>
    ) : null}
  </>
) : (
                            <>
                              <strong className="fixture-time">
                                {match.status ===
                                "postponed"
                                  ? "APLAZADO"
                                  : match.time ||
                                    "VS"}
                              </strong>

                              {match.tv &&
                                match.tv.length > 0 && (
                                  <span className="fixture-tv">
                                    {match.tv.join(
                                      " · "
                                    )}
                                  </span>
                                )}
                            </>
                          )}
                        </div>

                        <div className="fixture-team fixture-away">
                          {awayTeam && (
                            <img
                              src={awayTeam.logo}
                              alt={`Escudo de ${awayTeam.name}`}
                            />
                          )}

                          <div className="fixture-team-name">
                            <span>
                              {awayTeam?.shortName}
                            </span>

                            {awayTeam && (
                              <small>
                                {awayPosition}° •{" "}
                                {awayRecord.wins}-
                                {awayRecord.losses}
                              </small>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="home-no-games">
                  <span>SIN PARTIDOS</span>

                  <h3>No hay partidos</h3>

                  <p>
                    No hay encuentros programados
                    para el{" "}
                    {formatDate(selectedDate)}.
                  </p>
                </div>
              )}
            </section>

            {/* MÁXIMOS ANOTADORES */}

            <section className="home-panel scorers-panel">
              <div className="home-panel-header">
                <div>
                  <span>ESTADÍSTICAS</span>
                  <h2>Máximos anotadores</h2>
                </div>

                <Link to="/estadisticas">
                  Ver todos →
                </Link>
              </div>

              <div className="home-scorers">
                {topScorers.length > 0 ? (
                  topScorers.map((player, index) => (
                    <button
                      key={player.id}
                      type="button"
                      className="home-scorer"
                      onClick={() =>
                        setSelectedPlayer(player)
                      }
                    >
                      <span className="scorer-position">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="scorer-info">
                        {player.team && (
                          <img
                            src={player.team.logo}
                            alt={`Escudo de ${player.team.name}`}
                          />
                        )}

                        <div className="scorer-player-data">
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {player.team?.shortName ||
                              "Sin equipo"}
                          </span>
                        </div>
                      </div>

                      <div className="scorer-points">
                        <strong>
                          {player.points.toFixed(1)}
                        </strong>

                        <span>PTS</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="home-no-scorers">
                    <span>SIN DATOS</span>

                    <p>
                      Todavía no hay estadísticas
                      disponibles.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* POPUP DEL EQUIPO */}

      {selectedTeam && (
        <div
          className="home-modal-overlay"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="home-team-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="home-team-modal-header">
              <div className="home-team-modal-heading">
                <span>EQUIPO</span>

                <h2>{selectedTeam.name}</h2>

                <p>
                  {selectedTeam.city},{" "}
                  {selectedTeam.province}
                </p>
              </div>

              <button
                type="button"
                className="home-modal-close"
                onClick={() =>
                  setSelectedTeam(null)
                }
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="home-team-modal-main">
              <div className="home-team-modal-identity">
                <div className="home-team-modal-logo">
                  <button
                    type="button"
                    className="home-modal-team-logo-button"
                    onClick={() =>
                      goToTeam(selectedTeam.id)
                    }
                    aria-label={`Ir al equipo ${selectedTeam.name}`}
                  >
                    <img
                      src={selectedTeam.logo}
                      alt={`Escudo de ${selectedTeam.name}`}
                    />
                  </button>
                </div>

                <div>
                  <span>
                    LIGA NACIONAL 2026/27
                  </span>

                  <strong>
                    {selectedTeam.shortName}
                  </strong>

                  <p>
                    {selectedTeam.city},{" "}
                    {selectedTeam.province}
                  </p>
                </div>
              </div>

            <div className="home-team-modal-record">
  <div>
    <span>PJ</span>
    <strong>
      {selectedTeam.gamesPlayed}
    </strong>
  </div>

  <div>
    <span>PG</span>
    <strong className="home-team-win">
      {selectedTeam.wins}
    </strong>
  </div>

  <div>
    <span>PP</span>
    <strong className="home-team-loss">
      {selectedTeam.losses}
    </strong>
  </div>

  <div>
    <span>DIF</span>
    <strong>
      {selectedTeam.difference > 0
        ? `+${selectedTeam.difference}`
        : selectedTeam.difference}
    </strong>
  </div>

  <div>
    <span>PTS/P</span>
    <strong>
      {selectedTeam.gamesPlayed > 0
        ? (
            selectedTeam.pointsFor /
            selectedTeam.gamesPlayed
          ).toFixed(1)
        : "—"}
    </strong>
  </div>

  <div>
    <span>REC/P</span>
    <strong>
      {selectedTeam.gamesPlayed > 0
        ? (
            selectedTeam.pointsAgainst /
            selectedTeam.gamesPlayed
          ).toFixed(1)
        : "—"}
    </strong>
  </div>
</div>

              <Link
                to={`/equipos/${selectedTeam.id}`}
                className="home-team-modal-link"
                onClick={() =>
                  setSelectedTeam(null)
                }
              >
                Ver equipo completo →
              </Link>
            </div>

            <div className="home-team-modal-footer">
              <span>LNA</span>

              <strong>
                {selectedTeam.abbreviation}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PARTIDO TERMINADO */}

      {selectedMatch && (
        <div
          className="match-modal-overlay match-modal-finished-overlay"
          onClick={() => setSelectedMatch(null)}
        >
          <div className="match-modal-finished-scroll">
            <div
              className="match-modal match-modal-finished"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                className="match-modal-close"
                type="button"
                onClick={() =>
                  setSelectedMatch(null)
                }
                aria-label="Cerrar"
              >
                ×
              </button>

              <div className="match-modal-header">
                <span className="match-modal-label">
                  LIGA NACIONAL 2026/27
                </span>

                <strong className="match-modal-date">
                  {formatDate(
                    selectedMatch.date
                  )}
                </strong>

                <span className="match-modal-status">
                  FINAL
                </span>

                <div className="match-modal-teams">
                  <div className="match-modal-team">
                    {selectedMatchHomeTeam && (
                      <button
                        type="button"
                        className="home-modal-team-logo-button"
                        onClick={() =>
                          goToTeam(
                            selectedMatchHomeTeam.id
                          )
                        }
                        aria-label={`Ir al equipo ${selectedMatchHomeTeam.name}`}
                      >
                        <img
                          src={
                            selectedMatchHomeTeam.logo
                          }
                          alt={`Escudo de ${selectedMatchHomeTeam.name}`}
                        />
                      </button>
                    )}

                    <strong>
                      {selectedMatchHomeTeam?.shortName ||
                        selectedMatchHomeTeam?.name}

                      {selectedMatchHomeTeam && (
                        <small>
                          {getTeamPosition(
                            selectedMatchHomeTeam.id
                          )}
                          ° •{" "}
                          {
                            getTeamRecord(
                              selectedMatchHomeTeam.id
                            ).wins
                          }
                          -
                          {
                            getTeamRecord(
                              selectedMatchHomeTeam.id
                            ).losses
                          }
                        </small>
                      )}
                    </strong>
                  </div>

                  <div className="match-modal-score">
                    <strong>
                      {selectedMatch.homeScore} -{" "}
                      {selectedMatch.awayScore}
                    </strong>
                  </div>

                  <div className="match-modal-team">
                    {selectedMatchAwayTeam && (
                      <button
                        type="button"
                        className="home-modal-team-logo-button"
                        onClick={() =>
                          goToTeam(
                            selectedMatchAwayTeam.id
                          )
                        }
                        aria-label={`Ir al equipo ${selectedMatchAwayTeam.name}`}
                      >
                        <img
                          src={
                            selectedMatchAwayTeam.logo
                          }
                          alt={`Escudo de ${selectedMatchAwayTeam.name}`}
                        />
                      </button>
                    )}

                    <strong>
                      {selectedMatchAwayTeam?.shortName ||
                        selectedMatchAwayTeam?.name}

                      {selectedMatchAwayTeam && (
                        <small>
                          {getTeamPosition(
                            selectedMatchAwayTeam.id
                          )}
                          ° •{" "}
                          {
                            getTeamRecord(
                              selectedMatchAwayTeam.id
                            ).wins
                          }
                          -
                          {
                            getTeamRecord(
                              selectedMatchAwayTeam.id
                            ).losses
                          }
                        </small>
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {selectedMatchStats ? (
                <div className="match-modal-content">
                  <section className="match-stats-team">
                    <div className="match-stats-team-header">
                      <div>
                        {selectedMatchHomeTeam && (
                          <img
                            src={
                              selectedMatchHomeTeam.logo
                            }
                            alt=""
                          />
                        )}

                        <div>
                          <span>LOCAL</span>

                          <h3>
                            {selectedMatchHomeTeam?.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="match-stats-head">
                      <span>JUGADOR</span>
                      <span>PTS</span>
                      <span>REB</span>
                      <span>AST</span>
                      <span>MIN</span>
                    </div>

                    <div className="match-stats-list">
                      {(
                        selectedMatchStats[
                          selectedMatch.homeTeam
                        ] || []
                      )
                        .slice()
                        .sort(
                          (a, b) =>
                            (Number(b.points) || 0) -
                            (Number(a.points) || 0)
                        )
                        .map((player) => (
                          <button
                            type="button"
                            className="match-stat-player"
                            key={player.id}
                            onClick={(event) => {
                              event.stopPropagation();

                              const playerInfo =
                                getMatchPlayerInfo(
                                  player
                                );

                              if (!playerInfo) {
                                return;
                              }

                              setSelectedPlayer(
                                playerInfo
                              );
                            }}
                          >
                            <strong>
                              {player.name}
                            </strong>

                            <span>
                              {formatStat(
                                player.points
                              )}
                            </span>

                            <span>
                              {formatStat(
                                player.rebounds
                              )}
                            </span>

                            <span>
                              {formatStat(
                                player.assists
                              )}
                            </span>

                            <span>
                              {player.minutes || "—"}
                            </span>
                          </button>
                        ))}
                    </div>
                  </section>

                  <section className="match-stats-team">
                    <div className="match-stats-team-header">
                      <div>
                        {selectedMatchAwayTeam && (
                          <img
                            src={
                              selectedMatchAwayTeam.logo
                            }
                            alt=""
                          />
                        )}

                        <div>
                          <span>VISITANTE</span>

                          <h3>
                            {selectedMatchAwayTeam?.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="match-stats-head">
                      <span>JUGADOR</span>
                      <span>PTS</span>
                      <span>REB</span>
                      <span>AST</span>
                      <span>MIN</span>
                    </div>

                    <div className="match-stats-list">
                      {(
                        selectedMatchStats[
                          selectedMatch.awayTeam
                        ] || []
                      )
                        .slice()
                        .sort(
                          (a, b) =>
                            (Number(b.points) || 0) -
                            (Number(a.points) || 0)
                        )
                        .map((player) => (
                          <button
                            type="button"
                            className="match-stat-player"
                            key={player.id}
                            onClick={(event) => {
                              event.stopPropagation();

                              const playerInfo =
                                getMatchPlayerInfo(
                                  player
                                );

                              if (!playerInfo) {
                                return;
                              }

                              setSelectedPlayer(
                                playerInfo
                              );
                            }}
                          >
                            <strong>
                              {player.name}
                            </strong>

                            <span>
                              {formatStat(
                                player.points
                              )}
                            </span>

                            <span>
                              {formatStat(
                                player.rebounds
                              )}
                            </span>

                            <span>
                              {formatStat(
                                player.assists
                              )}
                            </span>

                            <span>
                              {player.minutes || "—"}
                            </span>
                          </button>
                        ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="match-modal-no-stats">
                  <span>📊</span>

                  <h3>
                    Estadísticas no disponibles
                  </h3>

                  <p>
                    La planilla detallada de este
                    partido todavía no fue cargada.
                  </p>
                </div>
              )}

              <div className="match-modal-footer">
                <span>LNA</span>

                <strong>
                  ESTADÍSTICAS DEL PARTIDO
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PRÓXIMO PARTIDO */}

      {selectedUpcomingMatch && (
        <div
          className="match-modal-overlay"
          onClick={() =>
            setSelectedUpcomingMatch(null)
          }
        >
          <div
            className="match-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="match-modal-close"
              type="button"
              onClick={() =>
                setSelectedUpcomingMatch(null)
              }
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="match-modal-header">
              <span className="match-modal-label">
                LIGA NACIONAL 2026/27
              </span>

              <strong className="match-modal-date">
                {formatDate(
                  selectedUpcomingMatch.date
                )}
              </strong>

              <span className="match-modal-status">
                PRÓXIMO PARTIDO
              </span>

              <div className="match-modal-teams">
                <div className="match-modal-team">
                  {selectedUpcomingHomeTeam && (
                    <button
                      type="button"
                      className="home-modal-team-logo-button"
                      onClick={() =>
                        goToTeam(
                          selectedUpcomingHomeTeam.id
                        )
                      }
                      aria-label={`Ir al equipo ${selectedUpcomingHomeTeam.name}`}
                    >
                      <img
                        src={
                          selectedUpcomingHomeTeam.logo
                        }
                        alt={`Escudo de ${selectedUpcomingHomeTeam.name}`}
                      />
                    </button>
                  )}

                  <strong>
                    {selectedUpcomingHomeTeam?.shortName ||
                      selectedUpcomingHomeTeam?.name}

                    {selectedUpcomingHomeTeam && (
                      <small>
                        {getTeamPosition(
                          selectedUpcomingHomeTeam.id
                        )}
                        ° •{" "}
                        {
                          getTeamRecord(
                            selectedUpcomingHomeTeam.id
                          ).wins
                        }
                        -
                        {
                          getTeamRecord(
                            selectedUpcomingHomeTeam.id
                          ).losses
                        }
                      </small>
                    )}
                  </strong>
                </div>

                <div className="match-modal-score">
                  <strong>
                    {selectedUpcomingMatch.time ||
                      "VS"}
                  </strong>

                  {selectedUpcomingMatch.tv &&
                    selectedUpcomingMatch.tv.length >
                      0 && (
                      <span>
                        {selectedUpcomingMatch.tv.join(
                          " · "
                        )}
                      </span>
                    )}
                </div>

                <div className="match-modal-team">
                  {selectedUpcomingAwayTeam && (
                    <button
                      type="button"
                      className="home-modal-team-logo-button"
                      onClick={() =>
                        goToTeam(
                          selectedUpcomingAwayTeam.id
                        )
                      }
                      aria-label={`Ir al equipo ${selectedUpcomingAwayTeam.name}`}
                    >
                      <img
                        src={
                          selectedUpcomingAwayTeam.logo
                        }
                        alt={`Escudo de ${selectedUpcomingAwayTeam.name}`}
                      />
                    </button>
                  )}

                  <strong>
                    {selectedUpcomingAwayTeam?.shortName ||
                      selectedUpcomingAwayTeam?.name}

                    {selectedUpcomingAwayTeam && (
                      <small>
                        {getTeamPosition(
                          selectedUpcomingAwayTeam.id
                        )}
                        ° •{" "}
                        {
                          getTeamRecord(
                            selectedUpcomingAwayTeam.id
                          ).wins
                        }
                        -
                        {
                          getTeamRecord(
                            selectedUpcomingAwayTeam.id
                          ).losses
                        }
                      </small>
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <section className="match-highlighted-section">
              <div className="match-highlighted-title">
                <span>PROMEDIOS DE TEMPORADA</span>

                <h3>
                  Jugadores destacados
                </h3>
              </div>

              <div className="match-highlighted-teams">
                <div className="match-highlighted-team">
                  <div className="match-highlighted-team-header">
                    {selectedUpcomingHomeTeam && (
                      <img
                        src={
                          selectedUpcomingHomeTeam.logo
                        }
                        alt=""
                      />
                    )}

                    <div className="match-highlighted-team-title">
                      <strong>
                        {selectedUpcomingHomeTeam?.shortName ||
                          selectedUpcomingHomeTeam?.name}
                      </strong>

                      <div className="team-form">
                        {selectedUpcomingHomeTeam &&
                          getRecentForm(
                            selectedUpcomingHomeTeam.id
                          ).map(
                            (result, index) => (
                              <span
                                key={`${selectedUpcomingHomeTeam.id}-form-${index}`}
                                className={`team-form-result ${
                                  result === "G"
                                    ? "team-form-win"
                                    : "team-form-loss"
                                }`}
                              >
                                {result}
                              </span>
                            )
                          )}
                      </div>
                    </div>
                  </div>
                  {selectedUpcomingHomeTeam && (
  <div className="match-highlighted-team-averages">
    <div>
      <span>PTS/P</span>
      <strong>
        {
          getTeamAverages(
            selectedUpcomingHomeTeam.id
          ).pointsFor ?? "—"
        }
      </strong>
    </div>

    <div>
      <span>REC/P</span>
      <strong>
        {
          getTeamAverages(
            selectedUpcomingHomeTeam.id
          ).pointsAgainst ?? "—"
        }
      </strong>
    </div>
  </div>
)}

                  <div className="match-highlighted-grid">
                    <div className="match-highlighted-category">
                      <span>PUNTOS</span>

                      {getHighlightedPlayers(
                        selectedUpcomingMatch.homeTeam,
                        "points"
                      ).map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          className="match-highlighted-player"
                          onClick={() =>
                            setSelectedPlayer(
                              player
                            )
                          }
                        >
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {formatStat(
                              Number(
                                player.stats.points
                              ).toFixed(1)
                            )}{" "}
                            PTS
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="match-highlighted-category">
                      <span>REBOTES</span>

                      {getHighlightedPlayers(
                        selectedUpcomingMatch.homeTeam,
                        "rebounds"
                      ).map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          className="match-highlighted-player"
                          onClick={() =>
                            setSelectedPlayer(
                              player
                            )
                          }
                        >
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {formatStat(
                              Number(
                                player.stats.rebounds
                              ).toFixed(1)
                            )}{" "}
                            REB
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="match-highlighted-category">
                      <span>ASISTENCIAS</span>

                      {getHighlightedPlayers(
                        selectedUpcomingMatch.homeTeam,
                        "assists"
                      ).map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          className="match-highlighted-player"
                          onClick={() =>
                            setSelectedPlayer(
                              player
                            )
                          }
                        >
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {formatStat(
                              Number(
                                player.stats.assists
                              ).toFixed(1)
                            )}{" "}
                            AST
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="match-highlighted-team">
                  <div className="match-highlighted-team-header">
                    {selectedUpcomingAwayTeam && (
                      <img
                        src={
                          selectedUpcomingAwayTeam.logo
                        }
                        alt=""
                      />
                    )}

                    <div className="match-highlighted-team-title">
                      <strong>
                        {selectedUpcomingAwayTeam?.shortName ||
                          selectedUpcomingAwayTeam?.name}
                      </strong>

                      <div className="team-form">
                        {selectedUpcomingAwayTeam &&
                          getRecentForm(
                            selectedUpcomingAwayTeam.id
                          ).map(
                            (result, index) => (
                              <span
                                key={`${selectedUpcomingAwayTeam.id}-form-${index}`}
                                className={`team-form-result ${
                                  result === "G"
                                    ? "team-form-win"
                                    : "team-form-loss"
                                }`}
                              >
                                {result}
                              </span>
                            )
                          )}
                      </div>
                    </div>
                  </div>
{selectedUpcomingAwayTeam && (
  <div className="match-highlighted-team-averages">
    <div>
      <span>PTS/P</span>
      <strong>
        {
          getTeamAverages(
            selectedUpcomingAwayTeam.id
          ).pointsFor ?? "—"
        }
      </strong>
    </div>

    <div>
      <span>REC/P</span>
      <strong>
        {
          getTeamAverages(
            selectedUpcomingAwayTeam.id
          ).pointsAgainst ?? "—"
        }
      </strong>
    </div>
  </div>
)}
                  <div className="match-highlighted-grid">
                    <div className="match-highlighted-category">
                      <span>PUNTOS</span>

                      {getHighlightedPlayers(
                        selectedUpcomingMatch.awayTeam,
                        "points"
                      ).map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          className="match-highlighted-player"
                          onClick={() =>
                            setSelectedPlayer(
                              player
                            )
                          }
                        >
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {formatStat(
                              Number(
                                player.stats.points
                              ).toFixed(1)
                            )}{" "}
                            PTS
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="match-highlighted-category">
                      <span>REBOTES</span>

                      {getHighlightedPlayers(
                        selectedUpcomingMatch.awayTeam,
                        "rebounds"
                      ).map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          className="match-highlighted-player"
                          onClick={() =>
                            setSelectedPlayer(
                              player
                            )
                          }
                        >
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {formatStat(
                              Number(
                                player.stats.rebounds
                              ).toFixed(1)
                            )}{" "}
                            REB
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="match-highlighted-category">
                      <span>ASISTENCIAS</span>

                      {getHighlightedPlayers(
                        selectedUpcomingMatch.awayTeam,
                        "assists"
                      ).map((player) => (
                        <button
                          type="button"
                          key={player.id}
                          className="match-highlighted-player"
                          onClick={() =>
                            setSelectedPlayer(
                              player
                            )
                          }
                        >
                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {formatStat(
                              Number(
                                player.stats.assists
                              ).toFixed(1)
                            )}{" "}
                            AST
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="match-modal-footer">
              <span>LNA</span>

              <strong>
                PROMEDIOS DE TEMPORADA
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DEL JUGADOR */}

      {selectedPlayer && (
        <div
          className="home-modal-overlay"
          onClick={() =>
            setSelectedPlayer(null)
          }
        >
          <div
            className="home-player-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="home-player-modal-header">
              {selectedPlayer.team && (
                <div className="home-player-modal-logo">
                  <button
                    type="button"
                    className="home-player-modal-logo-button"
                    onClick={() =>
                      goToTeam(
                        selectedPlayer.team.id
                      )
                    }
                    aria-label={`Ir al equipo ${selectedPlayer.team.name}`}
                  >
                    <img
                      src={
                        selectedPlayer.team.logo
                      }
                      alt={`Escudo de ${selectedPlayer.team.name}`}
                    />
                  </button>
                </div>
              )}

              <div className="home-player-modal-info">
                <span>
                  {selectedPlayer.position}
                </span>

                <h2>
                  {selectedPlayer.name}
                </h2>

                <p>
                  {selectedPlayer.team?.name ||
                    "Equipo no disponible"}
                </p>

                <small>
                  {selectedPlayer.nationality}
                </small>
              </div>

              <button
                type="button"
                className="home-modal-close"
                onClick={() =>
                  setSelectedPlayer(null)
                }
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="home-player-modal-details">
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

            <div className="home-player-modal-season">
              <span className="home-player-modal-label">
                ESTADÍSTICAS DE LA TEMPORADA
              </span>

              <div className="home-player-modal-stats">
                <div>
                  <strong>
                    {selectedPlayer.stats
                      ?.gamesPlayed ?? 0}
                  </strong>

                  <span>PJ</span>
                </div>

                <div>
                  <strong>
                    {selectedPlayer.stats
                      ?.points != null
                      ? selectedPlayer.stats.points.toFixed(
                          1
                        )
                      : "—"}
                  </strong>

                  <span>PTS</span>
                </div>

                <div>
                  <strong>
                    {selectedPlayer.stats
                      ?.rebounds != null
                      ? selectedPlayer.stats.rebounds.toFixed(
                          1
                        )
                      : "—"}
                  </strong>

                  <span>REB</span>
                </div>

                <div>
                  <strong>
                    {selectedPlayer.stats
                      ?.assists != null
                      ? selectedPlayer.stats.assists.toFixed(
                          1
                        )
                      : "—"}
                  </strong>

                  <span>AST</span>
                </div>
              </div>
            </div>

            <div className="home-player-modal-footer">
              <span>
                LIGA NACIONAL 2026/27
              </span>

              <strong>
                {selectedPlayer.team?.shortName ||
                  ""}
              </strong>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;