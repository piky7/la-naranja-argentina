import { isPlayerAppearance } from "../utils/playerAppearance";
import useLiveMatch from "../hooks/useLiveMatch";
import LiveMatchInfo from "../components/LiveMatchInfo";
import CategoryBalance from "../components/CategoryBalance";
import "../components/UpcomingHeader.css";
import MatchVote from "../components/MatchVote";
import { createPortal } from "react-dom";
import PlayerModal from "../components/PlayerModal";
import FinishedMatchModal from "../components/FinishedMatchModal";
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

function getPlayerValuationAverage(player) {
  const seen = new Set();
  let total = 0, games = 0;
  for (const match of matches) {
    if (match.status !== "finished" || (match.homeTeam !== player.teamId && match.awayTeam !== player.teamId)) continue;
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const valuation = getOfficialValuation(match, player.teamId, player.id);
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    const entry = record?.[player.teamId]?.find((item) => item.id === player.id);
    if (!entry || !isPlayerAppearance(entry) || valuation == null || !Number.isFinite(Number(valuation))) continue;
    total += Number(valuation); games++;
  }
  return games ? (total / games).toFixed(1) : "—";
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
        teamStats.some((item) => item.id === player.id && isPlayerAppearance(item))
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
  const dateObject = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(dateObject);
}

// Fecha deportiva abreviada solo para las tarjetas del equipo.
function formatMatchCardDate(date) {
  const dateObject = new Date(`${date}T12:00:00`);
  const day = new Intl.DateTimeFormat("es-AR", { day: "2-digit" }).format(dateObject);
  const month = new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(dateObject).replace(".", "").toUpperCase();
  return `${day} ${month}`;
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

const UPCOMING_COLLECTIVE_STATS = [
  ["Puntos", "points", false], ["Recibidos", "pointsAgainst", true],
  ["Rebotes", "rebounds", false], ["Asistencias", "assists", false],
  ["Recuperaciones", "steals", false], ["Tapones", "blocks", false],
  ["Pérdidas", "turnovers", true], ["Faltas", "fouls", true],
  ["Tiros de campo", "fieldGoals", false], ["Dobles", "twoPointers", false],
  ["Triples", "threePointers", false], ["Libres", "freeThrows", false],
];

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


// Puestos oficiales comparables entre los 18 equipos (solo planillas válidas).
// Los empates comparten posición; equipos sin dato no reciben puesto.
const UPCOMING_COLLECTIVE_RANKS = Object.fromEntries(
  UPCOMING_COLLECTIVE_STATS.map(([, key, lowerIsBetter]) => {
    const entries = teams.map(team => ({
      id: team.id,
      value: getUpcomingOfficialCollective(team.id).values[key],
    })).filter(item => Number.isFinite(item.value));
    entries.sort((a, b) => (lowerIsBetter ? a.value - b.value : b.value - a.value));
    const ranks = {};
    entries.forEach((item, index) => {
      const previous = entries[index - 1];
      ranks[item.id] = previous && previous.value === item.value
        ? ranks[previous.id] : index + 1;
    });
    return [key, ranks];
  })
);

function Equipo() {
  const { teamId } = useParams();

const navigate = useNavigate();

  const [selectedPlayer, setSelectedPlayer] =
    useState(null);

  const [selectedMatch, setSelectedMatch] =
    useState(null);

const [selectedUpcomingMatch, setSelectedUpcomingMatch] =
  useState(null);
const upcomingLive = useLiveMatch(selectedUpcomingMatch);
const [upcomingTab, setUpcomingTab] = useState('comparativa');

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



const getOfficialPlayerLeaders = (teamId, field) => {
    const totals = new Map();
    const seen = new Set();
    for (const match of matches) {
      if (match.status !== "finished" || !/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
      if (match.homeTeam !== teamId && match.awayTeam !== teamId) continue;
      const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
      if (seen.has(key)) continue;
      const record = matchPlayerStats[key] || matchPlayerStats[match.id];
      if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
      const roster = record[teamId];
      if (!Array.isArray(roster)) continue;
      seen.add(key);
      roster.forEach(entry => {
        const value = Number(entry[field]);
        if (!entry.id || entry[field] == null || !Number.isFinite(value)) return;
        const old = totals.get(entry.id) || { sum: 0, games: 0 };
        totals.set(entry.id, { sum: old.sum + value, games: old.games + 1 });
      });
    }
    return players.filter(player => player.teamId === teamId && totals.has(player.id))
      .map(player => ({ ...player, team: getTeam(teamId), stats: { [field]: totals.get(player.id).sum / totals.get(player.id).games } }))
      .sort((a, b) => b.stats[field] - a.stats[field]).slice(0, 2);
  };

  const upcomingLeaderCategories = [
    { title: "PUNTOS", icon: "🏀", key: "points" },
    { title: "VALORACIÓN", icon: "★", key: "valuation" },
    { title: "REBOTES", icon: "↟", key: "rebounds" },
    { title: "ASISTENCIAS", icon: "↗", key: "assists" },
  ];


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

          <section className="team-season-stats team-season-stats-sport" aria-label="Promedios colectivos 2026/27">
            <div className="team-season-stats-heading">
              <div>
                <span className="team-season-stats-eyebrow">ESTADÍSTICAS DEL EQUIPO</span>
                <h2>Promedios del equipo <em>2026/27</em></h2>
              </div>
              <strong className="team-season-stats-games">{seasonCollective.games} PJ con datos</strong>
            </div>
            {seasonCollective.games === 0 ? (
              <p className="team-season-stats-empty">Todavía no hay partidos finalizados con estadísticas colectivas completas para este equipo.</p>
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
            <p className="team-season-stats-note">Solo temporada 2026/27 · Partidos finalizados con estadísticas disponibles. Los porcentajes se calculan sobre el total de lanzamientos.</p>
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
    <span>MIN</span>
    <span>VAL</span>
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
        <span className="team-roster-name"><img className="team-roster-crest" src={team.logo} alt="" aria-hidden="true" /><span>{player.name}</span></span>

        <span className="team-roster-pos">
          {player.position}
        </span>

        <span>{stats?.gamesPlayed ?? 0}</span>
        <span>{stats?.points?.toFixed(1) ?? "—"}</span>
        <span>{stats?.rebounds?.toFixed(1) ?? "—"}</span>
        <span>{stats?.assists?.toFixed(1) ?? "—"}</span>
        <span className="team-roster-min">{Number.isFinite(stats?.minutes) ? `${String(Math.floor(Math.round(stats.minutes * 60) / 60)).padStart(2, "0")}:${String(Math.round(stats.minutes * 60) % 60).padStart(2, "0")}` : "—"}</span>
        <span className="team-roster-val">{getPlayerValuationAverage(player)}</span>
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
  className="team-match-row team-match-clickable team-match-modern"
  key={match.id}
  onClick={() => setSelectedUpcomingMatch(match)}
  title="Ver información del partido"
>


                          <div className="team-match-date team-match-date-modern">

                            <small className="team-card-weekday">{formatDay(match.date).toUpperCase()}</small>
                            <strong>
                              {formatMatchCardDate(match.date)}
                            </strong>
                            <span>{home ? "LOCAL" : "VISITANTE"}</span>

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



                          <div className="team-match-time team-match-time-modern">

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
                          className="team-match-row team-match-clickable team-match-modern team-match-modern-result"
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

                          <div className="team-match-date team-match-date-modern">

                            <small className="team-card-weekday">{formatDay(match.date).toUpperCase()}</small>
                            <strong>
                              {formatMatchCardDate(match.date)}
                            </strong>
                            <span>{home ? "LOCAL" : "VISITANTE"}</span>

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
          team={getTeam(selectedPlayer.teamId) || team}
          stats={selectedPlayerStats}
          onClose={() => setSelectedPlayer(null)}
          onTeamClick={goToTeam}
        />
      )}

            {/* =========================================
          POP-UP DEL PARTIDO
          ========================================= */}

      {selectedMatch && (
        <FinishedMatchModal
          selectedMatch={selectedMatch}
          selectedMatchStats={selectedMatchStats}
          selectedMatchHomeTeam={selectedMatchHomeTeam}
          selectedMatchAwayTeam={selectedMatchAwayTeam}
          getTeamPosition={getTeamPosition}
          getTeamRecord={getTeamRecord}
          getMatchPlayerInfo={(player) => getPlayer(player.id, player.name)}
          goToTeam={goToTeam}
          onClose={() => setSelectedMatch(null)}
          onPlayerClick={(player) => { setSelectedMatch(null); setSelectedPlayer(player); }}
        />
      )}
{/* POPUP PRÓXIMO PARTIDO */}

      {selectedUpcomingMatch && !selectedMatch && createPortal(
        <div
          className="match-modal-overlay"
          onClick={() =>
            setSelectedUpcomingMatch(null)
          }
        >
          <div
          className={`match-modal match-modal-upcoming${upcomingLive ? " match-modal-is-live" : ""}`}
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
              <div className="upcoming-header-meta">
                <span className="match-modal-label">LIGA NACIONAL 2026/27</span>
                <strong className="match-modal-date">{formatDate(selectedUpcomingMatch.date)}</strong>
              </div>
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
                  <span className="match-modal-status">{upcomingLive ? `● EN VIVO · ${upcomingLive.isHalftime ? "ENTRETIEMPO" : upcomingLive.quarter ? `${upcomingLive.quarter}° CUARTO` : "PARTIDO EN JUEGO"}` : "PRÓXIMO PARTIDO"}</span>
                  <strong>
                    {upcomingLive && upcomingLive.homeScore != null && upcomingLive.awayScore != null && Number.isFinite(Number(upcomingLive.homeScore)) && Number.isFinite(Number(upcomingLive.awayScore)) ? `${upcomingLive.homeScore} - ${upcomingLive.awayScore}` : selectedUpcomingMatch.time || "VS"}
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

            <LiveMatchInfo live={upcomingLive} homeName={selectedUpcomingHomeTeam?.shortName || selectedUpcomingHomeTeam?.name || selectedUpcomingMatch.homeTeam} awayName={selectedUpcomingAwayTeam?.shortName || selectedUpcomingAwayTeam?.name || selectedUpcomingMatch.awayTeam} />
            <MatchVote match={selectedUpcomingMatch} />
            <div className="upcoming-tabs" role="tablist" aria-label="Información del próximo partido">
              <button type="button" role="tab" aria-selected={upcomingTab === "comparativa"} className={upcomingTab === "comparativa" ? "is-active" : ""} onClick={() => setUpcomingTab("comparativa")}>▥ Comparativa de equipos</button>
              <button type="button" role="tab" aria-selected={upcomingTab === "jugadores"} className={upcomingTab === "jugadores" ? "is-active" : ""} onClick={() => setUpcomingTab("jugadores")}>♟ Jugadores destacados</button>
            </div>
            <section className="match-highlighted-section">
              {upcomingTab === "comparativa" && (<div className="upcoming-tab-panel" role="tabpanel">
              {/* COMPARATIVA DE EQUIPOS */}

<div className="upcoming-team-comparison upcoming-official-comparison">
  <span className="upcoming-comparison-label">COMPARATIVA COLECTIVA · 2026/27</span>
  {(() => {
    const home = getUpcomingOfficialCollective(selectedUpcomingMatch.homeTeam);
    const away = getUpcomingOfficialCollective(selectedUpcomingMatch.awayTeam);
    return <>
      <CategoryBalance home={home} away={away} homeId={selectedUpcomingMatch.homeTeam} awayId={selectedUpcomingMatch.awayTeam} stats={UPCOMING_COLLECTIVE_STATS} />
      <p className="upcoming-collective-source">Partidos con datos: {home.games} / {away.games} · Naranja = mejor registro</p>
      {UPCOMING_COLLECTIVE_STATS.map(([label, key, lowerIsBetter], index) => {
        const hv = home.values[key], av = away.values[key];
        const both = Number.isFinite(hv) && Number.isFinite(av);
        const homeBetter = both && hv !== av && (lowerIsBetter ? hv < av : hv > av);
        const awayBetter = both && hv !== av && (lowerIsBetter ? av < hv : av > hv);
        const percentage = index >= 8;
        const fmt = value => Number.isFinite(value) ? `${value.toFixed(1)}${percentage ? "%" : ""}` : "—";
        const max = Math.max(hv || 0, av || 0, 1);
        const homeRank = UPCOMING_COLLECTIVE_RANKS[key]?.[selectedUpcomingMatch.homeTeam];
        const awayRank = UPCOMING_COLLECTIVE_RANKS[key]?.[selectedUpcomingMatch.awayTeam];
        return <div className="upcoming-comparison-row upcoming-comparison-stat upcoming-ranked-row" key={key}>
          <span className={`upcoming-rank-badge rank-${homeRank || "none"}`} aria-label={homeRank ? `Puesto ${homeRank}` : "Sin posición"}>{homeRank ? `#${homeRank}` : "—"}</span>
          <strong className={homeBetter ? "collective-better" : ""}>{fmt(hv)}</strong>
          <div className="upcoming-comparison-track" aria-hidden="true"><span className={homeBetter ? "collective-better-bar" : ""} style={{ width: `${(Math.max(0, hv || 0) / max) * 100}%` }} /></div>
          <span className="upcoming-ranked-label">{label === "Recibidos" ? "Pts recibidos" : label}</span>
          <div className="upcoming-comparison-track" aria-hidden="true"><span className={awayBetter ? "collective-better-bar" : ""} style={{ width: `${(Math.max(0, av || 0) / max) * 100}%` }} /></div>
          <strong className={awayBetter ? "collective-better" : ""}>{fmt(av)}</strong>
          <span className={`upcoming-rank-badge rank-${awayRank || "none"}`} aria-label={awayRank ? `Puesto ${awayRank}` : "Sin posición"}>{awayRank ? `#${awayRank}` : "—"}</span>
        </div>;
      })}
    </>;
  })()}
</div>
{!upcomingLive && (<div className="upcoming-last-matches">
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
    <span>{match.home?.shortName || match.homeTeam}</span>
  </div>

  <strong>
    {match.homeScore} - {match.awayScore}
  </strong>

  <div className="upcoming-last-score-team">
    {match.away?.logo && (
      <img src={match.away.logo} alt="" />
    )}
    <span>{match.away?.shortName || match.awayTeam}</span>
  </div>
</div>

              <span className={
                match.result === "G" ? "is-win" : "is-loss"
              }>
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
</div>)}
              </div>)}
              {upcomingTab === "jugadores" && (
                <div className="upcoming-tab-panel upcoming-players-comparison" role="tabpanel">
                  <div className="match-highlighted-title">
                    <h3>JUGADORES DESTACADOS</h3>
                    <span className="upcoming-highlighted-subtitle">PROMEDIOS DE TEMPORADA 2026/27</span>
                  </div>
                  {upcomingLeaderCategories.map(category => {
                    const getLeaders = teamId => ["valuation", "steals"].includes(category.key)
                      ? getOfficialPlayerLeaders(teamId, category.key)
                      : getHighlightedPlayers(teamId, category.key);
                    const homeLeaders = getLeaders(selectedUpcomingMatch.homeTeam);
                    const awayLeaders = getLeaders(selectedUpcomingMatch.awayTeam);
                    const allValues = [...homeLeaders, ...awayLeaders].map(player => Number(player.stats[category.key]));
                    const max = Math.max(...allValues, 0);
                    const renderSide = (leaders, team, side) => (
                      <div className={`upcoming-player-side upcoming-player-side-${side}`}>
                        {leaders.length ? leaders.map(player => {
                          const value = Number(player.stats[category.key]);
                          const isLeader = max > 0 && Math.abs(value - max) < 0.00001;
                          return <button key={player.id} type="button" className="upcoming-player-entry"
                            onClick={() => setSelectedPlayer({
                              ...player,
                              team: getTeam(player.teamId),
                              stats: getPlayerStats(player.id),
                            })}>
                            {team?.logo && <img src={team.logo} alt="" className="upcoming-player-crest" />}
                            <div className="upcoming-player-info">
                              <span className="upcoming-player-name">{player.name}</span>
                              <div className="upcoming-player-meter"><span style={{ width: `${max > 0 ? Math.max(0, value / max * 100) : 0}%` }} /></div>
                            </div>
                            <strong className={isLeader ? "upcoming-player-best" : ""}>{value.toFixed(1)}</strong>
                            {isLeader && <span className="upcoming-player-leader" aria-label="Mejor promedio">★</span>}
                          </button>;
                        }) : <span className="upcoming-player-empty">Sin datos disponibles</span>}
                      </div>
                    );
                    return <div className="upcoming-player-category" key={category.key}>
                      <div className="upcoming-player-category-title">{category.title}</div>
                      <div className="upcoming-player-versus">
                        {renderSide(homeLeaders, selectedUpcomingHomeTeam, "home")}
                        <div className="upcoming-player-center-icon" aria-hidden="true">{category.icon}</div>
                        {renderSide(awayLeaders, selectedUpcomingAwayTeam, "away")}
                      </div>
                    </div>;
                  })}
                </div>
              )}
            </section>

            <div className="match-modal-footer">
              <span>LNA</span>

              <strong>
                PROMEDIOS DE TEMPORADA
              </strong>
            </div>
          </div>
        </div>
      , document.body)}

    </main>
  );
}

export default Equipo;