import PlayerModal from "../components/PlayerModal";
import { useMemo, useState } from "react";

import { players } from "../data/players";
import { teams } from "../data/teams";
import { playerStats } from "../data/stats";
import { matches } from "../data/matches";
import { matchPlayerStats } from "../data/matchStats";

import "./Jugadores.css";

function Jugadores() {
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] =
    useState("todos");
  const [selectedPosition, setSelectedPosition] =
    useState("todas");

  const [selectedPlayer, setSelectedPlayer] =
    useState(null);

  const getTeam = (teamId) => {
    return teams.find(
      (team) => team.id === teamId
    );
  };

  const getPlayerStats = (playerId) => {
    return playerStats.find(
      (stats) => stats.playerId === playerId
    );
  };

  const formatAverage = (value, gamesPlayed) => {
    if (!gamesPlayed) {
      return "—";
    }

    return Number(value ?? 0).toFixed(1);
  };

  const positions = useMemo(() => {
    return [
      ...new Set(
        players
          .map((player) => player.position)
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, []);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return players
      .filter((player) => {
        const matchesSearch =
          normalizedSearch === "" ||
          player.name
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesTeam =
          selectedTeam === "todos" ||
          player.teamId === selectedTeam;

        const matchesPosition =
          selectedPosition === "todas" ||
          player.position === selectedPosition;

        return (
          matchesSearch &&
          matchesTeam &&
          matchesPosition
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      );
  }, [
    search,
    selectedTeam,
    selectedPosition,
  ]);

  const selectedPlayerTeam =
    selectedPlayer
      ? getTeam(selectedPlayer.teamId)
      : null;

  const selectedPlayerStats =
    selectedPlayer
      ? getPlayerStats(selectedPlayer.id)
      : null;

  const selectedGamesPlayed =
    selectedPlayerStats?.gamesPlayed ?? 0;
const selectedPlayerLastMatches = selectedPlayer
  ? matches
      .filter((match) => {
        if (match.status !== "finished") return false;

        const teamId = selectedPlayer.teamId;

        if (
          match.homeTeam !== teamId &&
          match.awayTeam !== teamId
        ) {
          return false;
        }

        const matchKey = `${match.homeTeam}-${match.awayTeam}`;
        const teamStats = matchPlayerStats[matchKey]?.[teamId];

        return (
          Array.isArray(teamStats) &&
          teamStats.some(
            (player) => player.id === selectedPlayer.id
          )
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2)
      .map((match) => {
        const teamId = selectedPlayer.teamId;
        const matchKey = `${match.homeTeam}-${match.awayTeam}`;

        const stats = matchPlayerStats[matchKey][teamId].find(
          (player) => player.id === selectedPlayer.id
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
      })
  : [];
  return (
    <main className="players-page">

      

      {/* =========================
          CONTENIDO
      ========================= */}

      <section className="players-content">
        <div className="page-container">

          {/* =========================
              FILTROS
          ========================= */}

          <div className="players-filters">

            <div className="players-search">

              <label htmlFor="player-search">
                Buscar jugador
              </label>

              <input
                id="player-search"
                type="text"
                placeholder="Nombre del jugador..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="players-filter">

              <label htmlFor="team-filter">
                Equipo
              </label>

              <select
                id="team-filter"
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


            <div className="players-filter">

              <label htmlFor="position-filter">
                Posición
              </label>

              <select
                id="position-filter"
                value={selectedPosition}
                onChange={(event) =>
                  setSelectedPosition(
                    event.target.value
                  )
                }
              >

                <option value="todas">
                  Todas las posiciones
                </option>

                {positions.map(
                  (position) => (

                    <option
                      key={position}
                      value={position}
                    >
                      {position}
                    </option>

                  )
                )}

              </select>

            </div>

          </div>


          {/* =========================
              INFORMACIÓN
          ========================= */}

          <div className="players-result-info">

            <span>
              {filteredPlayers.length}{" "}
              jugadores
            </span>

          </div>


          {/* =========================
              JUGADORES
          ========================= */}

          {filteredPlayers.length > 0 ? (

            <div className="players-grid">

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
                    className="player-card"
                    onClick={() =>
                      setSelectedPlayer(
                        player
                      )
                    }
                  >

                    <div className="player-card-main">

                      <div className="player-card-info">

                        <span className="player-position">
                          {player.position}
                        </span>

                        <h2>
                          {player.name}
                        </h2>

                        <span className="player-nationality">
                          {player.nationality}
                        </span>

                      </div>


                      {team && (

                        <img
                          src={team.logo}
                          alt={`Escudo de ${team.name}`}
                          className="player-team-logo"
                        />

                      )}

                    </div>


                    <div className="player-card-footer">

                      <span>
                        {team?.shortName ||
                          "Equipo"}
                      </span>

                      <span className="player-card-arrow">
                        →
                      </span>

                    </div>

                  </button>

                );

              })}

            </div>

          ) : (

            <div className="players-empty">

              <span>
                SIN RESULTADOS
              </span>

              <h2>
                No encontramos jugadores
              </h2>

              <p>
                Probá cambiando la búsqueda
                o los filtros seleccionados.
              </p>

            </div>

          )}

        </div>
      </section>


      {/* =========================
          POP-UP DEL JUGADOR
      ========================= */}

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          team={selectedPlayerTeam}
          stats={selectedPlayerStats}
          recentMatches={selectedPlayerLastMatches}
          onClose={() => setSelectedPlayer(null)}
          onTeamClick={(id) => { setSelectedPlayer(null); window.location.assign(`/equipos/${id}`); }}
        />
      )}

    </main>
  );
}

export default Jugadores;