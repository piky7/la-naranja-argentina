import { matchPlayerStats } from "../data/matchStats";
import { isPlayerAppearance } from "./playerAppearance";

// Escala comparativa: percentil 90 de los promedios oficiales de la liga.
// Excluye jugadores con menos de tres partidos para evitar valores atípicos.
const metricFields = ["points", "rebounds", "assists", "steals"];
const totals = new Map();
const seen = new Set();
for (const [key, match] of Object.entries(matchPlayerStats)) {
  if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(key)) continue;
  if (match?.source !== "Liga Nacional" ||
      !match.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/") ||
      seen.has(match.officialUrl)) continue;
  seen.add(match.officialUrl);
  for (const teamId of [match.homeTeam, match.awayTeam]) {
    for (const p of match[teamId] || []) {
      if (!p.id || !isPlayerAppearance(p)) continue;
      let item = totals.get(p.id);
      if (!item) { item = { games: 0, points: 0, rebounds: 0, assists: 0, steals: 0, stealsGames: 0 }; totals.set(p.id,item); }
      item.games++;
      for (const field of metricFields.slice(0,3)) item[field] += Number(p[field]) || 0;
      if (p.steals != null && Number.isFinite(Number(p.steals))) {
        item.steals += Number(p.steals); item.stealsGames++;
      }
    }
  }
}

const reference = Object.fromEntries(metricFields.map(field => {
  const averages = [...totals.values()].filter(p => p.games >= 3 && (field !== "steals" || p.stealsGames >= 3))
    .map(p => p[field] / (field === "steals" ? p.stealsGames : p.games))
    .sort((a,b) => a-b);
  const p90 = averages[Math.floor((averages.length-1) * .9)];
  return [field, Number.isFinite(p90) && p90 > 0 ? p90 : null];
}));

export function radarPercent(field, average) {
  const value = Number(average);
  const max = reference[field];
  return average == null || !Number.isFinite(value) || !max ? null : Math.max(0,Math.min(100,value/max*100));
}
