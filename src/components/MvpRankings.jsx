import { useMemo, useState } from "react";
import { players } from "../data/players";
import { teams, teamMatchColors } from "../data/teams";
import { matchPlayerStats } from "../data/matchStats";
import { isPlayerAppearance } from "../utils/playerAppearance";
import "./TripleRankings.css";

const positions = ["Todas", "Base", "Escolta", "Alero", "Ala-pívot", "Pívot"];

function calculateMvps() {
  const totals = new Map();
  const seen = new Set();
  for (const [key, record] of Object.entries(matchPlayerStats)) {
    if (!/^(2026-(09|10|11|12)|2027-(0[1-6]))-/.test(key)) continue;
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
    if (seen.has(record.officialUrl)) continue;
    seen.add(record.officialUrl);
    const entries = [record.homeTeam, record.awayTeam].flatMap(teamId => Array.isArray(record[teamId]) ? record[teamId] : []);
    // Una planilla incompleta no puede determinar un MVP con seguridad.
    if (!entries.length || entries.some(entry => isPlayerAppearance(entry) && (entry.valuation == null || !Number.isFinite(Number(entry.valuation))))) continue;
    const eligible = entries.filter(entry => entry.id && isPlayerAppearance(entry) && Number.isFinite(Number(entry.valuation)));
    if (!eligible.length) continue;
    const highest = Math.max(...eligible.map(entry => Number(entry.valuation)));
    // En caso de empate de valoración oficial, ambos reciben un MVP.
    for (const entry of eligible) {
      if (Number(entry.valuation) === highest) totals.set(entry.id, (totals.get(entry.id) || 0) + 1);
    }
  }
  return players.filter(player => (totals.get(player.id) || 0) > 0).map(player => ({
    ...player, mvps: totals.get(player.id),
    team: teams.find(team => team.id === player.teamId),
  })).sort((a,b) => b.mvps - a.mvps || a.name.localeCompare(b.name, "es")).slice(0,10);
}
const ranking = calculateMvps();

export default function MvpRankings({ onPlayerClick }) {
  const [position, setPosition] = useState("Todas");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => ranking.filter(player =>
    (position === "Todas" || player.position === position) &&
    player.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))
  ), [position,search]);
  return <section className="triple-ranking">
    <div className="triple-heading">
      <span>LIGA NACIONAL · 2026/27</span>
      <h2>Ranking de MVP</h2>
      <p>Los 10 jugadores con más MVP de partido según la valoración individual oficial.</p>
    </div>
    <div className="triple-filters">
      <label>POSICIÓN
        <select value={position} onChange={event => setPosition(event.target.value)}>
          {positions.map(item => <option key={item} value={item}>{item === "Todas" ? "Todas las posiciones" : item}</option>)}
        </select>
      </label>
      <label>BUSCAR JUGADOR
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar jugador..." />
      </label>
    </div>
    <div className="triple-podium">
      {[1,0,2].map(index => {
        const player = filtered[index];
        return <button type="button" key={index} className={`triple-podium-card triple-podium-${index + 1}`} disabled={!player} onClick={() => onPlayerClick(player)}>
          <span className="triple-medal">{["🥇","🥈","🥉"][index]}</span>
          <strong className="triple-podium-value">{player?.mvps ?? "—"}</strong>
          <small>MVP</small>
          <strong className="triple-podium-name">{player?.name || "Sin datos"}</strong>
          {player?.team?.logo && <img src={player.team.logo} alt="" />}
        </button>;
      })}
    </div>
    <div className="triple-table-head"><span>JUGADOR</span><span>MVP</span></div>
    <div className="triple-list">
      {filtered.slice(3).map((player,index) => <button type="button" className="triple-row" style={{"--ranking-team-color":teamMatchColors[player.teamId] || "#18334b"}} key={player.id} onClick={() => onPlayerClick(player)}>
        <span className="triple-position">{index+4}</span>
        <span className="triple-player-name">{player.name}<small>{player.position}</small></span>
        {player.team?.logo && <img src={player.team.logo} alt={player.team.name} />}
        <strong>{player.mvps}</strong>
      </button>)}
      {!filtered.length && <p className="triple-empty">Todavía no hay MVP oficiales disponibles para este filtro.</p>}
    </div>
    <p className="triple-note">Se cuentan únicamente partidos con estadísticas individuales oficiales disponibles. Los empates en valoración otorgan un MVP a cada jugador empatado.</p>
  </section>;
}
