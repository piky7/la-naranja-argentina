import { isPlayerAppearance } from "../utils/playerAppearance";
import { useMemo } from "react";
import { players } from "../data/players";
import { matchPlayerStats } from "../data/matchStats";
import "./LiveRosters.css";

const seasonDate = /^2026-(09|10|11|12)-|^2027-(0[1-6])-/;

function secondsPlayed(value) {
  if (typeof value === "string") {
    const match = value.match(/^(\d+):(\d{2})$/);
    if (match && Number(match[2]) < 60) return Number(match[1]) * 60 + Number(match[2]);
  }
  return Number.isFinite(value) && value >= 0 ? value * 60 : null;
}

function getRoster(teamId, matches) {
  const totals = new Map();
  const seen = new Set();
  for (const match of matches) {
    if (match.status !== "finished" || !seasonDate.test(match.date || "")) continue;
    if (match.homeTeam !== teamId && match.awayTeam !== teamId) continue;
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(key)) continue;
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) continue;
    if (!Array.isArray(record[teamId])) continue;
    seen.add(key);
    for (const stat of record[teamId]) {
      if (!stat.id || !isPlayerAppearance(stat)) continue;
      const current = totals.get(stat.id) || { games: 0, points: 0, rebounds: 0, assists: 0, seconds: 0, minutesGames: 0 };
      current.games += 1;
      current.points += Number(stat.points) || 0;
      current.rebounds += Number(stat.rebounds) || 0;
      current.assists += Number(stat.assists) || 0;
      const seconds = secondsPlayed(stat.minutes);
      if (seconds !== null) { current.seconds += seconds; current.minutesGames += 1; }
      totals.set(stat.id, current);
    }
  }
  return players.filter(player => player.teamId === teamId).map(player => {
    const t = totals.get(player.id);
    return { ...player, averages: t?.games ? {
      points: t.points / t.games, rebounds: t.rebounds / t.games, assists: t.assists / t.games,
      minutes: t.minutesGames ? t.seconds / t.minutesGames : null,
    } : null };
  }).sort((a, b) => (b.averages?.minutes ?? -1) - (a.averages?.minutes ?? -1) || a.name.localeCompare(b.name, "es"));
}

const formatNumber = value => Number.isFinite(value) ? value.toFixed(1) : "—";
const formatMinutes = value => Number.isFinite(value)
  ? `${String(Math.floor(Math.round(value) / 60)).padStart(2, "0")}:${String(Math.round(value) % 60).padStart(2, "0")}` : "—";

export default function LiveRosters({ homeTeam, awayTeam, matches, onPlayerClick }) {
  const homeRoster = useMemo(() => getRoster(homeTeam.id, matches), [homeTeam.id, matches]);
  const awayRoster = useMemo(() => getRoster(awayTeam.id, matches), [awayTeam.id, matches]);
  const renderTeam = (team, roster) => (
    <div className="live-roster-team" key={team.id}>
      <div className="live-roster-team-head">
        {team.logo && <img src={team.logo} alt="" />}
        <strong>{team.shortName || team.name}</strong>
      </div>
      <div className="live-roster-row live-roster-labels"><span>#</span><span>JUGADOR</span><span>PTS</span><span>REB</span><span>AST</span><span>MIN</span></div>
      {roster.map(player => (
        <button type="button" key={player.id} className="live-roster-row live-roster-player"
          onClick={() => onPlayerClick({ ...player, team, stats: player.averages ? {
            playerId: player.id, gamesPlayed: 0, points: player.averages.points, rebounds: player.averages.rebounds,
            assists: player.averages.assists, minutes: player.averages.minutes / 60,
          } : null })}>
          <span className="live-roster-number">{player.number ?? "—"}</span>
          <span className="live-roster-name" title={player.name}>{player.name}</span>
          <span>{formatNumber(player.averages?.points)}</span>
          <span>{formatNumber(player.averages?.rebounds)}</span>
          <span>{formatNumber(player.averages?.assists)}</span>
          <strong>{formatMinutes(player.averages?.minutes)}</strong>
        </button>
      ))}
      {!roster.length && <p className="live-roster-empty">Sin jugadores registrados</p>}
    </div>
  );
  return <div className="live-rosters">
    <h3>PLANTELES · 2026/27</h3>
    <div className="live-rosters-grid">{renderTeam(homeTeam, homeRoster)}{renderTeam(awayTeam, awayRoster)}</div>
  </div>;
}
