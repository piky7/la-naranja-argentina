import { useMemo, useState } from "react";

import { players } from "../data/players";
import { teams } from "../data/teams";
import { playerStats } from "../data/stats";

import "./Estadisticas.css";

function Estadisticas() {
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("todos");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState("desc");

  const getTeam = (teamId) => {
    return teams.find((team) => team.id === teamId);
  };

  const getPlayerStats = (playerId) => {
    return playerStats.find(
      (stats) => stats.playerId === playerId
    );
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

      return matchesSearch && matchesTeam;
    });

    if (!sortBy) {
      return result.sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      );
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
          HEADER
          ========================================= */}

      <section className="stats-header">
        <div>
          <span className="section-kicker">
            Liga Nacional
          </span>

          <h1>Estadísticas</h1>

          <p>
            Estadísticas promedio de los jugadores
            de la temporada.
          </p>
        </div>
      </section>


      {/* =========================================
          CONTENIDO
          ========================================= */}

      <section className="stats-container">

        {/* =========================================
            FILTROS
            ========================================= */}

        <div className="stats-filters">

          <div className="stats-search">
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="stats-team-filter">
            <select
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

              {filteredPlayers.map((player) => {
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

                    <td>
                      {formatAverage(
                        stats?.points,
                        stats?.gamesPlayed
                      )}
                    </td>


                    {/* REB */}

                    <td>
                      {formatAverage(
                        stats?.rebounds,
                        stats?.gamesPlayed
                      )}
                    </td>


                    {/* AST */}

                    <td>
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


      {/* =========================================
          POPUP DEL JUGADOR
          ========================================= */}

      {selectedPlayer && (
        <div
          className="stats-player-modal-overlay"
          onClick={() =>
            setSelectedPlayer(null)
          }
        >

          <div
            className="stats-player-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER DEL JUGADOR */}

            <div className="stats-player-modal-header">

              {selectedPlayerTeam && (
                <div className="stats-player-modal-logo">

                  <img
                    src={selectedPlayerTeam.logo}
                    alt={`Escudo de ${selectedPlayerTeam.name}`}
                  />

                </div>
              )}


              <div className="stats-player-modal-info">

                <span>
                  {selectedPlayer.position || "—"}
                </span>

                <h2>
                  {selectedPlayer.name}
                </h2>

                <p>
                  {selectedPlayerTeam?.name ||
                    "Equipo no disponible"}
                </p>

                <small>
                  {selectedPlayer.nationality || "—"}
                </small>

              </div>


              <button
                type="button"
                className="stats-player-modal-close"
                onClick={() =>
                  setSelectedPlayer(null)
                }
                aria-label="Cerrar"
              >
                ×
              </button>

            </div>


            {/* DATOS DEL JUGADOR */}

            <div className="stats-player-modal-details">

              <div>
                <span>
                  POSICIÓN
                </span>

                <strong>
                  {selectedPlayer.position || "—"}
                </strong>
              </div>


              <div>
                <span>
                  NACIONALIDAD
                </span>

                <strong>
                  {selectedPlayer.nationality || "—"}
                </strong>
              </div>


              <div>
                <span>
                  NÚMERO
                </span>

                <strong>
                  {selectedPlayer.number ?? "—"}
                </strong>
              </div>

            </div>


            {/* ESTADÍSTICAS DE LA TEMPORADA */}

            <div className="stats-player-modal-season">

              <span className="stats-player-modal-label">
                ESTADÍSTICAS DE LA TEMPORADA
              </span>


              <div className="stats-player-modal-stats">

                <div>
                  <strong>
                    {selectedPlayerStats?.gamesPlayed || 0}
                  </strong>

                  <span>
                    PJ
                  </span>
                </div>


                <div>
                  <strong>
                    {formatAverage(
                      selectedPlayerStats?.points,
                      selectedPlayerStats?.gamesPlayed
                    )}
                  </strong>

                  <span>
                    PTS
                  </span>
                </div>


                <div>
                  <strong>
                    {formatAverage(
                      selectedPlayerStats?.rebounds,
                      selectedPlayerStats?.gamesPlayed
                    )}
                  </strong>

                  <span>
                    REB
                  </span>
                </div>


                <div>
                  <strong>
                    {formatAverage(
                      selectedPlayerStats?.assists,
                      selectedPlayerStats?.gamesPlayed
                    )}
                  </strong>

                  <span>
                    AST
                  </span>
                </div>

              </div>

            </div>


            {/* FOOTER */}

            <div className="stats-player-modal-footer">

              <span>
                LIGA NACIONAL 2026/27
              </span>

              <strong>
                {selectedPlayerTeam?.abbreviation || ""}
              </strong>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

export default Estadisticas;