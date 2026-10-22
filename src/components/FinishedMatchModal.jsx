import { createPortal } from "react-dom";
import MatchStatsTabs from "./MatchStatsTabs";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { getOfficialValuation } from "../utils/getOfficialValuation";

// Un único popup de partidos terminados para Home, Liga y Equipo.
export default function FinishedMatchModal({
  selectedMatch,
  selectedMatchStats,
  selectedMatchHomeTeam,
  selectedMatchAwayTeam,
  getTeamPosition,
  getTeamRecord,
  getMatchPlayerInfo,
  goToTeam,
  onClose,
  onPlayerClick,
}) {
  if (!selectedMatch) return null;

  const formatDate = (date) => {
    const [year, month, day] = String(date).split("-").map(Number);
    const fecha = new Date(year, month - 1, day);
    const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return `${weekdays[fecha.getDay()]} ${day}/${month}`;
  };

  const formatStat = (value) => value == null ? "0" : value;

  const selectedMatchMvp = selectedMatchStats
    ? [selectedMatch.homeTeam, selectedMatch.awayTeam]
        .flatMap((teamId) =>
          (selectedMatchStats[teamId] || []).map((player) => ({
            player,
            teamId,
            team: teams.find((team) => team.id === teamId),
            valuation: getOfficialValuation(selectedMatch, teamId, player.id),
          }))
        )
        .filter(({ valuation }) =>
          valuation != null && Number.isFinite(Number(valuation))
        )
        .sort((a, b) =>
          Number(b.valuation) - Number(a.valuation) ||
          (Number(b.player.points) || 0) - (Number(a.player.points) || 0)
        )[0] || null
    : null;

  return createPortal(
        <div
          className="match-modal-overlay match-modal-finished-overlay"
          onClick={() => onClose()}
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
                  onClose()
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
              <div className="match-desktop-summary">
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

              {selectedMatchMvp && (
                <button
                  type="button"
                  className="match-mvp-card"
                  aria-label={`Abrir ficha de ${selectedMatchMvp.player.name}, jugador del partido`}
                  onClick={(event) => {
                    event.stopPropagation();
                    const playerInfo = getMatchPlayerInfo(selectedMatchMvp.player);
                    if (playerInfo) onPlayerClick(playerInfo);
                  }}
                >
                  <span className="match-mvp-heading">♛ JUGADOR DEL PARTIDO</span>
                  <span className="match-mvp-body">
                    <span className="match-mvp-identity">
                      {selectedMatchMvp.team?.logo && (
                        <img src={selectedMatchMvp.team.logo} alt="" />
                      )}
                      <span className="match-mvp-name">
                        <strong>{selectedMatchMvp.player.name}</strong>
                        <small>{selectedMatchMvp.team?.name || selectedMatchMvp.teamId}</small>
                      </span>
                    </span>
                    <span className="match-mvp-numbers">
                      <span><strong>{formatStat(selectedMatchMvp.player.points)}</strong><small>PTS</small></span>
                      <span><strong>{formatStat(selectedMatchMvp.player.rebounds)}</strong><small>REB</small></span>
                      <span><strong>{formatStat(selectedMatchMvp.player.assists)}</strong><small>AST</small></span>
                      <span><strong>{selectedMatchMvp.player.minutes || "—"}</strong><small>MIN</small></span>
                      <span className="match-mvp-valuation"><strong>{selectedMatchMvp.valuation}</strong><small>VAL</small></span>
                    </span>
                  </span>
                </button>
              )}

              </div>

              {selectedMatchStats ? (
                <>
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
                                getMatchPlayerInfo(
                                  player
                                );

                              if (!playerInfo) {
                                return;
                              }

                              onPlayerClick(playerInfo);
                            }}
                          >
                            <strong>
                              {(() => { const roster = players.find(item => item.id === player.id); const dorsal = player.number ?? roster?.number; return dorsal != null && /^\d{1,3}$/.test(String(dorsal).trim()) ? `#${dorsal} · ` : ""; })()}{player.name}
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

                              onPlayerClick(playerInfo);
                            }}
                          >
                            <strong>
                              {(() => { const roster = players.find(item => item.id === player.id); const dorsal = player.number ?? roster?.number; return dorsal != null && /^\d{1,3}$/.test(String(dorsal).trim()) ? `#${dorsal} · ` : ""; })()}{player.name}
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
  , document.body);
}
