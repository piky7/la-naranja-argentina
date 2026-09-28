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

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

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

      const valueA = statsA?.[sortBy] ?? 0;
      const valueB = statsB?.[sortBy] ?? 0;

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

  const selectedPlayerTeam = selectedPlayer
    ? getTeam(selectedPlayer.teamId)
    : null;

  const selectedPlayerStats = selectedPlayer
    ? getPlayerStats(selectedPlayer.id)
    : null;

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
        <div className="page-container">

          <span className="stats-label">
            LIGA NACIONAL
          </span>

          <h1>
            Estadísticas
          </h1>

          <p>
            Rendimiento de los jugadores de la
            Liga Nacional 2026/27.
          </p>

        </div>
      </section>


      {/* =========================================
          CONTENIDO
          ========================================= */}

      <section className="stats-content">
        <div className="page-container">

          {/* =====================================
              FILTROS
              ===================================== */}

          <div className="stats-toolbar">

            <div className="stats-search">
              <label htmlFor="stats-player-search">
                Buscar jugador
              </label>

              <input
                id="stats-player-search"
                type="text"
                placeholder="Nombre del jugador..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  type="button"
                  className="stats-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>


            <div className="stats-filter">
              <label htmlFor="stats-team-filter">
                Equipo
              </label>

              <select
                id="stats-team-filter"
                value={selectedTeam}
                onChange={(event) =>
                  setSelectedTeam(
                    event.target.value
                  )
                }
              >
                <option value="todos">
                  Todos los equipos
                </option>

                {teams
                  .slice()
                  .sort((a, b) =>
                    a.name.localeCompare(
                      b.name,
                      "es"
                    )
                  )
                  .map((team) => (
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


          {/* =====================================
              INFORMACIÓN
              ===================================== */}

          <div className="stats-result-bar">

            <div>
              <span>
                JUGADORES
              </span>

              <strong>
                {filteredPlayers.length}
              </strong>
            </div>

            <span className="stats-result-description">
              PJ · PTS · REB · AST
            </span>

          </div>


          {/* =====================================
              TABLA
              ===================================== */}

          {filteredPlayers.length > 0 ? (

            <div className="stats-table-wrapper">

              <div className="stats-table">

                {/* CABECERA */}

                <div className="stats-table-header">

                  <span className="stats-player-column">
                    JUGADOR
                  </span>

                  <span className="stats-team-column">
                    EQUIPO
                  </span>


                  {/* PJ */}

                  <button
                    type="button"
                    className={
                      sortBy === "gamesPlayed"
                        ? "stats-sort-button active"
                        : "stats-sort-button"
                    }
                    onClick={() =>
                      handleSort("gamesPlayed")
                    }
                  >
                    PJ
                    <span>
                      {getSortArrow(
                        "gamesPlayed"
                      )}
                    </span>
                  </button>


                  {/* PTS */}

                  <button
                    type="button"
                    className={
                      sortBy === "points"
                        ? "stats-sort-button active"
                        : "stats-sort-button"
                    }
                    onClick={() =>
                      handleSort("points")
                    }
                  >
                    PTS
                    <span>
                      {getSortArrow("points")}
                    </span>
                  </button>


                  {/* REB */}

                  <button
                    type="button"
                    className={
                      sortBy === "rebounds"
                        ? "stats-sort-button active"
                        : "stats-sort-button"
                    }
                    onClick={() =>
                      handleSort("rebounds")
                    }
                  >
                    REB
                    <span>
                      {getSortArrow("rebounds")}
                    </span>
                  </button>


                  {/* AST */}

                  <button
                    type="button"
                    className={
                      sortBy === "assists"
                        ? "stats-sort-button active"
                        : "stats-sort-button"
                    }
                    onClick={() =>
                      handleSort("assists")
                    }
                  >
                    AST
                    <span>
                      {getSortArrow("assists")}
                    </span>
                  </button>

                </div>


                {/* JUGADORES */}

                {filteredPlayers.map((player) => {
                  const team = getTeam(
                    player.teamId
                  );

                  const stats =
                    getPlayerStats(player.id);

                  return (
                    <button
                      key={player.id}
                      type="button"
                      className="stats-player-row"
                      onClick={() =>
                        setSelectedPlayer(player)
                      }
                    >

                      <div className="stats-player">

                        {team && (
                          <span className="stats-player-logo">
                            <img
                              src={team.logo}
                              alt={`Escudo de ${team.name}`}
                            />
                          </span>
                        )}

                        <div className="stats-player-info">

                          <strong>
                            {player.name}
                          </strong>

                          <span>
                            {player.position}
                          </span>

                        </div>

                      </div>


                      <div className="stats-team">
                        {team?.shortName ||
                          "Sin equipo"}
                      </div>


                      <div className="stats-value">
                        {stats?.gamesPlayed ?? 0}
                      </div>


                      <div className="stats-value stats-points">
                        {stats?.points ?? 0}
                      </div>


                      <div className="stats-value">
                        {stats?.rebounds ?? 0}
                      </div>


                      <div className="stats-value">
                        {stats?.assists ?? 0}
                      </div>

                    </button>
                  );
                })}

              </div>

            </div>

          ) : (

            <div className="stats-empty">

              <span>
                SIN RESULTADOS
              </span>

              <h2>
                No encontramos jugadores
              </h2>

              <p>
                Probá cambiando la búsqueda o
                seleccionando otro equipo.
              </p>

            </div>

          )}

        </div>
      </section>


      {/* =========================================
          POPUP DEL JUGADOR
          ========================================= */}

      {selectedPlayer && (

        <div
          className="stats-modal-overlay"
          onClick={() =>
            setSelectedPlayer(null)
          }
        >

          <div
            className="stats-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="stats-modal-header">

              {selectedPlayerTeam && (
                <img
                  src={selectedPlayerTeam.logo}
                  alt={`Escudo de ${selectedPlayerTeam.name}`}
                  className="stats-modal-logo"
                />
              )}

              <div className="stats-modal-player-info">

                <span>
                  {selectedPlayer.position}
                </span>

                <h2>
                  {selectedPlayer.name}
                </h2>

                <p>
                  {selectedPlayerTeam?.name ||
                    "Equipo no disponible"}
                </p>

                <small>
                  {selectedPlayer.nationality}
                </small>

              </div>

              <button
                type="button"
                className="stats-modal-close"
                onClick={() =>
                  setSelectedPlayer(null)
                }
                aria-label="Cerrar"
              >
                ×
              </button>

            </div>


            <div className="stats-modal-details">

              <div>
                <span>
                  POSICIÓN
                </span>

                <strong>
                  {selectedPlayer.position ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  NACIONALIDAD
                </span>

                <strong>
                  {selectedPlayer.nationality ||
                    "—"}
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


            <div className="stats-modal-season">

              <span className="stats-modal-section-label">
                ESTADÍSTICAS DE LA TEMPORADA
              </span>

              <div className="stats-modal-grid">

                <div>
                  <strong>
                    {selectedPlayerStats
                      ?.gamesPlayed ?? 0}
                  </strong>

                  <span>
                    PJ
                  </span>
                </div>

                <div>
                  <strong>
                    {selectedPlayerStats
                      ?.points ?? 0}
                  </strong>

                  <span>
                    PTS
                  </span>
                </div>

                <div>
                  <strong>
                    {selectedPlayerStats
                      ?.rebounds ?? 0}
                  </strong>

                  <span>
                    REB
                  </span>
                </div>

                <div>
                  <strong>
                    {selectedPlayerStats
                      ?.assists ?? 0}
                  </strong>

                  <span>
                    AST
                  </span>
                </div>

              </div>

            </div>


            <div className="stats-modal-footer">

              <span>
                LIGA NACIONAL 2026/27
              </span>

              <strong>
                {selectedPlayerTeam?.shortName ||
                  ""}
              </strong>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

export default Estadisticas;