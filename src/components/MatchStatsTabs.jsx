import { useId, useState } from "react";
import "./MatchStatsTabs.css";

const metrics = [
  ["fieldGoals", "Tiros de campo"], ["twoPointers", "Tiros 2P"],
  ["threePointers", "Tiros 3P"], ["freeThrows", "Tiros libres"],
  ["rebounds", "Rebotes totales"], ["assists", "Asistencias"],
  ["steals", "Recuperaciones"], ["blocks", "Tapones"],
  ["turnovers", "Pérdidas"], ["fouls", "Faltas cometidas"],
];
const display = value => value == null ? "Sin dato" : typeof value === "object"
  ? `${value.made} / ${value.attempted} · ${value.percentage}%` : value;

export default function MatchStatsTabs({ match, stats, home, away, children }) {
  const [tab, setTab] = useState("players");
  const [team, setTeam] = useState("home");
  const id = useId();
  const official = stats?.source === "Liga Nacional" && stats?.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/");
  const collective = official ? stats.teamStats : null;
  return <div className="match-stats-tabs">
    <div className="match-stats-switch" role="tablist" aria-label="Estadísticas del partido">
      {[["players", "Stats jugadores"], ["teams", "Estadísticas equipos"]].map(([key, label]) =>
        <button key={key} type="button" role="tab" id={`${id}-${key}-tab`} aria-selected={tab === key}
          aria-controls={`${id}-${key}`} tabIndex={tab === key ? 0 : -1}
          onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "players" : event.key === "End" ? "teams" : tab === "players" ? "teams" : "players";
            setTab(next);
            event.currentTarget.parentElement.querySelector(`[id="${id}-${next}-tab"]`)?.focus();
          }} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-players`} aria-labelledby={`${id}-players-tab`} hidden={tab !== "players"}>
      <div className="match-stats-switch" role="group" aria-label="Estadísticas por equipo">
        {[["home", home], ["away", away]].map(([side, item]) => <button key={side} type="button" aria-pressed={team === side} onClick={() => setTeam(side)}>{item?.logo && <img src={item.logo} alt="" />}{item?.shortName || item?.name || (side === "home" ? "Local" : "Visitante")}</button>)}
      </div>
      <div className={`match-player-team-${team}`}>{children}</div>
    </div>
    <div role="tabpanel" id={`${id}-teams`} aria-labelledby={`${id}-teams-tab`} hidden={tab !== "teams"}>
      <p className="match-team-source">Liga Nacional · Comparativa colectiva oficial</p>
      {!collective && <p>Estadísticas colectivas oficiales no disponibles para este partido.</p>}
      <table className="match-team-comparison">
        <thead><tr><th scope="col">{home?.shortName || home?.name || "Local"}</th><th scope="col">Indicador</th><th scope="col">{away?.shortName || away?.name || "Visitante"}</th></tr></thead>
        <tbody>{metrics.map(([key, label]) => <tr key={key}>
          <td>{display(collective?.[match.homeTeam]?.[key])}</td><th scope="row">{label}</th><td>{display(collective?.[match.awayTeam]?.[key])}</td>
        </tr>)}</tbody>
      </table>
      <p className="match-team-source">Sin dato: valor ausente o no validado en la fuente oficial.</p>
    </div>
  </div>;
}
