import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { teams } from "../data/teams";
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
  const [mobileMatchTeam, setMobileMatchTeam] = useState("home");
  const [selectedTeam, setSelectedTeam] = useState(null);
const [homeStatsTab, setHomeStatsTab] = useState("posiciones");  const [selectedMatch, setSelectedMatch] = useState(null);
 const [selectedUpcomingMatch, setSelectedUpcomingMatch] = useState(null);
const [liveMatches, setLiveMatches] = useState([]);
const [liveDate, setLiveDate] = useState(null);

  useEffect(() => {
    setMobileMatchTeam("home");
  }, [selectedMatch?.id]);

  // DI representa minutos jugados dentro del cuarto (sin segundos).
  const getRemainingMinutes = (minutesPlayed) => {
    if (minutesPlayed == null) return null;
    const minutes = Number(minutesPlayed);
    if (!Number.isFinite(minutes)) return null;
    return Math.max(0, Math.min(10, 10 - minutes));
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
    return playerStats.find(
      (stats) => stats.playerId === playerId
    );
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
        points: stats.points,
        rebounds: stats.rebounds,
        assists: stats.assists,
      };
    });
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

      setLiveDate(data.date ?? null);
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
  (liveMatch?.status === "live" || match.status === "live");
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
              liveMatch.minutesRemaining != null
                ? ` · ${getRemainingMinutes(
                    liveMatch.minutesRemaining
                  )}' RESTANTES`
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
                  <h2>{selectedTeam.name}</h2>
                  <p>{[selectedTeam.city, selectedTeam.province].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</p>
                </div>
              </div>
            </header>
            <div className="team-v2-body">
              <section className="team-v2-section">
                <h3>TEMPORADA 2026/27</h3>
                <div className="team-v2-stats">
                  {[
                    ["PJ", selectedTeam.gamesPlayed],
                    ["PG", selectedTeam.wins],
                    ["PP", selectedTeam.losses],
                    ["DIF", selectedTeam.difference > 0 ? "+" + selectedTeam.difference : selectedTeam.difference],
                    ["PTS/P", selectedTeam.gamesPlayed ? (selectedTeam.pointsFor / selectedTeam.gamesPlayed).toFixed(1) : "—"],
                    ["REC/P", selectedTeam.gamesPlayed ? (selectedTeam.pointsAgainst / selectedTeam.gamesPlayed).toFixed(1) : "—"],
                    ["PTS TOTALES", selectedTeam.pointsFor],
                    ["REC TOTALES", selectedTeam.pointsAgainst],
                  ].map(([label, value]) => (
                    <div key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </div>
              </section>
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
                <div className="match-finished-watermarks" aria-hidden="true">
                  {selectedMatchHomeTeam?.logo && (
                    <img src={selectedMatchHomeTeam.logo} alt="" />
                  )}
                  {selectedMatchAwayTeam?.logo && (
                    <img src={selectedMatchAwayTeam.logo} alt="" />
                  )}
                </div>
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
                <>
                  <div className="match-mobile-team-tabs" role="group" aria-label="Estadísticas por equipo">
                    <button type="button" className={mobileMatchTeam === "home" ? "active" : ""} aria-pressed={mobileMatchTeam === "home"} onClick={() => setMobileMatchTeam("home")}>
                      {selectedMatchHomeTeam?.logo && <img src={selectedMatchHomeTeam.logo} alt="" />}
                      <span>{selectedMatchHomeTeam?.shortName || selectedMatchHomeTeam?.name || "Local"}</span>
                    </button>
                    <button type="button" className={mobileMatchTeam === "away" ? "active" : ""} aria-pressed={mobileMatchTeam === "away"} onClick={() => setMobileMatchTeam("away")}>
                      {selectedMatchAwayTeam?.logo && <img src={selectedMatchAwayTeam.logo} alt="" />}
                      <span>{selectedMatchAwayTeam?.shortName || selectedMatchAwayTeam?.name || "Visitante"}</span>
                    </button>
                  </div>
                  <div className={"match-modal-content match-mobile-show-" + mobileMatchTeam}>
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
                </>
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

      {selectedUpcomingMatch && !selectedMatch && (
        <div
          className="match-modal-overlay"
          onClick={() =>
            setSelectedUpcomingMatch(null)
          }
        >
          <div
          className="match-modal match-modal-upcoming"
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
              {/* COMPARATIVA DE EQUIPOS */}

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
              {selectedPlayer.team?.logo && (
                <img
                  className="home-player-modal-watermark"
                  src={selectedPlayer.team.logo}
                  alt=""
                  aria-hidden="true"
                />
              )}
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
{/* ÚLTIMOS 2 PARTIDOS */}

<div className="home-player-modal-recent-section">
  <span className="home-player-modal-label">
    ÚLTIMOS 2 PARTIDOS
  </span>

  {getPlayerLastMatches(selectedPlayer).length > 0 ? (
    <div className="home-player-modal-recent-list">
      {getPlayerLastMatches(selectedPlayer).map((match) => (
        <div
          className="home-player-modal-recent-match"
          key={match.id}
        >
          <div className="home-player-modal-recent-header">
            <strong>vs. {match.rival}</strong>
            <span>
              {match.date.split("-").reverse().join("/")}
            </span>
          </div>

          <div className="home-player-modal-recent-stats">
            <div>
              <strong>{match.points}</strong>
              <span>PTS</span>
            </div>

            <div>
              <strong>{match.rebounds}</strong>
              <span>REB</span>
            </div>

            <div>
              <strong>{match.assists}</strong>
              <span>AST</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="home-player-modal-recent-empty">
      Todavía no hay estadísticas de partidos disponibles.
    </p>
  )}
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
