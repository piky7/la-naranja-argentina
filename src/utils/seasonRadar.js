import { matchPlayerStats } from "../data/matchStats";
import { isPlayerAppearance } from "./playerAppearance";

// El extremo de cada eje es el líder real de promedio por partido de la
// temporada, calculado exclusivamente con planillas oficiales de la LNB.
// Se exige al menos 3 PJ para evitar que un único partido distorsione el radar.
const fields = ["points","rebounds","assists","steals"];
const totals = new Map();
const seenOfficialUrls = new Set();

for (const [key, match] of Object.entries(matchPlayerStats)) {
  if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(key) ||
      match?.source !== "Liga Nacional" ||
      !match.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/") ||
      seenOfficialUrls.has(match.officialUrl)) continue;
  seenOfficialUrls.add(match.officialUrl);

  for (const teamId of [match.homeTeam, match.awayTeam]) {
    for (const player of match[teamId] || []) {
      if (!player.id || !isPlayerAppearance(player)) continue;
      let row = totals.get(player.id);
      if (!row) {
        row = { games:0, points:0, rebounds:0, assists:0, steals:0, stealsGames:0 };
        totals.set(player.id,row);
      }
      row.games++;
      for (const field of fields.slice(0,3)) row[field] += Number(player[field]) || 0;
      if (player.steals != null && Number.isFinite(Number(player.steals))) {
        row.steals += Number(player.steals);
        row.stealsGames++;
      }
    }
  }
}

const leaderAverage = Object.fromEntries(fields.map(field => {
  const eligible = [...totals.values()]
    .filter(row => row.games >= 3 && (field !== "steals" || row.stealsGames >= 3))
    .map(row => row[field] / (field === "steals" ? row.stealsGames : row.games))
    .filter(value => Number.isFinite(value) && value > 0);
  return [field, eligible.length ? Math.max(...eligible) : null];
}));

export function radarPercent(field, average) {
  if (average == null || average === "") return null;
  const value = Number(average);
  const leader = leaderAverage[field];
  if (!Number.isFinite(value) || !Number.isFinite(leader) || leader <= 0) return null;
  return Math.max(0, Math.min(100, 100 * value / leader));
}
