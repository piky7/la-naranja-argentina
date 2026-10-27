import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const [{ matches: baseMatches }, { matchResults }, { matchPlayerStats }, { teams }] = await Promise.all([
    vite.ssrLoadModule("/src/data/matches.js"),
    vite.ssrLoadModule("/src/data/matchResults.js"),
    vite.ssrLoadModule("/src/data/matchStats.js"),
    vite.ssrLoadModule("/src/data/teams.js"),
  ]);
  const publishedMatches = baseMatches.map(match => {
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    const result = matchResults[key] ?? matchResults[match.id];
    return result ? { ...match, ...result } : match;
  });
  const source = fs.readFileSync("src/pages/Liga.jsx", "utf8");
  const start = source.indexOf("function getUpcomingOfficialCollective(teamId) {");
  const end = source.indexOf("const UPCOMING_COLLECTIVE_STATS =", start);
  assert(start >= 0 && end > start, "No se encontró el cálculo colectivo oficial");
  const context = vm.createContext({ publishedMatches, matchPlayerStats, teams });
  vm.runInContext(source.slice(start, end) + "\n globalThis.calculate = getUpcomingOfficialCollective;", context, { timeout: 30000 });
  const original = Object.fromEntries(teams.map(team => [team.id, JSON.parse(JSON.stringify(context.calculate(team.id)))]));
  // Los valores usados por popups y rankings deben coincidir exactamente
  // con la implementación original para cada equipo y cada estadística.
  const cacheStart = source.indexOf("const UPCOMING_COLLECTIVE_BY_TEAM =");
  assert(cacheStart >= 0, "Falta el cache colectivo que se quiere verificar");
  const cacheEnd = source.indexOf(";", cacheStart);
  assert(cacheEnd > cacheStart, "No se encontró el final del cache");
  vm.runInContext(source.slice(cacheStart, cacheEnd + 1).replace("const UPCOMING_COLLECTIVE_BY_TEAM =", "globalThis.cached ="), context, { timeout: 30000 });
  const cached = JSON.parse(JSON.stringify(context.cached));
  for (const team of teams) assert.deepEqual(cached[team.id], original[team.id], `Promedios de ${team.id}`);
  const fields = [
    ["points", false], ["pointsAgainst", true], ["rebounds", false],
    ["assists", false], ["steals", false], ["blocks", false],
    ["turnovers", true], ["fouls", true], ["fieldGoals", false],
    ["twoPointers", false], ["threePointers", false], ["freeThrows", false],
  ];
  const rank = (lookup, key, lowerIsBetter) => {
    const entries = teams.map(team => ({ id: team.id, value: lookup[team.id].values[key] }))
      .filter(item => Number.isFinite(item.value))
      .sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
    const ranks = {};
    entries.forEach((item, i) => {
      const previous = entries[i - 1];
      ranks[item.id] = previous && previous.value === item.value ? ranks[previous.id] : i + 1;
    });
    return ranks;
  };
  for (const [field, lower] of fields) {
    assert.deepEqual(rank(cached, field, lower), rank(original, field, lower), `Ranking ${field}`);
  }
  console.log(`OK: ${teams.length} equipos y ${fields.length} rankings colectivos equivalentes.`);
} finally {
  await vite.close();
}
