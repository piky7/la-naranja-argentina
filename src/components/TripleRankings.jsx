import { useMemo, useState } from "react";
import { players } from "../data/players";
import { teams } from "../data/teams";
import { matches } from "../data/matches";
import { matchResults } from "../data/matchResults";
import { matchPlayerStats } from "../data/matchStats";
import "./TripleRankings.css";

const positions = ["Todas", "Base", "Escolta", "Alero", "Ala-pívot", "Pívot"];
const validMade = (shot) => {
  const value = shot?.made;
  return value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
};

function calculateTriples() {
  const totals = new Map();
  const seen = new Set();
  for (const match of matches) {
    if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = matchResults[key] ?? matchResults[match.id];
    if ((result?.status ?? match.status) !== "finished") continue;
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
    for (const teamId of [match.homeTeam, match.awayTeam]) {
      if (!Array.isArray(record[teamId])) continue;
      for (const entry of record[teamId]) {
        if (!entry.id) continue;
        const made = validMade(entry.threePointers);
        if (made === null) continue;
        const current = totals.get(entry.id) || { made: 0, games: 0 };
        current.made += made;
        current.games += 1;
        totals.set(entry.id, current);
      }
    }
  }
  return players.filter(player => totals.has(player.id)).map(player => ({
    ...player, ...totals.get(player.id),
    team: teams.find(team => team.id === player.teamId),
  })).sort((a, b) => b.made - a.made || a.name.localeCompare(b.name, "es"));
}
const ranking = calculateTriples();

export default function TripleRankings({ onPlayerClick }) {
  const [position, setPosition] = useState("Todas");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => ranking.filter(player =>
    (position === "Todas" || player.position === position) &&
    player.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))
  ), [position, search]);
  return <section className="triple-ranking">
    <div className="triple-heading">
      <span>LIGA NACIONAL · 2026/27</span>
      <h2>Ranking de triplistas</h2>
      <p>Triples convertidos acumulados en partidos con planilla individual oficial.</p>
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
      {[1, 0, 2].map(index => {
        const player = filtered[index];
        return <button type="button" key={index} className={`triple-podium-card triple-podium-${index + 1}`} disabled={!player} onClick={() => onPlayerClick(player)}>
          <span className="triple-medal">{["🥇", "🥈", "🥉"][index]}</span>
          <strong className="triple-podium-value">{player?.made ?? "—"}</strong>
          <small>TRIPLES</small>
          <strong className="triple-podium-name">{player?.name || "Sin datos"}</strong>
          {player?.team?.logo && <img src={player.team.logo} alt="" />}
        </button>;
      })}
    </div>
    <div className="triple-table-head"><span>JUGADOR</span><span>TRIPLES</span></div>
    <div className="triple-list">
      {filtered.map((player, index) => <button type="button" className="triple-row" key={player.id} onClick={() => onPlayerClick(player)}>
        <span className="triple-position">{index + 1}</span>
        <span className="triple-player-name">{player.name}<small>{player.position}</small></span>
        {player.team?.logo && <img src={player.team.logo} alt={player.team.name} />}
        <strong>{player.made}</strong>
      </button>)}
      {!filtered.length && <p className="triple-empty">No hay triples individuales oficiales disponibles para este filtro.</p>}
    </div>
    <p className="triple-note">Los valores reflejan solamente los partidos con estadísticas individuales oficiales disponibles; pueden no representar todos los encuentros disputados.</p>
  </section>;
}
