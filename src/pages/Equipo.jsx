import { createPortal } from "react-dom";
import PlayerModal from "../components/PlayerModal";
import MatchStatsTabs from "../components/MatchStatsTabs";
import { useState } from "react";

import { Link, useParams, useNavigate } from "react-router-dom";


import "./Equipo.css";
import "./Home.css";
import { getOfficialValuation } from "../utils/getOfficialValuation";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { matches } from "../data/matches";
import { playerStats } from "../data/stats";
import { matchPlayerStats } from "../data/matchStats";


function getTeam(teamId) {
  return teams.find(
    (team) => team.id === teamId
  );
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
    .filter(
      (player) =>
        player.teamId === teamId
    )
    .sort((a, b) => {
      const positionA =
        positionOrder[a.position] || 99;

      const positionB =
        positionOrder[b.position] || 99;

      if (positionA !== positionB) {
        return positionA - positionB;
      }

      return a.name.localeCompare(
        b.name,
        "es"
      );
    });
}


/*
 * Todos los partidos del equipo.
 */
function getMatches(teamId) {
  return matches
    .filter(
      (match) =>
        match.homeTeam === teamId ||
        match.awayTeam === teamId
    );
}


function getPlayerStats(playerId) {
  return playerStats.find(
    (stats) =>
      stats.playerId === playerId
  );
}

function getPlayerLastMatches(player) {
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

      const teamStats = getMatchStats(match)?.[teamId];

      return (
        Array.isArray(teamStats) &&
        teamStats.some((item) => item.id === player.id)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2)
    .map((match) => {
      const stats = getMatchStats(match)[player.teamId].find(
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
        points: stats.points,
        rebounds: stats.rebounds,
        assists: stats.assists,
      };
    });
}

function getPlayer(playerId, playerName) {
  return players.find(
    (player) =>
      player.id === playerId ||
      player.name === playerName
  );
}


function formatDate(date) {
  const dateObject = new Date(
    `${date}T12:00:00`
  );

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(dateObject);
}


function formatDay(date) {
  const dateObject = new Date(
    `${date}T12:00:00`
  );

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      weekday: "short",
    }
  )
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
  const finishedMatches =
    matches.filter(
      (match) =>
        match.status === "finished" &&
        (
          match.homeTeam === teamId ||
          match.awayTeam === teamId
        )
    );

  let wins = 0;
  let losses = 0;

  finishedMatches.forEach(
    (match) => {
      const home =
        match.homeTeam === teamId;

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
    }
  );

  return {
    wins,
    losses,
  };
}


function getTeamPosition(teamId) {
  const standings = teams
    .map((team) => ({
      id: team.id,
      ...getTeamRecord(team.id),
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return a.losses - b.losses;
    });

  const index = standings.findIndex(
    (team) => team.id === teamId
  );

  return index === -1 ? null : index + 1;
}


function getTeamLastTwoMatches(teamId) {
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
}

function getRecentForm(teamId) {
  const finishedMatches = matches
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
    .slice(0, 3)
    .reverse();

  return finishedMatches.map((match) => {
    const isHome = match.homeTeam === teamId;

    const teamScore = Number(
      isHome ? match.homeScore : match.awayScore
    );

    const opponentScore = Number(
      isHome ? match.awayScore : match.homeScore
    );

    return teamScore > opponentScore ? "G" : "P";
  });
}

function getTeamAverages(teamId) {
  const finishedMatches = matches.filter(
    (match) =>
      match.status === "finished" &&
      match.homeScore != null &&
      match.awayScore != null &&
      (match.homeTeam === teamId ||
        match.awayTeam === teamId)
  );

  if (finishedMatches.length === 0) {
    return {
      pointsFor: null,
      pointsAgainst: null,
    };
  }

  let pointsFor = 0;
  let pointsAgainst = 0;

  finishedMatches.forEach((match) => {
    const isHome = match.homeTeam === teamId;

    pointsFor += Number(
      isHome ? match.homeScore : match.awayScore
    );

    pointsAgainst += Number(
      isHome ? match.awayScore : match.homeScore
    );
  });

  return {
    pointsFor: (
      pointsFor / finishedMatches.length
    ).toFixed(1),

    pointsAgainst: (
      pointsAgainst / finishedMatches.length
    ).toFixed(1),
  };
}

// Promedios colectivos oficiales: únicamente partidos finalizados de 2026/27.
function getOfficialTeamSeasonStats(teamId) {
  const keys = ["rebounds", "assists", "steals", "blocks", "turnovers", "fouls"];
  const shooting = ["fieldGoals", "twoPointers", "threePointers", "freeThrows"];
  const totals = Object.fromEntries(keys.map(key => [key, 0]));
  const shots = Object.fromEntries(shooting.map(key => [key, { made: 0, attempted: 0 }]));
  let games = 0;
  let points = 0;
  let pointsAgainst = 0;
  const seen = new Set();

  for (const match of matches) {
    if (match.status !== "finished" || !/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
    if (match.homeTeam !== teamId && match.awayTeam !== teamId) continue;
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(key)) continue;
    const record = getMatchStats(match);
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
    const collective = record.teamStats?.[teamId];
    if (!collective || !keys.every(k => Number.isFinite(Number(collective[k]))) ||
        !shooting.every(k => Number.isFinite(Number(collective[k]?.made)) &&
          Number.isFinite(Number(collective[k]?.attempted)) &&
          Number(collective[k].attempted) >= Number(collective[k].made))) continue;
    const score = match.homeTeam === teamId ? match.homeScore : match.awayScore;
    const opponentScore = match.homeTeam === teamId ? match.awayScore : match.homeScore;
    if (score == null || opponentScore == null || !Number.isFinite(Number(score)) || !Number.isFinite(Number(opponentScore))) continue;
    seen.add(key);
    games += 1;
    points += Number(score);
    pointsAgainst += Number(opponentScore);
    keys.forEach(k => { totals[k] += Number(collective[k]); });
    shooting.forEach(k => {
      shots[k].made += Number(collective[k].made);
      shots[k].attempted += Number(collective[k].attempted);
    });
  }

  if (!games) return { games: 0, values: {} };
  const values = { points: (points / games).toFixed(1), pointsAgainst: (pointsAgainst / games).toFixed(1) };
  keys.forEach(k => { values[k] = (totals[k] / games).toFixed(1); });
  shooting.forEach(k => {
    values[k] = shots[k].attempted ? (100 * shots[k].made / shots[k].attempted).toFixed(1) + "%" : "—";
  });
  return { games, values };
}

function getHighlightedPlayers(teamId, stat) {
  return players
    .filter((player) => player.teamId === teamId)
    .map((player) => {
      const stats = playerStats.find(
        (item) => item.playerId === player.id
      );

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
}



/* =========================================
   BUSCAR ESTADÍSTICAS DEL PARTIDO
   ========================================= */

function getMatchStats(match) {
  if (!match) return null;

  const matchKey = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const directStats = matchPlayerStats[match.id] || matchPlayerStats[matchKey];
  if (directStats) return directStats;

  // Los partidos enlazados a la Liga Nacional no usan fallback legado.
  if (match.officialUrl) return null;

  const legacyKey = `${match.homeTeam}-${match.awayTeam}`;
  return matchPlayerStats[legacyKey] || null;
}


/* =========================================
   FORMATO DE ESTADÍSTICAS
   ========================================= */

function formatStat(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

  return value;
}


/* =========================================
   COMPONENTE PRINCIPAL
   ========================================= */

function Equipo() {
  const { teamId } = useParams();

const navigate = useNavigate();

  const [selectedPlayer, setSelectedPlayer] =
    useState(null);

  const [selectedMatch, setSelectedMatch] =
    useState(null);

const [selectedUpcomingMatch, setSelectedUpcomingMatch] =
  useState(null);

const goToTeam = (targetTeamId) => {
  if (!targetTeamId) return;

  setSelectedPlayer(null);
  setSelectedMatch(null);
  setSelectedUpcomingMatch(null);

  navigate(`/equipos/${targetTeamId}`);
};


    const [resultsPage, setResultsPage] = useState(null);

  const team = getTeam(teamId);


  /* =========================================
     EQUIPO NO ENCONTRADO
     ========================================= */

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

            <h1>
              Equipo no encontrado
            </h1>

            <p>
              El equipo que estás buscando
              no existe en nuestra base de datos.
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


  /* =========================================
     DATOS DEL EQUIPO
     ========================================= */

  const teamPlayers =
    getPlayers(teamId);

  const teamMatches =
    getMatches(teamId);

  const teamRecord =
    getTeamRecord(teamId);

  const seasonCollective = getOfficialTeamSeasonStats(teamId);


  /* =========================================
     PRÓXIMOS PARTIDOS
     MÁS CERCANO → MÁS LEJANO
     ========================================= */

  const upcomingMatches =
    teamMatches
      .filter(
        (match) =>
          match.status === "scheduled"
      )
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(
            b.date
          );
        }

        return (
          (a.time || "").localeCompare(
            b.time || ""
          )
        );
      })
      .slice(0, 6);


  /* =========================================
     RESULTADOS
     MÁS RECIENTE → MÁS ANTIGUO
     ========================================= */

  
const allFinishedMatches = teamMatches
  .filter((match) => match.status === "finished")
  .sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    return (b.time || "").localeCompare(a.time || "");
  });

const resultsPerPage = 10;
const totalResultsPages = Math.ceil(
  allFinishedMatches.length / resultsPerPage
);

const currentResultsPage = Math.min(
  Math.max(resultsPage ?? totalResultsPages - 1, 0),
  Math.max(totalResultsPages - 1, 0)
);

const finishedMatches = allFinishedMatches.slice(
  (totalResultsPages - 1 - currentResultsPage) * resultsPerPage,
  (totalResultsPages - currentResultsPage) * resultsPerPage
);



  /* =========================================
     STATS DEL JUGADOR
     ========================================= */

  const selectedPlayerStats =
    selectedPlayer
      ? getPlayerStats(
          selectedPlayer.id
        )
      : null;


  /* =========================================
     STATS DEL PARTIDO
     ========================================= */

  const selectedMatchStats =
    selectedMatch
      ? getMatchStats(
          selectedMatch
        )
      : null;

  const selectedMatchHomeTeam =
    selectedMatch
      ? getTeam(
          selectedMatch.homeTeam
        )
      : null;

  const selectedMatchAwayTeam =
    selectedMatch
      ? getTeam(
          selectedMatch.awayTeam
        )
      : null;

// MVP: valoración oficial máxima entre los dos equipos del partido.
const selectedMatchMvp = selectedMatch && selectedMatchStats
  ? [selectedMatch.homeTeam, selectedMatch.awayTeam]
      .flatMap(teamId => (selectedMatchStats[teamId] || []).map(player => ({
        player, teamId, team: getTeam(teamId),
        valuation: getOfficialValuation(selectedMatch, teamId, player.id),
      })))
      .filter(item => item.valuation != null && Number.isFinite(Number(item.valuation)))
      .sort((a, b) => Number(b.valuation) - Number(a.valuation) || (Number(b.player.points) || 0) - (Number(a.player.points) || 0))[0] || null
  : null;

const selectedUpcomingHomeTeam = selectedUpcomingMatch
  ? getTeam(selectedUpcomingMatch.homeTeam)
  : null;

const selectedUpcomingAwayTeam = selectedUpcomingMatch
  ? getTeam(selectedUpcomingMatch.awayTeam)
  : null;


  return (
    <main className="team-page">


      {/* =========================================
          HEADER DEL EQUIPO
          ========================================= */}

      
<section className="team-header">

  <img
    className="team-header-watermark"
    src={team.logo}
    alt=""
    aria-hidden="true"
  />

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
                {team.city},{" "}
                {team.province}
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =========================================
          CONTENIDO
          ========================================= */}

      <section className="team-content">

        <div className="page-container">


          {/* =========================================
              INFORMACIÓN
              ========================================= */}

          <section className="team-season-stats team-season-stats-sport" aria-label="Promedios colectivos oficiales 2026/27">
            <div className="team-season-stats-heading">
              <div>
                <span className="team-season-stats-eyebrow">ESTADÍSTICAS OFICIALES</span>
                <h2>Promedios del equipo <em>2026/27</em></h2>
              </div>
              <strong className="team-season-stats-games">{seasonCollective.games} PJ con datos</strong>
            </div>
            {seasonCollective.games === 0 ? (
              <p className="team-season-stats-empty">Todavía no hay partidos finalizados con estadísticas colectivas oficiales completas para este equipo.</p>
            ) : (
              <>
                <div className="team-season-stats-grid">
                  {[
                    ["points", "Puntos / partido"],
                    ["pointsAgainst", "Pts recibidos / partido"],
                    ["rebounds", "Rebotes / partido"],
                    ["assists", "Asistencias / partido"],
                    ["steals", "Recuperaciones / partido"],
                    ["blocks", "Tapones / partido"],
                    ["turnovers", "Pérdidas / partido"],
                    ["fouls", "Faltas / partido"],
                  ].map(([key, label]) => (
                    <div className="team-season-stat" key={key}>
                      <div className="team-season-stat-info">
                        <strong>{seasonCollective.values[key]}</strong>
                        <span>{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <h3 className="team-season-shooting-heading">PORCENTAJES DE TIRO</h3>
                <div className="team-season-stats-grid team-season-shooting-grid">
                  {[
                    ["fieldGoals", "Tiros de campo"],
                    ["twoPointers", "Tiros de 2"],
                    ["threePointers", "Triples"],
                    ["freeThrows", "Tiros libres"],
                  ].map(([key, label]) => (
                    <div className="team-season-stat" key={key}>
                      <div className="team-season-stat-info">
                        <strong>{seasonCollective.values[key]}</strong>
                        <span>{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="team-season-stats-note">Solo temporada 2026/27 · Partidos finalizados con estadísticas oficiales validadas. Los porcentajes se calculan sobre el total de lanzamientos.</p>
          </section>

          {/* =========================================
              TRES COLUMNAS
              ========================================= */}

          <div className="team-columns">


            {/* =========================================
                COLUMNA 1
                JUGADORES
                ========================================= */}

            <section className="team-section">

              <div className="section-heading-team">

                <div>

                  <h2>
  <span>PLANTEL</span>
</h2>

                  

                </div>

                <strong>
                  {teamPlayers.length}
                </strong>

              </div>


              {teamPlayers.length > 0 ? (

               
<div className="team-roster-table">

  <div className="team-roster-head">
    <span>JUGADOR</span>
    <span>POS</span>
    <span>PJ</span>
    <span>PTS</span>
    <span>REB</span>
    <span>AST</span>
  </div>

  {teamPlayers.map((player) => {
    const stats = getPlayerStats(player.id);

    return (
      <button
        key={player.id}
        type="button"
        className="team-roster-row"
        onClick={() => setSelectedPlayer(player)}
      >
        <span className="team-roster-name">
          {player.name}
        </span>

        <span className="team-roster-pos">
          {player.position}
        </span>

        <span>{stats?.gamesPlayed ?? 0}</span>
        <span>{stats?.points?.toFixed(1) ?? "—"}</span>
        <span>{stats?.rebounds?.toFixed(1) ?? "—"}</span>
        <span>{stats?.assists?.toFixed(1) ?? "—"}</span>
      </button>
    );
  })}

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
                      Próximamente vamos a
                      agregar los jugadores
                      de este equipo.
                    </p>

                  </div>

                </div>

              )}

            </section>


            {/* =========================================
                COLUMNA 2
                PRÓXIMOS PARTIDOS
                ========================================= */}

            <section className="team-section">

              <div className="section-heading-team">

                <div>

                  <span>
                    AGENDA
                  </span>

                  <h2>
  PRÓXIMOS <span>PARTIDOS</span>
</h2>

                </div>

                <strong>
                  {upcomingMatches.length}
                </strong>

              </div>


              {upcomingMatches.length > 0 ? (

                <div className="team-matches">

                  {upcomingMatches.map(
                    (match) => {

                     
const homeTeam = getTeam(match.homeTeam);
const awayTeam = getTeam(match.awayTeam);

const home = isHome(match, teamId);


                      return (

                       
<button
  type="button"
  className="team-match-row team-match-clickable"
  key={match.id}
  onClick={() => setSelectedUpcomingMatch(match)}
  title="Ver información del partido"
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
                              )}{" "}
                              ·{" "}
                              {home
                                ? "LOCAL"
                                : "VISITANTE"}
                            </span>

                          </div>


                          
<div className="team-match-opponent team-match-versus">

  <div className="team-match-side">
    {homeTeam && (
      <img
        src={homeTeam.logo}
        alt={`Escudo de ${homeTeam.name}`}
        className="team-match-logo"
      />
    )}

    <strong>
      {homeTeam?.shortName || homeTeam?.name}
    </strong>
  </div>

  <span className="team-match-vs">
    VS
  </span>

  <div className="team-match-side">
    {awayTeam && (
      <img
        src={awayTeam.logo}
        alt={`Escudo de ${awayTeam.name}`}
        className="team-match-logo"
      />
    )}

    <strong>
      {awayTeam?.shortName || awayTeam?.name}
    </strong>
  </div>

</div>



                          <div className="team-match-time">

                            {match.time ||
                              "A confirmar"}

                          </div>

                        </button>

                      );
                    }
                  )}

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


            {/* =========================================
                COLUMNA 3
                RESULTADOS
                ========================================= */}

            <section className="team-section">

              <div className="section-heading-team">

                <div>

                  <span>
                    RESULTADOS
                  </span>

                  
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }}
>
  <h2>
  ÚLTIMOS <span>PARTIDOS</span>
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
        onClick={() => setResultsPage(currentResultsPage - 1)}
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
        onClick={() => setResultsPage(currentResultsPage + 1)}
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

                <strong>
                  {allFinishedMatches.length}
                </strong>

              </div>


              {finishedMatches.length > 0 ? (

                <div className="team-matches">

                  {finishedMatches.map(
                    (match) => {

                      
const homeTeam = getTeam(match.homeTeam);
const awayTeam = getTeam(match.awayTeam);


                      const home =
                        isHome(
                          match,
                          teamId
                        );

                      const hasStats =
                        Boolean(
                          getMatchStats(
                            match
                          )
                        );


                      const teamScore = home
                        ? match.homeScore
                        : match.awayScore;

                      const opponentScore = home
                        ? match.awayScore
                        : match.homeScore;

                      const resultClass =
                        teamScore > opponentScore
                          ? "team-result-win"
                          : teamScore < opponentScore
                            ? "team-result-loss"
                            : "";


                      return (

                        <button
                          type="button"
                          className="team-match-row team-match-clickable"
                          key={match.id}
                          onClick={() =>
                            setSelectedMatch(
                              match
                            )
                          }
                          title={
                            hasStats
                              ? "Ver estadísticas del partido"
                              : "Ver información del partido"
                          }
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
                              )}{" "}
                              ·{" "}
                              {home
                                ? "LOCAL"
                                : "VISITANTE"}
                            </span>

                          </div>


                          
<div className="team-match-opponent team-match-versus team-result-versus">

  <div className="team-match-side">
    {homeTeam && (
      <img
        src={homeTeam.logo}
        alt={`Escudo de ${homeTeam.name}`}
        className="team-match-logo"
      />
    )}
    <strong>
      {homeTeam?.shortName || homeTeam?.name}
    </strong>
  </div>

  <div className={`team-result-center ${resultClass}`}>
    {match.homeScore} - {match.awayScore}
  </div>

  <div className="team-match-side">
    {awayTeam && (
      <img
        src={awayTeam.logo}
        alt={`Escudo de ${awayTeam.name}`}
        className="team-match-logo"
      />
    )}
    <strong>
      {awayTeam?.shortName || awayTeam?.name}
    </strong>
  </div>

</div>



                         

                        </button>

                      );
                    }
                  )}

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

        </div>

      </section>


      {/* =========================================
          POP-UP DEL JUGADOR
          MISMA ESTRUCTURA QUE ESTADÍSTICAS
          ========================================= */}

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          team={team}
          stats={selectedPlayerStats}
          onClose={() => setSelectedPlayer(null)}
          onTeamClick={goToTeam}
        />
      )}

            {/* =========================================
          POP-UP DEL PARTIDO
          ========================================= */}

      {selectedMatch && createPortal(
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
                      <span className={Number(selectedMatch.homeScore) > Number(selectedMatch.awayScore) ? "match-score-winner" : "match-score-loser"}>
                        {selectedMatch.homeScore}
                      </span>
                      <span className="match-score-dash"> - </span>
                      <span className={Number(selectedMatch.awayScore) > Number(selectedMatch.homeScore) ? "match-score-winner" : "match-score-loser"}>
                        {selectedMatch.awayScore}
                      </span>
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
              {selectedMatchStats?.quarterScores?.length > 0 && (
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

            {selectedMatchStats.quarterScores.map((quarter) => (
              <th key={quarter.period}>
                {quarter.period === "OT" || quarter.period === "PR"
                  ? "PR"
                  : `${quarter.period}C`}
              </th>
            ))}

            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <th>
  {selectedMatchHomeTeam?.shortName || selectedMatch.homeTeam}
</th>

            {selectedMatchStats.quarterScores.map((quarter) => (
              <td key={quarter.period}>{quarter.home}</td>
            ))}

            <td className="match-quarters-total">
              {selectedMatch.homeScore}
            </td>
          </tr>

          <tr>
           <th>
  {selectedMatchAwayTeam?.shortName || selectedMatch.awayTeam}
</th>

            {selectedMatchStats.quarterScores.map((quarter) => (
              <td key={quarter.period}>{quarter.away}</td>
            ))}

            <td className="match-quarters-total">
              {selectedMatch.awayScore}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
)}

              {selectedMatchStats ? (
                <MatchStatsTabs
                  key={selectedMatch.date + selectedMatch.homeTeam + selectedMatch.awayTeam}
                  match={selectedMatch}
                  stats={selectedMatchStats}
                  home={selectedMatchHomeTeam}
                  away={selectedMatchAwayTeam}
                >
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
                      <span>VAL</span>
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
                                getPlayer(player.id, player.name);

                              if (!playerInfo) {
                                return;
                              }

                              setSelectedMatch(null);
                              setSelectedPlayer(playerInfo);
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
                            <span>
  {getOfficialValuation(
    selectedMatch,
    selectedMatch.homeTeam,
    player.id
  ) ?? "—"}
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
                      <span>VAL</span>
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
                                getPlayer(player.id, player.name);

                              if (!playerInfo) {
                                return;
                              }

                              setSelectedMatch(null);
                              setSelectedPlayer(playerInfo);
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
                            <span>
  {getOfficialValuation(
    selectedMatch,
    selectedMatch.awayTeam,
    player.id
  ) ?? "—"}
</span>
                          </button>
                        ))}
                    </div>
                  </section>
                </div>
                </MatchStatsTabs>
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

              {selectedMatchMvp && (
                <button type="button" className="match-mvp-card"
                  aria-label={`Abrir ficha de ${selectedMatchMvp.player.name}, jugador del partido`}
                  onClick={(event) => {
                    event.stopPropagation();
                    const playerInfo = players.find(p => p.id === selectedMatchMvp.player.id);
                    if (playerInfo) setSelectedPlayer(playerInfo);
                  }}>
                  <span className="match-mvp-heading">♛ JUGADOR DEL PARTIDO</span>
                  <span className="match-mvp-body">
                    <span className="match-mvp-identity">
                      {selectedMatchMvp.team?.logo && <img src={selectedMatchMvp.team.logo} alt="" />}
                      <span className="match-mvp-name">
                        <strong>{selectedMatchMvp.player.name}</strong>
                        <small>{selectedMatchMvp.team?.name || selectedMatchMvp.teamId}</small>
                      </span>
                    </span>
                    <span className="match-mvp-numbers">
                      <span><strong>{selectedMatchMvp.player.points ?? "—"}</strong><small>PTS</small></span>
                      <span><strong>{selectedMatchMvp.player.rebounds ?? "—"}</strong><small>REB</small></span>
                      <span><strong>{selectedMatchMvp.player.assists ?? "—"}</strong><small>AST</small></span>
                      <span><strong>{selectedMatchMvp.player.minutes || "—"}</strong><small>MIN</small></span>
                      <span className="match-mvp-valuation"><strong>{selectedMatchMvp.valuation}</strong><small>VAL</small></span>
                    </span>
                  </span>
                </button>
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
      , document.body)}
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
        className="match-modal-close"
        type="button"
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
            {selectedUpcomingHomeTeam && (
              <button
                type="button"
                className="home-modal-team-logo-button"
                onClick={() =>
                  goToTeam(selectedUpcomingHomeTeam.id)
                }
                aria-label={`Ir al equipo ${selectedUpcomingHomeTeam.name}`}
              >
                <img
                  src={selectedUpcomingHomeTeam.logo}
                  alt={`Escudo de ${selectedUpcomingHomeTeam.name}`}
                />
              </button>
            )}

            <strong>
              {selectedUpcomingHomeTeam?.shortName ||
                selectedUpcomingHomeTeam?.name}

              {selectedUpcomingHomeTeam && (
                <small>
                  {getTeamPosition(selectedUpcomingHomeTeam.id)}
                  ° •{" "}
                  {getTeamRecord(selectedUpcomingHomeTeam.id).wins}
                  -
                  {getTeamRecord(selectedUpcomingHomeTeam.id).losses}
                </small>
              )}
            </strong>
          </div>

          <div className="match-modal-score">
            <strong>
              {selectedUpcomingMatch.time || "VS"}
            </strong>

            {selectedUpcomingMatch.tv?.length > 0 && (
              <span>
                {Array.isArray(selectedUpcomingMatch.tv)
                  ? selectedUpcomingMatch.tv.join(" · ")
                  : selectedUpcomingMatch.tv}
              </span>
            )}
          </div>

          <div className="match-modal-team">
            {selectedUpcomingAwayTeam && (
              <button
                type="button"
                className="home-modal-team-logo-button"
                onClick={() =>
                  goToTeam(selectedUpcomingAwayTeam.id)
                }
                aria-label={`Ir al equipo ${selectedUpcomingAwayTeam.name}`}
              >
                <img
                  src={selectedUpcomingAwayTeam.logo}
                  alt={`Escudo de ${selectedUpcomingAwayTeam.name}`}
                />
              </button>
            )}

            <strong>
              {selectedUpcomingAwayTeam?.shortName ||
                selectedUpcomingAwayTeam?.name}

              {selectedUpcomingAwayTeam && (
                <small>
                  {getTeamPosition(selectedUpcomingAwayTeam.id)}
                  ° •{" "}
                  {getTeamRecord(selectedUpcomingAwayTeam.id).wins}
                  -
                  {getTeamRecord(selectedUpcomingAwayTeam.id).losses}
                </small>
              )}
            </strong>
          </div>
        </div>
      </div>

<section className="match-highlighted-section">
  <div className="upcoming-team-comparison">
    <span className="upcoming-comparison-label">
      COMPARATIVA DE EQUIPOS
    </span>

    {[
      ["PTS/P", "pointsFor"],
      ["REC/P", "pointsAgainst"],
    ].map(([label, key]) => {
      const homeValue = getTeamAverages(selectedUpcomingMatch.homeTeam)[key];
      const awayValue = getTeamAverages(selectedUpcomingMatch.awayTeam)[key];
      const maxValue = Math.max(Number(homeValue) || 0, Number(awayValue) || 0, 1);
      return (
        <div className="upcoming-comparison-row upcoming-comparison-stat" key={key}>
          <strong>{homeValue ?? "—"}</strong>
          <div className="upcoming-comparison-track" aria-hidden="true">
            <span style={{ width: `${(Math.max(0, Number(homeValue) || 0) / maxValue) * 100}%` }} />
          </div>
          <span>{label}</span>
          <div className="upcoming-comparison-track" aria-hidden="true">
            <span style={{ width: `${(Math.max(0, Number(awayValue) || 0) / maxValue) * 100}%` }} />
          </div>
          <strong>{awayValue ?? "—"}</strong>
        </div>
      );
    })}
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
              onClick={() => {
                setSelectedUpcomingMatch(null);
                setSelectedMatch(match);
              }}
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
                  <span>
                    {match.home?.shortName || match.homeTeam}
                  </span>
                </div>

                <strong>
                  {match.homeScore} - {match.awayScore}
                </strong>

                <div className="upcoming-last-score-team">
                  {match.away?.logo && (
                    <img src={match.away.logo} alt="" />
                  )}
                  <span>
                    {match.away?.shortName || match.awayTeam}
                  </span>
                </div>
              </div>

              <span
                className={
                  match.result === "G" ? "is-win" : "is-loss"
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
  <h3>JUGADORES DESTACADOS</h3>
  <span className="upcoming-highlighted-subtitle">PROMEDIOS DE TEMPORADA</span>
</div>

<div className="match-highlighted-teams">
  <div className="match-highlighted-team">
    <div className="match-highlighted-team-header">
      {selectedUpcomingHomeTeam && (
        <img
          src={selectedUpcomingHomeTeam.logo}
          alt=""
        />
      )}

      <div className="match-highlighted-team-title">
        <strong>
          {selectedUpcomingHomeTeam?.shortName ||
            selectedUpcomingHomeTeam?.name}
        </strong>

        <div className="team-form">
          {getRecentForm(
            selectedUpcomingMatch.homeTeam
          ).map((result, index) => (
            <span
              key={index}
              className={`team-form-result ${
                result === "G"
                  ? "team-form-win"
                  : "team-form-loss"
              }`}
            >
              {result}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="match-highlighted-grid">
      {[
        ["PUNTOS", "points", "PTS"],
        ["REBOTES", "rebounds", "REB"],
        ["ASISTENCIAS", "assists", "AST"],
      ].map(([label, stat, unit]) => (
        <div
          className="match-highlighted-category"
          key={stat}
        >
          <span>{label}</span>

          {getHighlightedPlayers(
            selectedUpcomingMatch.homeTeam,
            stat
          ).map((player) => (
            <button
              type="button"
              key={player.id}
              className="match-highlighted-player"
              onClick={() => {
                setSelectedUpcomingMatch(null);
                setSelectedPlayer(player);
              }}
            >
              <strong>{player.name}</strong>

              <span>
                {Number(player.stats[stat]).toFixed(1)}{" "}
                {unit}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  </div>
  
<div className="match-highlighted-team">
  <div className="match-highlighted-team-header">
    {selectedUpcomingAwayTeam && (
      <img
        src={selectedUpcomingAwayTeam.logo}
        alt=""
      />
    )}

    <div className="match-highlighted-team-title">
      <strong>
        {selectedUpcomingAwayTeam?.shortName ||
          selectedUpcomingAwayTeam?.name}
      </strong>

      <div className="team-form">
        {getRecentForm(
          selectedUpcomingMatch.awayTeam
        ).map((result, index) => (
          <span
            key={index}
            className={`team-form-result ${
              result === "G"
                ? "team-form-win"
                : "team-form-loss"
            }`}
          >
            {result}
          </span>
        ))}
      </div>
    </div>
  </div>

  <div className="match-highlighted-grid">
    {[
      ["PUNTOS", "points", "PTS"],
      ["REBOTES", "rebounds", "REB"],
      ["ASISTENCIAS", "assists", "AST"],
    ].map(([label, stat, unit]) => (
      <div
        className="match-highlighted-category"
        key={stat}
      >
        <span>{label}</span>

        {getHighlightedPlayers(
          selectedUpcomingMatch.awayTeam,
          stat
        ).map((player) => (
          <button
            type="button"
            key={player.id}
            className="match-highlighted-player"
            onClick={() => {
              setSelectedUpcomingMatch(null);
              setSelectedPlayer(player);
            }}
          >
            <strong>{player.name}</strong>

            <span>
              {Number(player.stats[stat]).toFixed(1)}{" "}
              {unit}
            </span>
          </button>
        ))}
      </div>
    ))}
  </div>
</div>

</div>

</section>

    </div>
  </div>
, document.body)}

    </main>
  );
}

export default Equipo;