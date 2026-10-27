import { isPlayerAppearance } from "../utils/playerAppearance";
import useLiveMatch from "../hooks/useLiveMatch";
import LiveMatchInfo from "../components/LiveMatchInfo";
import LiveRosters from "../components/LiveRosters";
import CategoryBalance from "../components/CategoryBalance";
import "../components/UpcomingHeader.css";
import MatchVote from "../components/MatchVote";
import PlayerModal from "../components/PlayerModal";
import FinishedMatchModal from "../components/FinishedMatchModal";
import MatchStatsTabs from "../components/MatchStatsTabs";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { teams, getMatchColorStyle } from "../data/teams";
import { matches as baseMatches } from "../data/matches";
import { matchResults } from "../data/matchResults";
import { players } from "../data/players";
import { playerStats } from "../data/stats";
import { matchPlayerStats } from "../data/matchStats";
import { getOfficialValuation } from "../utils/getOfficialValuation";


import FixtureCalendar from "../components/FixtureCalendar";
import "./Home.css";

// Los resultados publicados tienen prioridad sobre el fixture original.
const matches = baseMatches.map((match) => {
  const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const result = matchResults[key] ?? matchResults[match.id];
  return result ? { ...match, ...result } : match;
});



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


// Calcular una sola vez los promedios colectivos por equipo; antes se
// recorrían todos los partidos por cada estadística y cada equipo.
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
const [homeStatsTab, setHomeStatsTab] = useState("posiciones");  const [selectedMatch, setSelectedMatch] = useState(null);
 const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);
  const upcomingLive = useLiveMatch(selectedUpcomingMatch);
const [upcomingTab, setUpcomingTab] = useState("planteles");
useEffect(() => { setUpcomingTab("planteles"); }, [selectedUpcomingMatch?.id]);
const [liveMatches, setLiveMatches] = useState([]);
const [liveDate, setLiveDate] = useState(null);
const LIVE_API_URL = import.meta.env.VITE_LNA_LIVE_OFICIAL_URL;


  // El reloj oficial indica los minutos restantes del cuarto.
  // No invertir el valor: hacerlo mostraba 2' cuando faltaban 8'.
  const getRemainingMinutes = (officialMinutesRemaining) => {
    if (officialMinutesRemaining == null) return null;
    const minutes = Number(officialMinutesRemaining);
    if (!Number.isFinite(minutes)) return null;
    return Math.max(0, Math.min(10, minutes));
  };

  // Última jugada oficial: segundos precisos, sin cuenta regresiva ficticia.
  const formatLiveRemaining = (live) => {
    const parts = typeof live?.lastActionTime === "string"
      ? live.lastActionTime.match(/^(\d{2}):(\d{2}):(\d{2})$/)
      : null;
    if (parts) {
      const elapsed = Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3]);
      if (elapsed >= 0 && elapsed <= 600) {
        // La fuente oficial entrega el tiempo restante, no el transcurrido.
        return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
      }
    }
    const minutes = getRemainingMinutes(live?.minutesRemaining);
    return minutes == null ? null : `${String(minutes).padStart(2, "0")}:00`;
  };

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

    if (false /* LIVE de Flashscore desactivado */) {
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
    const teamMatches = standingsMatches.filter(
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

  const getTeamLastTwoMatches = (teamId) => {
  return standingsMatches
    .filter(
      (match) =>
        isMatchFinished(match) &&
        match.homeScore != null &&
        match.awayScore != null &&
        (match.homeTeam === teamId || match.awayTeam === teamId)
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
    const saved = playerStats.find((stats) => stats.playerId === playerId);
    const player = players.find((item) => item.id === playerId);
    if (!player?.teamId) return saved;

    // Calcular los promedios con los mismos partidos oficiales que alimentan
    // la ficha de los últimos encuentros. Evita PJ 0 con partidos disponibles.
    const totals = { points: 0, rebounds: 0, assists: 0 };
    let gamesPlayed = 0;
    const seen = new Set();
    for (const match of matches) {
      if (!isMatchFinished(match)) continue;
      if (match.homeTeam !== player.teamId && match.awayTeam !== player.teamId) continue;
      if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
      const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
      if (seen.has(key)) continue;
      const record = matchPlayerStats[match.id] || matchPlayerStats[key];
      if (record?.source !== "Liga Nacional" ||
          !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
      const stat = record[player.teamId]?.find((item) => item.id === playerId);
      if (!stat || !isPlayerAppearance(stat)) continue;
      seen.add(key);
      gamesPlayed++;
      for (const field of Object.keys(totals)) {
        totals[field] += Number(stat[field]) || 0;
      }
    }
    if (!gamesPlayed) return saved;
    return {
      ...saved,
      playerId,
      gamesPlayed,
      points: totals.points / gamesPlayed,
      rebounds: totals.rebounds / gamesPlayed,
      assists: totals.assists / gamesPlayed,
    };
  };
const getPlayerLastMatches = (player) => {
  if (!player) return [];

  return matches
    .filter((match) => {
      if (!isMatchFinished(match)) return false;

      const teamId = player.teamId;

      if (
        match.homeTeam !== teamId &&
        match.awayTeam !== teamId
      ) {
        return false;
      }

      const matchStats = getMatchStats(match);
      const teamStats = matchStats?.[teamId];

      return (
        Array.isArray(teamStats) &&
        teamStats.some(
          (item) => item.id === player.id
        )
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2)
    .map((match) => {
      const teamId = player.teamId;
      const stats = getMatchStats(match)[teamId].find(
        (item) => item.id === player.id
      );

      const rivalId =
        match.homeTeam === teamId
          ? match.awayTeam
          : match.homeTeam;

      return {
        id: match.id,
        date: match.date,
        rival: getTeam(rivalId)?.shortName || rivalId,
        rivalLogo: getTeam(rivalId)?.logo || null,
        minutes: stats.minutes ?? null,
        valuation: getOfficialValuation(match, teamId, player.id),
        points: stats.points,
        rebounds: stats.rebounds,
        assists: stats.assists,
      };
    });
};
  const getPlayerSeasonValuation = (player) => {
    if (!player?.id || !player?.teamId) return null;
    let total = 0;
    let count = 0;
    const seen = new Set();
    for (const match of matches) {
      if (!isMatchFinished(match)) continue;
      if (match.homeTeam !== player.teamId && match.awayTeam !== player.teamId) continue;
      if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
      const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
      if (seen.has(key)) continue;
      const record = matchPlayerStats[key] || matchPlayerStats[match.id];
      if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
      const value = getOfficialValuation(match, player.teamId, player.id);
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      seen.add(key);
      total += value;
      count++;
    }
    return count ? (total / count).toFixed(1) : null;
  };

  const getMatchPlayerInfo = (matchPlayer) => {
    if (!matchPlayer) {
      return null;
    }

    const playerInfo = players.find(
  (player) => player.id === matchPlayer.id
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
    if (!match) return null;

    const normalizedId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    const directStats = matchPlayerStats[match.id] || matchPlayerStats[normalizedId];
    if (directStats) return directStats;

    // Si el calendario identifica el partido como oficial, nunca recurrimos
    // a estadísticas antiguas de Flashscore u otra clave ambigua.
    if (match.officialUrl) return null;

    const simpleId = `${match.homeTeam}-${match.awayTeam}`;
    return matchPlayerStats[simpleId] || null;
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

  // Promedios de valoración y recuperaciones: solo registros oficiales de la temporada.
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

  // MVP del partido: mayor valoración oficial entre ambos planteles.
  const selectedMatchMvp = selectedMatch && selectedMatchStats
    ? [selectedMatch.homeTeam, selectedMatch.awayTeam]
        .flatMap((teamId) =>
          (selectedMatchStats[teamId] || []).map((player) => ({
            player,
            teamId,
            team: getTeam(teamId),
            valuation: getOfficialValuation(selectedMatch, teamId, player.id),
          }))
        )
        .filter(({ valuation }) => valuation != null && Number.isFinite(Number(valuation)))
        .sort((a, b) =>
          Number(b.valuation) - Number(a.valuation) ||
          (Number(b.player.points) || 0) - (Number(a.player.points) || 0)
        )[0] || null
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
  if (!LIVE_API_URL) return;

  let activo = true;

  const actualizarLive = async () => {
    try {
      const response = await fetch(LIVE_API_URL, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const datos = await response.json();

      if (!activo) return;

      if (Array.isArray(datos.liveMatches)) {
        setLiveMatches(datos.liveMatches);
        setLiveDate(datos.date ?? null);
      }
    } catch (error) {
      console.warn("Error consultando LIVE oficial:", error);
    }
  };

  actualizarLive();

  const intervalo = setInterval(actualizarLive, 60_000);

  return () => {
    activo = false;
    clearInterval(intervalo);
  };
}, [LIVE_API_URL]);
  // LIVE de Flashscore desactivado temporalmente.
  // Los resultados oficiales y el fixture siguen disponibles.

  // El panel LIVE solo retira partidos finalizados cuando el resultado
  // y la planilla de ambos equipos ya están disponibles en el Home.
  const visibleLiveMatches = liveMatches.filter((liveMatch) => {
  // Los partidos en juego siempre se muestran.
  if (liveMatch.status !== "finished") {
    return true;
  }

  // Buscar el partido correspondiente en el fixture.
  const fixtureMatch = matches.find(
    (match) =>
      match.homeTeam === liveMatch.homeTeam &&
      match.awayTeam === liveMatch.awayTeam
  );

  // Si todavía no está en el fixture, mantenerlo visible.
  if (!fixtureMatch) {
    return true;
  }

  const key = `${fixtureMatch.date}-${fixtureMatch.homeTeam}-${fixtureMatch.awayTeam}`;

  const result =
    matchResults[key] ?? matchResults[fixtureMatch.id];

  const stats = getMatchStats(fixtureMatch);

  const hasPublishedResult =
    result?.status === "finished" &&
    result.homeScore != null &&
    result.awayScore != null;

  const hasPublishedStats = Boolean(stats);

  // Solo ocultarlo cuando resultado y popup estén disponibles.
  return !(hasPublishedResult && hasPublishedStats);
});

  // Detectar nuevas publicaciones incluso cuando la PWA vuelve del segundo plano.
  // No interferir con la navegación: comprobar al volver y, si hay un final
  // pendiente de estadísticas, mantener también la revisión periódica.
  useEffect(() => {
    if (import.meta.env.DEV) return;

    const currentScript = document.querySelector('script[type="module"][src]')
      ?.getAttribute("src");
    if (!currentScript) return;

    // Evitar comprobaciones y recargas mientras la PWA termina de iniciar.
    const startupGraceUntil = Date.now() + 5000;
    let checking = false;
    let lastCheck = 0;
    let needsRefresh = false;

    const checkDeployment = async () => {
      if (checking || document.visibilityState !== "visible") return;
      if (Date.now() - lastCheck < 15000) return;
      lastCheck = Date.now();
      checking = true;
      try {
        // Pedir al navegador que compruebe también si cambió el service worker.
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) await registration.update();
        }
        const response = await fetch(`/?lna_check=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const html = await response.text();
        const nextScript = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i)
          ?? html.match(/<script[^>]*src=["']([^"']+)["'][^>]*type=["']module["']/i);
        if (nextScript?.[1] && nextScript[1] !== currentScript) {
          needsRefresh = true;
          // Solo recargar al volver a la pantalla principal, sin interrumpir popups.
          if (!document.querySelector('[role="dialog"]')) {
            window.location.reload();
          }
        }
      } catch (error) {
        console.warn("No se pudo comprobar la nueva versión de LNA", error);
      } finally {
        checking = false;
      }
    };

    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() < startupGraceUntil) return;
      if (needsRefresh && !document.querySelector('[role="dialog"]')) {
        window.location.reload();
        return;
      }
      void checkDeployment();
    };

    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    // Revisar también mientras la app está abierta, sin recargar constantemente.
    const interval = setInterval(onReturn, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      clearInterval(interval);
    };
  }, []);
// Incorporar resultados LIVE finalizados que todavía
// no fueron publicados en matchResults.js.
const standingsMatches = matches.map((match) => {
  // Si ya tenemos el resultado definitivo publicado,
  // conservarlo como fuente principal.
  if (isMatchFinished(match)) {
    return match;
  }

  const liveMatch =
    liveDate === match.date
      ? liveMatches.find(
          (live) =>
            live.homeTeam === match.homeTeam &&
            live.awayTeam === match.awayTeam &&
            live.status === "finished" &&
            !live.isHalftime &&
            live.homeScore != null &&
            live.awayScore != null
        )
      : null;

  if (!liveMatch) {
    return match;
  }

  return {
    ...match,
    homeScore: Number(liveMatch.homeScore),
    awayScore: Number(liveMatch.awayScore),
    status: "finished",
  };
});
  const standings = useMemo(() => {
    return teams
      .map((team) => {
        const teamMatches = standingsMatches.filter(
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
  const directMatches = standingsMatches.filter(
    (match) =>
      isMatchFinished(match) &&
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
    const aScore = Number(
      match.homeTeam === a.id
        ? match.homeScore
        : match.awayScore
    );

    const bScore = Number(
      match.homeTeam === b.id
        ? match.homeScore
        : match.awayScore
    );

    if (aScore > bScore) directWinsA++;
    if (bScore > aScore) directWinsB++;

    directPointsA += aScore;
    directPointsB += bScore;
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


  }, [liveMatches, liveDate]);

  const selectedDayMatches = useMemo(() => {
    return matches
      .filter((match) => match.date === selectedDate)
      .sort((a, b) => {
        const getStatusOrder = (match) => {
          if (isMatchFinished(match)) {
            return 0;
          }

          if (false /* LIVE de Flashscore desactivado */) {
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
      .slice(0, 10);
  }, []);

    

  // Módulos editoriales exclusivos de escritorio, derivados de los datos existentes.
  const upcomingDesktop = matches
    .filter((match) => match.date > today && !isMatchFinished(match) && match.status !== "postponed")
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))
    .slice(0, 4);

  const recentDesktop = matches
    .filter((match) => isMatchFinished(match) && match.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""))
    .slice(0, 5);

  return (
    <main className="home-page">
      <section className="home-content">
        <div className="home-container">
          

          <div className="home-dashboard">

            {/* TABLA DE POSICIONES */}

            <section className="home-panel standings-panel">
              <div className="home-panel-header">
                <div>
                 
<span>
  {homeStatsTab === "posiciones"
    ? "TEMPORADA"
    : "ESTADÍSTICAS"}
</span>

<h2 className="home-stats-hero-title">
  {homeStatsTab === "posiciones" ? (
    <>
      TABLA DE <span>POSICIONES</span>
    </>
  ) : (
    <>
      MÁXIMOS <span>ANOTADORES</span>
    </>
  )}
</h2>

                </div>

                <Link to="/liga">
                  Ver liga →
                </Link>
              </div>

<div className="home-stats-tabs">
  <button
    type="button"
    className={`home-stats-tab ${
      homeStatsTab === "posiciones" ? "active" : ""
    }`}
    onClick={() => setHomeStatsTab("posiciones")}
  >
    POSICIONES
  </button>

  <button
    type="button"
    className={`home-stats-tab ${
      homeStatsTab === "anotadores" ? "active" : ""
    }`}
    onClick={() => setHomeStatsTab("anotadores")}
  >
    MÁXIMOS ANOTADORES
  </button>
</div>
{homeStatsTab === "posiciones" && (
  <>
              <div className="standings-table standings-table-desktop">
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
              
              <div className="standings-table-mobile">
  {[standings.slice(0, 9), standings.slice(9, 18)].map(
    (column, columnIndex) => (
      <div className="standings-mobile-column" key={columnIndex}>
        <div className="standings-table-header">
          <span>#</span>
          <span>Equipo</span>
          <span>PG</span>
          <span>PP</span>
        </div>

        {column.map((team, index) => {
          const position = columnIndex * 9 + index + 1;

          return (
            <button
              key={team.id}
              type="button"
              className="home-standing-row"
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

              <span className="home-standing-team">
                <img
                  src={team.logo}
                  alt={`Escudo de ${team.name}`}
                />
                <span>{team.shortName}</span>
              </span>

              <strong>{team.wins}</strong>
              <strong>{team.losses}</strong>
            </button>
          );
        })}
      </div>
    )
  )}
</div>
  </>
)}
{homeStatsTab === "anotadores" && (
    <div className="home-scorers home-scorers-grid">
    {topScorers.length > 0 ? (
      topScorers.map((player, index) => (
        <button
          key={player.id}
          type="button"
          className="home-scorer"
          onClick={() => setSelectedPlayer(player)}
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
              <strong>{player.name}</strong>
              <span>
                {player.team?.shortName || "Sin equipo"}
              </span>
            </div>
          </div>

          
<div className="scorer-points">
  <div className="scorer-games">
    <strong>{player.stats?.gamesPlayed ?? 0}</strong>
    <span>PJ</span>
  </div>

  <div className="scorer-average">
    <strong>{player.points.toFixed(1)}</strong>
    <span>PTS</span>
  </div>
</div>

        </button>
      ))
    ) : (
      <div className="home-no-scorers">
        <span>SIN DATOS</span>
        <p>Todavía no hay estadísticas disponibles.</p>
      </div>
    )}
  </div>
)}
            </section>
            



            {/* FIXTURE */}

            <section className="home-panel fixture-panel">
              <div className="fixture-hero-header">
  <span className="fixture-hero-league">
    LIGA NACIONAL 2026/27
  </span>

  <h2 className="fixture-hero-title">
  {selectedDate === today ? (
    <>
      PARTIDOS <span>DE HOY</span>
    </>
  ) : selectedDate < today ? (
    <>
      RESULTADOS <span>DEL DÍA</span>
    </>
  ) : (
    <>
      PRÓXIMOS <span>PARTIDOS</span>
    </>
  )}
</h2>

  <Link to="/liga" className="fixture-hero-link">
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
                  ‹
                </button>

              <FixtureCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

                <button
                  type="button"
                  className="fixture-day-button"
                  onClick={() => changeDate(1)}
                  aria-label="Día siguiente"
                >
                  ›
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

                    const liveMatch = liveDate === match.date
  ? liveMatches.find(
      (live) =>
        live.homeTeam === match.homeTeam &&
        live.awayTeam === match.awayTeam
    )
  : null;

// Los resultados publicados son definitivos; el LIVE sirve de respaldo.
const isFinished =
  isMatchFinished(match) ||
  (liveMatch?.status === "finished" && !liveMatch?.isHalftime);
const isLive =
  !isFinished &&
  (liveMatch?.status === "live" || false /* LIVE de Flashscore desactivado */);
const finalHomeScore = isMatchFinished(match)
  ? match.homeScore
  : liveMatch?.homeScore ?? match.homeScore;
const finalAwayScore = isMatchFinished(match)
  ? match.awayScore
  : liveMatch?.awayScore ?? match.awayScore;
const finishedMatch = {
  ...match,
  homeScore: finalHomeScore,
  awayScore: finalAwayScore,
  status: isFinished ? "finished" : match.status,
};

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
                        style={{...getMatchColorStyle(match.homeTeam, match.awayTeam), "--match-home-logo": `url("${homeTeam?.logo ?? ""}")`, "--match-away-logo": `url("${awayTeam?.logo ?? ""}")`}}
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
                                <b className="fixture-rank">{homePosition}°</b> <span className="fixture-record-separator">•</span>{" "}<b className="fixture-record">{homeRecord.wins}-{homeRecord.losses}</b>
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
  <span
    className={
      Number(finalHomeScore) > Number(finalAwayScore)
        ? "fixture-score-winner"
        : "fixture-score-loser"
    }
  >
    {finalHomeScore}
  </span>

  <span className="fixture-score-separator"> - </span>

  <span
    className={
      Number(finalAwayScore) > Number(finalHomeScore)
        ? "fixture-score-winner"
        : "fixture-score-loser"
    }
  >
    {finalAwayScore}
  </span>
</strong>

                              <span>FINAL</span>
                            </>
                          ) : isLive ? (
  <>
    <span className="fixture-live-badge">
      <span className="fixture-live-dot"></span>
      EN VIVO
    </span>

    <strong className="fixture-live-score">
      {liveMatch?.homeScore ?? match.homeScore ?? 0}
      {" - "}
      {liveMatch?.awayScore ?? match.awayScore ?? 0}
    </strong>

    <small className="fixture-live-period">
      {liveMatch?.isHalftime
        ? "ENTRETIEMPO"
        : liveMatch?.quarter
          ? `${liveMatch.quarter}.º CUARTO${
              formatLiveRemaining(liveMatch) != null
                ? ` · ${formatLiveRemaining(liveMatch)} RESTANTES`
                : ""
            }`
          : "PARTIDO EN JUEGO"}
    </small>
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
                                <b className="fixture-rank">{awayPosition}°</b> <span className="fixture-record-separator">•</span>{" "}<b className="fixture-record">{awayRecord.wins}-{awayRecord.losses}</b>
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

            {/* Agenda de escritorio: el LIVE permanece exclusivamente en Partidos de hoy. */}
            <section className="home-panel lna-desktop-panel lna-upcoming-panel" aria-label="Próximos partidos">
              <div className="lna-desktop-heading">
                <h2>PRÓXIMOS <span>PARTIDOS</span></h2>
                <Link to="/liga">Ver todos →</Link>
              </div>
              <div className="lna-desktop-upcoming-list">
                {upcomingDesktop.length ? upcomingDesktop.map((match) => {
                  const home = getTeam(match.homeTeam);
                  const away = getTeam(match.awayTeam);
                  return (
                    <button key={match.id} type="button" className="lna-desktop-upcoming-row" onClick={() => setSelectedUpcomingMatch(match)}>
                      <time dateTime={match.date}>{formatDate(match.date)}</time>
                      <span className="lna-desktop-upcoming-teams">
                        <span>{home && <img src={home.logo} alt="" loading="lazy" />}{home?.shortName || match.homeTeam}</span>
                        <span>{away && <img src={away.logo} alt="" loading="lazy" />}{away?.shortName || match.awayTeam}</span>
                      </span>
                      <strong>{match.time || "A confirmar"}</strong>
                    </button>
                  );
                }) : <p className="lna-desktop-empty">No hay próximos partidos confirmados.</p>}
              </div>
            </section>
          </div>

          <div className="lna-desktop-secondary">
            <section className="home-panel lna-desktop-panel">
              <div className="lna-desktop-heading">
                <h2>ÚLTIMOS <span>RESULTADOS</span></h2>
                <Link to="/liga">Ver todos →</Link>
              </div>
              <div className="lna-desktop-results-list">
                {recentDesktop.length ? recentDesktop.map((match) => {
                  const home = getTeam(match.homeTeam);
                  const away = getTeam(match.awayTeam);
                  const hasStats = Boolean(getMatchStats(match));
                  return (
                    <button key={match.id} type="button" className="lna-desktop-result-row" disabled={!hasStats} onClick={() => setSelectedMatch(match)}>
                      <time dateTime={match.date}>{formatDate(match.date)}</time>
                      <span className="lna-desktop-result-team">{home && <img src={home.logo} alt="" loading="lazy" />}{home?.shortName || match.homeTeam}</span>
                      <strong>{match.homeScore} - {match.awayScore}</strong>
                      <span className="lna-desktop-result-team">{away && <img src={away.logo} alt="" loading="lazy" />}{away?.shortName || match.awayTeam}</span>
                    </button>
                  );
                }) : <p className="lna-desktop-empty">Todavía no hay resultados.</p>}
              </div>
            </section>
            <section className="home-panel lna-desktop-panel">
              <div className="lna-desktop-heading">
                <h2>MÁXIMOS <span>ANOTADORES</span></h2>
                <Link to="/jugadores">Ver jugadores →</Link>
              </div>
              <div className="lna-desktop-scorers-list">
                {topScorers.slice(0, 5).map((player, index) => (
                  <button key={player.id} type="button" className="lna-desktop-scorer-row" onClick={() => setSelectedPlayer(player)}>
                    <span className="lna-desktop-rank">{index + 1}</span>
                    {player.team && <img src={player.team.logo} alt="" loading="lazy" />}
                    <span className="lna-desktop-scorer-name"><strong>{player.name}</strong><small>{player.team?.shortName || "Sin equipo"}</small></span>
                    <strong className="lna-desktop-scorer-points">{player.points == null ? "—" : Number(player.points).toFixed(1)}</strong>
                  </button>
                ))}
                {!topScorers.length && <p className="lna-desktop-empty">Todavía no hay estadísticas.</p>}
              </div>
            </section>
          </div>
        </div>
      </section>


      {/* POPUP DEL EQUIPO - FICHA COMPACTA LNA */}
      {selectedTeam && !selectedMatch && (
        <div className="home-modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div className="home-team-modal home-team-modal-v2" role="dialog" aria-modal="true" aria-label={selectedTeam.name} onClick={(event) => event.stopPropagation()}>
            <header className="team-v2-hero">
              <img className="team-v2-watermark" src={selectedTeam.logo} alt="" aria-hidden="true" />
              <button type="button" className="home-modal-close team-v2-close" onClick={() => setSelectedTeam(null)} aria-label="Cerrar">×</button>
              <div className="team-v2-identity">
                <button type="button" className="team-v2-crest" onClick={() => goToTeam(selectedTeam.id)} aria-label={"Ver " + selectedTeam.name}>
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
                const nextMatch = standingsMatches
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
      )}

      {/* POPUP PARTIDO TERMINADO */}

      {selectedMatch && (
        <FinishedMatchModal
          selectedMatch={selectedMatch}
          selectedMatchStats={selectedMatchStats}
          selectedMatchHomeTeam={selectedMatchHomeTeam}
          selectedMatchAwayTeam={selectedMatchAwayTeam}
          getTeamPosition={getTeamPosition}
          getTeamRecord={getTeamRecord}
          getMatchPlayerInfo={getMatchPlayerInfo}
          goToTeam={goToTeam}
          onClose={() => setSelectedMatch(null)}
          onPlayerClick={setSelectedPlayer}
        />
      )}

      {/* POPUP PRÓXIMO PARTIDO */}

      {selectedUpcomingMatch && !selectedMatch && (
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
                  <span className="match-modal-status">{upcomingLive ? <>● EN VIVO · {upcomingLive.isHalftime ? "ENTRETIEMPO" : upcomingLive.quarter ? `${upcomingLive.quarter}° CUARTO` : "PARTIDO EN JUEGO"}{!upcomingLive.isHalftime && upcomingLive.quarter && formatLiveRemaining(upcomingLive) != null && <span className="match-modal-live-remaining">{formatLiveRemaining(upcomingLive)} RESTANTES</span>}</> : "PRÓXIMO PARTIDO"}</span>
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
            {upcomingLive && <>
              <div className="upcoming-tabs" role="tablist" aria-label="Información del partido en vivo">
                <button type="button" role="tab" aria-selected={upcomingTab !== "comparativa"} className={upcomingTab !== "comparativa" ? "is-active" : ""} onClick={() => setUpcomingTab("planteles")}>♟ Planteles</button>
                <button type="button" role="tab" aria-selected={upcomingTab === "comparativa"} className={upcomingTab === "comparativa" ? "is-active" : ""} onClick={() => setUpcomingTab("comparativa")}>▥ Comparativa de equipos</button>
              </div>
              {upcomingTab !== "comparativa" && selectedUpcomingHomeTeam && selectedUpcomingAwayTeam &&
                <LiveRosters homeTeam={selectedUpcomingHomeTeam} awayTeam={selectedUpcomingAwayTeam} matches={matches} onPlayerClick={setSelectedPlayer} />}
            </>}
            {!upcomingLive && <>
            <div className="upcoming-tabs" role="tablist" aria-label="Información del próximo partido">
              <button type="button" role="tab" aria-selected={upcomingTab === "comparativa"} className={upcomingTab === "comparativa" ? "is-active" : ""} onClick={() => setUpcomingTab("comparativa")}>▥ Comparativa de equipos</button>
              <button type="button" role="tab" aria-selected={upcomingTab === "jugadores"} className={upcomingTab === "jugadores" ? "is-active" : ""} onClick={() => setUpcomingTab("jugadores")}>♟ Jugadores destacados</button>
            </div>
            </>}
            {(!upcomingLive || upcomingTab === "comparativa") && <section className="match-highlighted-section">
              {(upcomingLive || upcomingTab !== "jugadores") && (<div className="upcoming-tab-panel" role="tabpanel">
              {/* COMPARATIVA DE EQUIPOS */}

<div className="upcoming-team-comparison upcoming-official-comparison">
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
              {!upcomingLive && upcomingTab === "jugadores" && (
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
            </section>}

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
        <PlayerModal
          player={selectedPlayer}
          team={selectedPlayer.team || getTeam(selectedPlayer.teamId)}
          stats={selectedPlayer.stats || getPlayerStats(selectedPlayer.id)}
          onClose={() => setSelectedPlayer(null)}
          onTeamClick={goToTeam}
        />
      )}
    </main>
  );
}

export default Home;
