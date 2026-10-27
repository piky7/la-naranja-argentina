import useLiveMatch from "../hooks/useLiveMatch";
import LiveMatchInfo from "../components/LiveMatchInfo";
import CategoryBalance from "../components/CategoryBalance";
import "../components/UpcomingHeader.css";
import MatchVote from "../components/MatchVote";
import { createPortal } from "react-dom";
import PlayerModal from "../components/PlayerModal";
import FinishedMatchModal from "../components/FinishedMatchModal";
import MatchStatsTabs from "../components/MatchStatsTabs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { teams, getMatchColorStyle } from "../data/teams";
import { matches as baseMatches } from "../data/matches";
import { matchResults } from "../data/matchResults";
import { matchPlayerStats } from "../data/matchStats";
import { players } from "../data/players";
import { playerStats } from "../data/stats";
import { getOfficialValuation } from "../utils/getOfficialValuation";
import "./Liga.css";
import "./Home.css";
const formatLeagueCardWeekday = (date) => new Intl.DateTimeFormat("es-AR", { weekday: "short" })
  .format(new Date(`${date}T12:00:00`)).replace(".", "").toUpperCase();

const formatLeagueCardDate = (date) => {
  const value = new Date(`${date}T12:00:00`);
  const day = new Intl.DateTimeFormat("es-AR", { day: "2-digit" }).format(value);
  const month = new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(value).replace(".", "").toUpperCase();
  return `${day} ${month}`;
};

const publishedMatches = baseMatches.map((match) => {
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
  for (const match of publishedMatches) {
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

const UPCOMING_COLLECTIVE_STATS = [
  ["Puntos", "points", false], ["Recibidos", "pointsAgainst", true],
  ["Rebotes", "rebounds", false], ["Asistencias", "assists", false],
  ["Recuperaciones", "steals", false], ["Tapones", "blocks", false],
  ["Pérdidas", "turnovers", true], ["Faltas", "fouls", true],
  ["Tiros de campo", "fieldGoals", false], ["Dobles", "twoPointers", false],
  ["Triples", "threePointers", false], ["Libres", "freeThrows", false],
];


// Calcular una vez los promedios de cada equipo para rankings y popups.
const UPCOMING_COLLECTIVE_BY_TEAM = Object.fromEntries(
  teams.map(team => [team.id, getUpcomingOfficialCollective(team.id)])
);

// Puestos oficiales comparables entre los 18 equipos (solo planillas válidas).
// Los empates comparten posición; equipos sin dato no reciben puesto.
const UPCOMING_COLLECTIVE_RANKS = Object.fromEntries(
  UPCOMING_COLLECTIVE_STATS.map(([, key, lowerIsBetter]) => {
    const entries = teams.map(team => ({
      id: team.id,
      value: UPCOMING_COLLECTIVE_BY_TEAM[team.id].values[key],
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

// Índices de consulta rápida: mantienen la primera coincidencia de cada lista.
const TEAMS_BY_ID = new Map();
for (const team of teams) if (!TEAMS_BY_ID.has(team.id)) TEAMS_BY_ID.set(team.id, team);
const PLAYERS_BY_ID = new Map();
for (const player of players) if (!PLAYERS_BY_ID.has(player.id)) PLAYERS_BY_ID.set(player.id, player);
const PLAYER_STATS_BY_ID = new Map();
for (const stats of playerStats) if (!PLAYER_STATS_BY_ID.has(stats.playerId)) PLAYER_STATS_BY_ID.set(stats.playerId, stats);

function Liga() {
  const getLocalDate = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getLocalDate();
  const [liveSnapshot, setLiveSnapshot] = useState({ date: null, liveMatches: [] });
  useEffect(() => {
    let active = true;
    const url = import.meta.env.VITE_LNA_LIVE_OFICIAL_URL || "https://lna-live-oficial.lnab.workers.dev/api/live";
    const refresh = async () => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data.liveMatches)) {
          setLiveSnapshot({ date: data.date, liveMatches: data.liveMatches });
        }
      } catch { /* Conservar los resultados publicados si el LIVE no responde. */ }
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // Igual que Home: mostrar el resultado final confirmado por el Worker
  // hasta que se publique en matchResults.js, sin inventar estadísticas.
  const matches = useMemo(() => publishedMatches.map(match => {
    if (match.status === "finished" || liveSnapshot.date !== match.date) return match;
    const live = liveSnapshot.liveMatches.find(item =>
      item.homeTeam === match.homeTeam && item.awayTeam === match.awayTeam &&
      item.status === "finished" && !item.isHalftime &&
      item.homeScore != null && item.awayScore != null
    );
    return live ? { ...match, status: "finished",
      homeScore: Number(live.homeScore), awayScore: Number(live.awayScore) } : match;
  }), [liveSnapshot]);


  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);
  const upcomingLive = useLiveMatch(selectedUpcomingMatch);
  const selectedUpcomingHomeTeam = selectedUpcomingMatch ? TEAMS_BY_ID.get(selectedUpcomingMatch.homeTeam) : null;
  const selectedUpcomingAwayTeam = selectedUpcomingMatch ? TEAMS_BY_ID.get(selectedUpcomingMatch.awayTeam) : null;
  const [upcomingTab, setUpcomingTab] = useState("comparativa");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
const [resultsPage, setResultsPage] = useState(null);
  const getTeamPosition = (id) => standings.findIndex(t => t.id === id) + 1;
  const getTeamRecord = (id) => { const t = standings.find(t => t.id === id); return { wins: t?.wins ?? 0, losses: t?.losses ?? 0 }; };
  const getPlayerStats = (id) => PLAYER_STATS_BY_ID.get(id);
  const openTeamFromUpcoming = (id) => { setSelectedUpcomingMatch(null); setSelectedTeam(TEAMS_BY_ID.get(id) || null); };
  const getTeam = (teamId) =>
    TEAMS_BY_ID.get(teamId);
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

  const playerInfo = PLAYERS_BY_ID.get(matchPlayer.id);

  if (!playerInfo) return null;

  return {
    ...playerInfo,
    team: getTeam(playerInfo.teamId),
    stats: PLAYER_STATS_BY_ID.get(playerInfo.id),
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
      stats: PLAYER_STATS_BY_ID.get(player.id),
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

// Conservar resultados por equipo/categoría mientras no cambien los partidos.
  // Abrir o cerrar un popup no vuelve a procesar todas las planillas oficiales.
  const officialLeadersCache = useMemo(() => new Map(), [matches]);
  const getOfficialPlayerLeaders = (teamId, field) => {
    const cacheKey = `${teamId}|${field}`;
    if (officialLeadersCache.has(cacheKey)) return officialLeadersCache.get(cacheKey);
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
    const leaders = players.filter(player => player.teamId === teamId && totals.has(player.id))
      .map(player => ({ ...player, team: getTeam(teamId), stats: { [field]: totals.get(player.id).sum / totals.get(player.id).games } }))
      .sort((a, b) => b.stats[field] - a.stats[field]).slice(0, 2);
    officialLeadersCache.set(cacheKey, leaders);
    return leaders;
  };

  const upcomingLeaderCategories = [
    { title: "PUNTOS", icon: "🏀", key: "points" },
    { title: "VALORACIÓN", icon: "★", key: "valuation" },
    { title: "REBOTES", icon: "↟", key: "rebounds" },
    { title: "ASISTENCIAS", icon: "↗", key: "assists" },
  ];


  const standings = useMemo(() => {
    // Indexar enfrentamientos una sola vez para no recorrer todo el fixture
    // en cada comparación del orden de la tabla.
    const directMatchesByPair = new Map();
    for (const match of matches) {
      if (match.status !== "finished" || match.homeScore == null || match.awayScore == null) continue;
      const pair = [match.homeTeam, match.awayTeam].sort().join("|");
      if (!directMatchesByPair.has(pair)) directMatchesByPair.set(pair, []);
      directMatchesByPair.get(pair).push(match);
    }
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
  const directMatches = directMatchesByPair.get([a.id, b.id].sort().join("|")) || [];

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


  }, [matches]);

  /*
    =========================
    PARTIDOS DE HOY
    =========================
  */

  // Los listados solo dependen de los partidos publicados/LIVE y del día.
  // Abrir o cerrar popups no vuelve a filtrar ni ordenar todo el fixture.
  const { todayMatches, allResults, upcomingMatches } = useMemo(() => ({
    todayMatches: matches
      .filter(match => match.date === today && match.status === "scheduled")
      .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    allResults: matches
      .filter(match => match.status === "finished")
      .sort((a, b) => a.date !== b.date
        ? b.date.localeCompare(a.date)
        : (b.time || "").localeCompare(a.time || "")),
    upcomingMatches: matches
      .filter(match => match.status === "scheduled" && match.date >= today)
      .sort((a, b) => a.date !== b.date
        ? a.date.localeCompare(b.date)
        : (a.time || "").localeCompare(b.time || ""))
      .slice(0, 10),
  }), [matches, today]);

  const resultsPerPage = 10;
  const totalResultsPages = Math.ceil(allResults.length / resultsPerPage);
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
                          style={{...getMatchColorStyle(match.homeTeam, match.awayTeam), "--match-home-logo": `url("${homeTeam?.logo ?? ""}")`, "--match-away-logo": `url("${awayTeam?.logo ?? ""}")`}}
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
                          style={{...getMatchColorStyle(match.homeTeam, match.awayTeam), "--match-home-logo": `url("${homeTeam?.logo ?? ""}")`, "--match-away-logo": `url("${awayTeam?.logo ?? ""}")`}}
                        onClick={() => {
                          if (getMatchStats(match)) setSelectedMatch(match);
                        }}
                      >

                        <div className="result-date">
                          <span className="league-card-weekday">{formatLeagueCardWeekday(match.date)}</span>
                          <span>{formatLeagueCardDate(match.date)}</span>
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

                            <strong className={Number(match.homeScore) > Number(match.awayScore) ? "league-score-winner" : ""}>
                              {match.homeScore}
                            </strong>

                            <span>
                              -
                            </span>

                            <strong className={Number(match.awayScore) > Number(match.homeScore) ? "league-score-winner" : ""}>
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
                          style={{...getMatchColorStyle(match.homeTeam, match.awayTeam), "--match-home-logo": `url("${homeTeam?.logo ?? ""}")`, "--match-away-logo": `url("${awayTeam?.logo ?? ""}")`}}
                          onClick={() =>
  setSelectedUpcomingMatch(match)
}
                        >

                          <div className="upcoming-date">

                            <small className="league-card-weekday">{formatLeagueCardWeekday(match.date)}</small>
                            <span>
                              {formatLeagueCardDate(match.date)}
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
                  {getTeam(selectedUpcomingMatch.homeTeam) && (
                    <button
                      type="button"
                      className="home-modal-team-logo-button"
                      onClick={() =>
                        openTeamFromUpcoming(
                          getTeam(selectedUpcomingMatch.homeTeam).id
                        )
                      }
                      aria-label={`Ir al equipo ${getTeam(selectedUpcomingMatch.homeTeam).name}`}
                    >
                      <img
                        src={
                          getTeam(selectedUpcomingMatch.homeTeam).logo
                        }
                        alt={`Escudo de ${getTeam(selectedUpcomingMatch.homeTeam).name}`}
                      />
                    </button>
                  )}

                  <strong>
                    {getTeam(selectedUpcomingMatch.homeTeam)?.shortName ||
                      getTeam(selectedUpcomingMatch.homeTeam)?.name}

                    {getTeam(selectedUpcomingMatch.homeTeam) && (
                      <small>
                        {getTeamPosition(
                          getTeam(selectedUpcomingMatch.homeTeam).id
                        )}
                        ° •{" "}
                        {
                          getTeamRecord(
                            getTeam(selectedUpcomingMatch.homeTeam).id
                          ).wins
                        }
                        -
                        {
                          getTeamRecord(
                            getTeam(selectedUpcomingMatch.homeTeam).id
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
                  {getTeam(selectedUpcomingMatch.awayTeam) && (
                    <button
                      type="button"
                      className="home-modal-team-logo-button"
                      onClick={() =>
                        openTeamFromUpcoming(
                          getTeam(selectedUpcomingMatch.awayTeam).id
                        )
                      }
                      aria-label={`Ir al equipo ${getTeam(selectedUpcomingMatch.awayTeam).name}`}
                    >
                      <img
                        src={
                          getTeam(selectedUpcomingMatch.awayTeam).logo
                        }
                        alt={`Escudo de ${getTeam(selectedUpcomingMatch.awayTeam).name}`}
                      />
                    </button>
                  )}

                  <strong>
                    {getTeam(selectedUpcomingMatch.awayTeam)?.shortName ||
                      getTeam(selectedUpcomingMatch.awayTeam)?.name}

                    {getTeam(selectedUpcomingMatch.awayTeam) && (
                      <small>
                        {getTeamPosition(
                          getTeam(selectedUpcomingMatch.awayTeam).id
                        )}
                        ° •{" "}
                        {
                          getTeamRecord(
                            getTeam(selectedUpcomingMatch.awayTeam).id
                          ).wins
                        }
                        -
                        {
                          getTeamRecord(
                            getTeam(selectedUpcomingMatch.awayTeam).id
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

<div className="upcoming-team-comparison upcoming-official-comparison" style={getMatchColorStyle(selectedUpcomingMatch.homeTeam, selectedUpcomingMatch.awayTeam)}>
  <span className="upcoming-comparison-label">COMPARATIVA COLECTIVA · 2026/27</span>
  {(() => {
    const home = UPCOMING_COLLECTIVE_BY_TEAM[selectedUpcomingMatch.homeTeam];
    const away = UPCOMING_COLLECTIVE_BY_TEAM[selectedUpcomingMatch.awayTeam];
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
                        {renderSide(homeLeaders, getTeam(selectedUpcomingMatch.homeTeam), "home")}
                        <div className="upcoming-player-center-icon" aria-hidden="true">{category.icon}</div>
                        {renderSide(awayLeaders, getTeam(selectedUpcomingMatch.awayTeam), "away")}
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
                const official = UPCOMING_COLLECTIVE_BY_TEAM[selectedTeam.id];
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
                  .filter((match) => match.status !== "finished" && (match.homeTeam === selectedTeam.id || match.awayTeam === selectedTeam.id) && match.date >= today)
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

      {selectedMatch && (
        <FinishedMatchModal
          selectedMatch={selectedMatch}
          selectedMatchStats={getMatchStats(selectedMatch)}
          selectedMatchHomeTeam={getTeam(selectedMatch.homeTeam)}
          selectedMatchAwayTeam={getTeam(selectedMatch.awayTeam)}
          getTeamPosition={getTeamPosition}
          getTeamRecord={getTeamRecord}
          getMatchPlayerInfo={getMatchPlayerInfo}
          goToTeam={(id) => window.location.assign(`/equipos/${id}`)}
          onClose={() => setSelectedMatch(null)}
          onPlayerClick={setSelectedPlayer}
        />
      )}
{/* POPUP DEL JUGADOR */}

{selectedPlayer && (
  <PlayerModal
    player={selectedPlayer}
    team={selectedPlayer.team || getTeam(selectedPlayer.teamId)}
    stats={selectedPlayer.stats || PLAYER_STATS_BY_ID.get(selectedPlayer.id)}
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
