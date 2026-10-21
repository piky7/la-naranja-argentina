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

// Los porcentajes de tiro se comparan sobre 100; los conteos contra el mayor de ambos equipos.
const metricNumber = value => {
  if (value == null) return null;
  const number = typeof value === "object" ? Number(value.percentage) : Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : null;
};
const metricWidth = (value, other, isShooting) => {
  const current = metricNumber(value);
  if (current == null) return 0;
  const maximum = isShooting ? 100 : Math.max(current, metricNumber(other) ?? 0, 1);
  return Math.min(100, (current / maximum) * 100);
};

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
      <button
        className="match-player-team-title"
        type="button"
        onClick={() => setTeam(current => current === "home" ? "away" : "home")}
        aria-label={`Mostrando estadísticas de ${(team === "home" ? home : away)?.name || (team === "home" ? "Local" : "Visitante")}. Tocar para ver ${(team === "home" ? away : home)?.name || (team === "home" ? "Visitante" : "Local")}.`}
      >
        {(team === "home" ? home : away)?.logo && <img src={(team === "home" ? home : away).logo} alt="" />}
        <span className="match-player-team-title-text">
          <small>{team === "home" ? "LOCAL" : "VISITANTE"} · TOCÁ PARA CAMBIAR EQUIPO</small>
          <strong>{(team === "home" ? home : away)?.shortName || (team === "home" ? home : away)?.name || (team === "home" ? "Local" : "Visitante")}</strong>
        </span>
        <span className="match-player-team-title-change" aria-hidden="true">⇄</span>
      </button>
      <div className={`match-player-tables match-player-team-${team}`}>{children}</div>
    </div>
    <div role="tabpanel" id={`${id}-teams`} aria-labelledby={`${id}-teams-tab`} hidden={tab !== "teams"}>
      <div className="match-team-comparison-intro">
        <strong>Comparativa colectiva</strong>
        <span>LIGA NACIONAL · DATOS OFICIALES</span>
      </div>
      {!collective && <p className="match-team-unavailable">Estadísticas colectivas oficiales no disponibles para este partido.</p>}
      {collective && <div className="match-team-comparison-card">
        <div className="match-team-comparison-header">
          <div className="match-team-comparison-name">{home?.logo && <img src={home.logo} alt="" />}<span>{home?.shortName || home?.name || "Local"}</span></div>
          <span>INDICADOR</span>
          <div className="match-team-comparison-name match-team-comparison-name-away"><span>{away?.shortName || away?.name || "Visitante"}</span>{away?.logo && <img src={away.logo} alt="" />}</div>
        </div>
        <div className="match-team-comparison-rows">
          {metrics.map(([key, label]) => {
            const local = collective?.[match.homeTeam]?.[key];
            const visitor = collective?.[match.awayTeam]?.[key];
            const shooting = ["fieldGoals", "twoPointers", "threePointers", "freeThrows"].includes(key);
            const localNumber = metricNumber(local);
            const visitorNumber = metricNumber(visitor);
            const lowerIsBetter = key === "turnovers" || key === "fouls";
            const localWins = localNumber != null && visitorNumber != null &&
              (lowerIsBetter ? localNumber < visitorNumber : localNumber > visitorNumber);
            const visitorWins = localNumber != null && visitorNumber != null &&
              (lowerIsBetter ? visitorNumber < localNumber : visitorNumber > localNumber);
            return <div className="match-team-comparison-row" key={key}>
              <div className="match-team-comparison-metric">{label}</div>
              <div className="match-team-comparison-side match-team-comparison-side-home">
                <span className={`match-team-comparison-value${localWins ? " match-team-comparison-winner" : ""}`}>{display(local)}</span>
                <div className="match-team-comparison-track"><span style={{ width: `${metricWidth(local, visitor, shooting)}%` }} /></div>
              </div>
              <div className="match-team-comparison-side match-team-comparison-side-away">
                <span className={`match-team-comparison-value${visitorWins ? " match-team-comparison-winner" : ""}`}>{display(visitor)}</span>
                <div className="match-team-comparison-track"><span style={{ width: `${metricWidth(visitor, local, shooting)}%` }} /></div>
              </div>
            </div>;
          })}
        </div>
      </div>}
      <p className="match-team-source">Sin dato: valor ausente o no validado en la fuente oficial.</p>

    </div>
  </div>;
}
