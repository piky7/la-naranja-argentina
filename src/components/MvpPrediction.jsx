import { useMemo, useState } from "react";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { playerStats } from "../data/stats";
import "./MvpPrediction.css";

export default function MvpPrediction({ match }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const statsById = useMemo(() => new Map(playerStats.map(stat => [stat.playerId, stat])), []);
  const rosters = useMemo(() => [match.homeTeam, match.awayTeam].map(teamId => {
    const team = teams.find(item => item.id === teamId);
    const seen = new Set();
    const roster = players.filter(player => {
      if (player.teamId !== teamId) return false;
      const key = player.officialPlayerId ? `official:${player.officialPlayerId}` : player.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(player => ({ ...player, averageMinutes: statsById.get(player.id)?.minutes ?? null }))
      .sort((a,b) => (b.averageMinutes ?? -1) - (a.averageMinutes ?? -1) || a.name.localeCompare(b.name, "es"));
    return { teamId, team, roster };
  }), [match.homeTeam, match.awayTeam, statsById]);
  const selectedPlayer = rosters.flatMap(group => group.roster).find(player => player.id === selected);
  return <section className="lna-mvp-prediction">
    <div className="lna-mvp-prediction-heading"><strong>★ ¿QUIÉN SERÁ EL MVP?</strong><span>+20 PTS</span></div>
    <button type="button" className="lna-mvp-prediction-trigger" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
      <span>{selectedPlayer ? `${selectedPlayer.name} · ${teams.find(team => team.id === selectedPlayer.teamId)?.shortName || selectedPlayer.teamId}` : "Elegir jugador"}</span><span>{expanded ? "▴" : "▾"}</span>
    </button>
    {expanded && <div className="lna-mvp-prediction-picker">
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar jugador…" aria-label="Buscar jugador para MVP" />
      <div className="lna-mvp-prediction-list">
        {rosters.map(({teamId,team,roster}) => <div key={teamId}>
          <div className="lna-mvp-prediction-team">{team?.logo && <img src={team.logo} alt="" />}<strong>{team?.name || teamId}</strong></div>
          {roster.filter(player => player.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))).map(player => <button type="button" key={player.id} className={selected === player.id ? "is-selected" : ""} onClick={() => { setSelected(player.id); setExpanded(false); }}>
            <span>{player.number != null ? `#${player.number} · ` : ""}{player.name}</span>
            <small>{Number.isFinite(player.averageMinutes) ? `${player.averageMinutes.toFixed(1)} min` : "Sin minutos"}</small>
          </button>)}
        </div>)}
      </div>
    </div>}
    <small className="lna-mvp-prediction-notice">Selección de prueba: todavía no se guarda ni suma puntos. Falta activar el registro seguro en D1.</small>
  </section>;
}
