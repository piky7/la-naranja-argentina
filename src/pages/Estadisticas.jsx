import { useMemo, useState } from "react";

import { players } from "../data/players";
import { teams } from "../data/teams";
import { playerStats } from "../data/stats";
import "./Estadisticas.css";
import { matches as baseMatches } from "../data/matches";
import { matchResults } from "../data/matchResults";
import { matchPlayerStats } from "../data/matchStats";
import PlayerModal from "../components/PlayerModal";
import "../pages/Home.css";
import { useNavigate } from "react-router-dom";

const matches = baseMatches.map((match) => {
  const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const result = matchResults[key] ?? matchResults[match.id];

  return result ? { ...match, ...result } : match;
});
function Estadisticas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("todos");
  const [minGames, setMinGames] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [sortBy, setSortBy] = useState("points");
  const [sortDirection, setSortDirection] = useState("desc");

  const getTeam = (teamId) => {
    return teams.find((team) => team.id === teamId);
  };

  const getPlayerStats = (playerId) => {
    return playerStats.find(
      (stats) => stats.playerId === playerId
    );
  };

const getMatchStats = (match) => {
  if (!match) return null;

  const normalizedId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const directStats = matchPlayerStats[match.id] || matchPlayerStats[normalizedId];
  if (directStats) return directStats;

  if (match.officialUrl) return null;

  const simpleId = `${match.homeTeam}-${match.awayTeam}`;
  return matchPlayerStats[simpleId] || null;
};

const getPlayerLastMatches = (player) => {
  if (!player) return [];

  return matches
    .filter((match) => {
      const finished =
  match.status === "finished" ||
  (match.status !== "live" &&
    match.homeScore != null &&
    match.homeScore !== "" &&
    match.awayScore != null &&
    match.awayScore !== "");

if (!finished) return false;

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

  /*
   * =========================================
   * FORMATEAR PROMEDIOS
   * =========================================
   */

  const formatAverage = (value, gamesPlayed) => {
    if (!gamesPlayed || value === null || value === undefined) {
      return "—";
    }

    return Number(value).toFixed(1);
  };

  /*
   * =========================================
   * ORDENAMIENTO
   * =========================================
   */

  const handleSort = (stat) => {
    if (sortBy === stat) {
      setSortDirection((current) =>
        current === "desc" ? "asc" : "desc"
      );

      return;
    }

    setSortBy(stat);
    setSortDirection("desc");
  };

  /*
   * =========================================
   * FILTRAR Y ORDENAR
   * =========================================
   */

  const filteredPlayers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const result = players.filter((player) => {
      const matchesSearch =
        normalizedSearch === "" ||
        player.name
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesTeam =
        selectedTeam === "todos" ||
        player.teamId === selectedTeam;

      const stats = getPlayerStats(player.id);

const matchesMinGames =
  (stats?.gamesPlayed || 0) >= minGames;

return matchesSearch && matchesTeam && matchesMinGames;
    });

   if (!sortBy) {
  return result.sort((a, b) => {
    const statsA = getPlayerStats(a.id);
    const statsB = getPlayerStats(b.id);

    const pointsA =
      statsA?.gamesPlayed > 0
        ? statsA.points ?? 0
        : 0;

    const pointsB =
      statsB?.gamesPlayed > 0
        ? statsB.points ?? 0
        : 0;

    if (pointsA === pointsB) {
      return a.name.localeCompare(b.name, "es");
    }

    return pointsB - pointsA;
  });
}

    return result.sort((a, b) => {
      const statsA = getPlayerStats(a.id);
      const statsB = getPlayerStats(b.id);

      const valueA =
        statsA?.gamesPlayed > 0
          ? statsA[sortBy] ?? 0
          : 0;

      const valueB =
        statsB?.gamesPlayed > 0
          ? statsB[sortBy] ?? 0
          : 0;

      if (valueA === valueB) {
        return a.name.localeCompare(b.name, "es");
      }

      return sortDirection === "desc"
        ? valueB - valueA
        : valueA - valueB;
    });
  }, [
    search,
    selectedTeam,
    minGames,
    sortBy,
    sortDirection,
  ]);

  /*
   * =========================================
   * JUGADOR SELECCIONADO
   * =========================================
   */

  const selectedPlayerTeam = selectedPlayer
    ? getTeam(selectedPlayer.teamId)
    : null;

  const selectedPlayerStats = selectedPlayer
    ? getPlayerStats(selectedPlayer.id)
    : null;


  /*
   * =========================================
   * LÍDERES DE LA TEMPORADA
   * =========================================
   */

  const seasonLeaders = useMemo(() => {
    const eligiblePlayers = players
      .map((player) => ({
        player,
        stats: playerStats.find(
          (stats) => stats.playerId === player.id
        ),
      }))
      .filter(
        ({ stats }) => stats && stats.gamesPlayed > 0
      );

    const findLeader = (stat) => {
      const sorted = [...eligiblePlayers].sort(
        (a, b) =>
          (Number(b.stats[stat]) || 0) -
          (Number(a.stats[stat]) || 0)
      );

      return sorted[0] || null;
    };

    return [
      {
        key: "points",
        title: "MÁXIMO ANOTADOR",
        abbreviation: "PTS",
        leader: findLeader("points"),
      },
      {
        key: "rebounds",
        title: "MÁXIMO REBOTEADOR",
        abbreviation: "REB",
        leader: findLeader("rebounds"),
      },
      {
        key: "assists",
        title: "MÁXIMO ASISTIDOR",
        abbreviation: "AST",
        leader: findLeader("assists"),
      },
    ];
  }, []);


  /*
   * =========================================
   * FLECHAS DE ORDENAMIENTO
   * =========================================
   */

  const getSortArrow = (stat) => {
    if (sortBy !== stat) {
      return "↕";
    }

    return sortDirection === "desc"
      ? "↓"
      : "↑";
  };

  return (
    <main className="stats-page">

     
      {/* =========================================
          CONTENIDO
          ========================================= */}

      <section className="stats-container">

{/* =========================================
    LÍDERES DE LA TEMPORADA
    ========================================= */}

<div className="stats-leaders">
  {seasonLeaders.map(({ key, title, abbreviation, leader }) => {
    const team = leader
      ? getTeam(leader.player.teamId)
      : null;

    return (
      <div className="stats-leader-card" key={key}>
        <div className="stats-leader-top">
          <span className="stats-leader-title">
            {title}
          </span>

          <div className="stats-leader-medal">
            <span>1</span>
          </div>
        </div>

        {leader ? (
          <>
            <div className="stats-leader-player">
              <strong>{leader.player.name}</strong>

              <div className="stats-leader-team">
                {team?.logo && (
                  <img
                    src={team.logo}
                    alt={team.name}
                  />
                )}
                <span>{team?.name || "—"}</span>
              </div>
            </div>

            <div className="stats-leader-value">
              <strong>
                {formatAverage(
                  leader.stats[key],
                  leader.stats.gamesPlayed
                )}
              </strong>
              <span>{abbreviation} / PARTIDO</span>
            </div>
          </>
        ) : (
          <p className="stats-leader-empty">
            Sin estadísticas disponibles
          </p>
        )}
      </div>
    );
  })}
</div>


        {/* =========================================
            FILTROS
            ========================================= */}

        <div className="stats-filters">

          <div className="stats-search">
            <label htmlFor="stats-player-search">
  BUSCAR JUGADOR
</label>
            <input
            id="stats-player-search"
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="stats-team-filter">
            <label htmlFor="stats-team-select">
  EQUIPO
</label>
            <select
            id="stats-team-select"
              value={selectedTeam}
              onChange={(event) =>
                setSelectedTeam(event.target.value)
              }
            >
              <option value="todos">
                Todos los equipos
              </option>

              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                </option>
             
              ))}
            </select>
          </div>

          {/* FILTRO MÍNIMO DE PARTIDOS JUGADOS */}

          <div className="stats-games-filter">
            <label htmlFor="stats-min-games">
  MÍN. PJ
</label>
            <select
              id="stats-min-games"
              value={minGames}
              onChange={(event) =>
                setMinGames(Number(event.target.value))
              }
            >
              <option value={0}>Todos</option>
              <option value={1}>1 partido</option>
              <option value={2}>2 partidos</option>
              <option value={3}>3 partidos</option>
              <option value={5}>5 partidos</option>
              <option value={10}>10 partidos</option>
            </select>
          </div>

        </div>

        {/* =========================================
            TABLA
            ========================================= */}


        <div className="stats-table-wrapper">

          <table className="stats-table">

            <thead>
              <tr>

                <th>
                  Jugador
                </th>

                <th>
                  Equipo
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort("gamesPlayed")
                    }
                  >
                    PJ {getSortArrow("gamesPlayed")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort("points")
                    }
                  >
                    PTS {getSortArrow("points")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort("rebounds")
                    }
                  >
                    REB {getSortArrow("rebounds")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort("assists")
                    }
                  >
                    AST {getSortArrow("assists")}
                  </button>
                </th>

              </tr>
            </thead>


            <tbody>

              {filteredPlayers.map((player, index) => {
                const team = getTeam(player.teamId);
                const stats = getPlayerStats(player.id);

                return (
                  <tr
                    key={player.id}
                    onClick={() =>
                      setSelectedPlayer(player)
                    }
                  >

                    {/* JUGADOR */}

                    <td>
  <div className="stats-player">
    <span
      className={`stats-rank ${
        index < 3 ? `stats-rank-${index + 1}` : ""
      }`}
    >
      {index + 1}
    </span>

                        {player.photo && (
                          <img
                            src={player.photo}
                            alt={player.name}
                          />
                        )}

                        <span>
                          {player.name}
                        </span>

                      </div>
                    </td>


                    {/* EQUIPO */}

                    <td>
                      <div className="stats-team">

                        {team?.logo && (
                          <img
                            src={team.logo}
                            alt={team.name}
                          />
                        )}

                        <span>
                          {team?.name || "—"}
                        </span>

                      </div>
                    </td>


                    {/* PJ */}

                    <td>
                      {stats?.gamesPlayed || 0}
                    </td>


                    {/* PTS */}

                  <td className={sortBy === "points" ? "stats-active-column" : ""}>
  {formatAverage(
    stats?.points,
    stats?.gamesPlayed
  )}
</td>


                    {/* REB */}

                   <td className={sortBy === "rebounds" ? "stats-active-column" : ""}>
  {formatAverage(
    stats?.rebounds,
    stats?.gamesPlayed
  )}
</td>


                    {/* AST */}

                    <td className={sortBy === "assists" ? "stats-active-column" : ""}>
  {formatAverage(
    stats?.assists,
    stats?.gamesPlayed
  )}
</td>

                  </tr>
                );
              })}

            </tbody>

          </table>


          {filteredPlayers.length === 0 && (
            <div className="stats-empty">
              No se encontraron jugadores.
            </div>
          )}

        </div>

      </section>


   
{/* POPUP DEL JUGADOR - COMPARTIDO CON HOME */}

<PlayerModal
  player={selectedPlayer}
  team={selectedPlayerTeam}
  stats={selectedPlayerStats}
  recentMatches={
    selectedPlayer
      ? getPlayerLastMatches(selectedPlayer)
      : []
  }
  onClose={() => setSelectedPlayer(null)}
   onTeamClick={(teamId) => navigate(`/equipos/${teamId}`)}
/>


    </main>
  );
}

export default Estadisticas;