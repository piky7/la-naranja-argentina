
export default function PlayerModal({
  player,
  team,
  stats,
  recentMatches = [],
  onClose,
  onTeamClick,
}) {
  if (!player) return null;

  const average = (value) =>
    value == null ? "—" : Number(value).toFixed(1);

  return (
    <div className="home-modal-overlay" onClick={onClose}>
      <div
        className="home-player-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="home-player-modal-header">
          {team?.logo && (
            <div className="home-player-modal-logo">
              <button
                type="button"
                className="home-player-modal-logo-button"
                onClick={() => onTeamClick?.(team.id)}
                aria-label={`Ir al equipo ${team.name}`}
              >
                <img src={team.logo} alt={`Escudo de ${team.name}`} />
              </button>
            </div>
          )}

          <div className="home-player-modal-info">
            <span>{player.position || "—"}</span>
            <h2>{player.name}</h2>
            <p>{team?.name || "Equipo no disponible"}</p>
            <small>{player.nationality || "—"}</small>
          </div>

          <button
            type="button"
            className="home-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="home-player-modal-details">
          <div>
            <span>POSICIÓN</span>
            <strong>{player.position || "—"}</strong>
          </div>
          <div>
            <span>NACIONALIDAD</span>
            <strong>{player.nationality || "—"}</strong>
          </div>
          <div>
            <span>NÚMERO</span>
            <strong>{player.number ?? "—"}</strong>
          </div>
        </div>

        <div className="home-player-modal-season">
          <span className="home-player-modal-label">
            ESTADÍSTICAS DE LA TEMPORADA
          </span>

          <div className="home-player-modal-stats">
            <div>
              <strong>{stats?.gamesPlayed ?? 0}</strong>
              <span>PJ</span>
            </div>
            <div>
              <strong>{average(stats?.points)}</strong>
              <span>PTS</span>
            </div>
            <div>
              <strong>{average(stats?.rebounds)}</strong>
              <span>REB</span>
            </div>
            <div>
              <strong>{average(stats?.assists)}</strong>
              <span>AST</span>
            </div>
          </div>
        </div>

        <div className="home-player-modal-recent-section">
          <span className="home-player-modal-label">
            ÚLTIMOS 2 PARTIDOS
          </span>

          {recentMatches.length > 0 ? (
            <div className="home-player-modal-recent-list">
              {recentMatches.map((match) => (
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
          <span>LIGA NACIONAL 2026/27</span>
          <strong>{team?.shortName || ""}</strong>
        </div>
      </div>
    </div>
  );
}
