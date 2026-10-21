import { createPortal } from "react-dom";
import { teams } from "../data/teams";
import { matches } from "../data/matches";
import { playerStats } from "../data/stats";
import { matchPlayerStats } from "../data/matchStats";
import { getOfficialValuation } from "../utils/getOfficialValuation";


export default function PlayerModal({
  player,
  team,
  stats,
  recentMatches = [],
  onClose,
  onTeamClick,
}) {
  if (!player) return null;

  const average = (value) => value == null ? "—" : Number(value).toFixed(1);
  const saved = playerStats.find((entry) => entry.playerId === player.id);
  const seen = new Set();
  const games = matches.filter((match) => {
    if (match.status !== "finished" && (match.homeScore == null || match.awayScore == null)) return false;
    if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) return false;
    if (match.homeTeam !== player.teamId && match.awayTeam !== player.teamId) return false;
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(key)) return false;
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) return false;
    if (!record[player.teamId]?.some((entry) => entry.id === player.id)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)).map((match) => {
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    const entry = record[player.teamId].find((item) => item.id === player.id);
    const rivalId = match.homeTeam === player.teamId ? match.awayTeam : match.homeTeam;
    return {
      id: match.id || key, date: match.date,
      rival: teams.find((item) => item.id === rivalId),
      points: Number(entry.points) || 0,
      rebounds: Number(entry.rebounds) || 0,
      assists: Number(entry.assists) || 0,
      minutes: entry.minutes,
      valuation: getOfficialValuation(match, player.teamId, player.id),
    };
  });
  const mean = (field) => games.length
    ? average(games.reduce((sum, game) => sum + game[field], 0) / games.length)
    : average(stats?.[field] ?? saved?.[field]);
  const valued = games.filter((game) => typeof game.valuation === "number" && Number.isFinite(game.valuation));
  const valuation = valued.length
    ? average(valued.reduce((sum, game) => sum + game.valuation, 0) / valued.length)
    : "—";
  const latest = games.length ? games.slice(0, 2) : recentMatches.map((game) => ({
    ...game,
    rival: teams.find((item) => item.shortName === game.rival) || { shortName: game.rival },
  }));

  return createPortal(
    <div className="home-modal-overlay" onClick={onClose}>
      <div
        className="home-player-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="home-player-modal-header">
          {team?.logo && <img className="home-player-modal-watermark" src={team.logo} alt="" aria-hidden="true" />}
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
              <strong>{games.length || stats?.gamesPlayed || saved?.gamesPlayed || 0}</strong>
              <span>PJ</span>
            </div>
            <div>
              <strong>{mean("points")}</strong>
              <span>PTS</span>
            </div>
            <div>
              <strong>{mean("rebounds")}</strong>
              <span>REB</span>
            </div>
            <div>
              <strong>{mean("assists")}</strong>
              <span>AST</span>
            </div>
            <div><strong>{valuation}</strong><span>VAL</span></div>
          </div>
        </div>

        <div className="home-player-modal-recent-section">
          <span className="home-player-modal-label">
            ÚLTIMOS 2 PARTIDOS
          </span>

          {latest.length > 0 ? (
            <div className="home-player-modal-recent-list">
              {latest.map((match) => (
                <div
                  className="home-player-modal-recent-match"
                  key={match.id}
                >
                  <div className="home-player-modal-recent-header">
                    <div className="home-player-modal-rival">
                      {match.rival?.logo && <img src={match.rival.logo} alt="" loading="lazy" />}
                      <strong>vs. {match.rival?.shortName || "Rival"}</strong>
                    </div>
                    <span className="home-player-modal-recent-meta">
                      {match.date.split("-").reverse().join("/")}
                      {match.minutes != null && match.minutes !== "" && <span className="home-player-modal-recent-minutes"> · {match.minutes} min</span>}
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
                    <div><strong>{match.valuation ?? "—"}</strong><span>VAL</span></div>
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
    </div>,
    document.body
  );
}
