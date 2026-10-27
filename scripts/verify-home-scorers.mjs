import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const [{ matches: baseMatches }, { matchResults }, { players }, { playerStats }, { matchPlayerStats }, { teams }, { isPlayerAppearance }] = await Promise.all([
    vite.ssrLoadModule("/src/data/matches.js"),
    vite.ssrLoadModule("/src/data/matchResults.js"),
    vite.ssrLoadModule("/src/data/players.js"),
    vite.ssrLoadModule("/src/data/stats.js"),
    vite.ssrLoadModule("/src/data/matchStats.js"),
    vite.ssrLoadModule("/src/data/teams.js"),
    vite.ssrLoadModule("/src/utils/playerAppearance.js"),
  ]);
  const matches = baseMatches.map(match => {
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    const result = matchResults[key] ?? matchResults[match.id];
    return result ? { ...match, ...result } : match;
  });
  const source = fs.readFileSync("src/pages/Home.jsx", "utf8");
  const oldStart = source.indexOf("  const getPlayerStats = (playerId) => {");
  const oldEnd = source.indexOf("const getPlayerLastMatches", oldStart);
  const newStart = source.indexOf("  const topScorers = useMemo(() => {");
  const newEnd = source.indexOf("  // Módulos editoriales", newStart);
  assert.ok(oldStart >= 0 && oldEnd > oldStart && newStart >= 0 && newEnd > newStart, "No se encuentran los cálculos de Home");
  const context = vm.createContext({
    matches, players, playerStats, matchPlayerStats, teams, isPlayerAppearance,
    isMatchFinished: match => match?.status === "finished" || (match?.homeScore != null && match?.homeScore !== "" && match?.awayScore != null && match?.awayScore !== ""),
    getTeam: id => teams.find(team => team.id === id),
    useMemo: fn => fn(),
  });
  const oldCode = source.slice(oldStart, oldEnd).replace("const getPlayerStats =", "globalThis.getPlayerStats =");
  const newCode = source.slice(newStart, newEnd)
    .replace("const topScorers =", "globalThis.topScorers =")
    .replace("    return players\\n      .map(player => {", "    const allPlayers = players\\n      .map(player => {")
    .replace("      .filter(player => player.stats?.gamesPlayed > 0)", "    globalThis.allOptimizedPlayers = allPlayers;\\n    return allPlayers\\n      .filter(player => player.stats?.gamesPlayed > 0)");
  assert.ok(newCode.includes("globalThis.allOptimizedPlayers = allPlayers"), "No se pudo instrumentar el cálculo optimizado");
  vm.runInContext(oldCode + "\n" + newCode, context, { timeout: 30000 });
  const oldRanking = players.map(player => {
    const stats = context.getPlayerStats(player.id);
    return { ...player, stats, points: stats?.points ?? null };
  }).filter(player => player.stats?.gamesPlayed > 0)
    .sort((a,b) => b.points - a.points || a.name.localeCompare(b.name,"es")).slice(0,10);
  const optimizedById = new Map(context.allOptimizedPlayers.map(player => [player.id, player.stats]));
  assert.equal(optimizedById.size, players.length, "Cantidad de jugadores comparados");
  for (const player of players) {
    const before = context.getPlayerStats(player.id);
    const after = optimizedById.get(player.id);
    for (const field of ["gamesPlayed", "points", "rebounds", "assists"]) {
      assert.equal(after?.[field], before?.[field], `${player.id}: ${field}`);
    }
  }
  console.log(`OK: ${players.length} jugadores comparados individualmente (PJ/PTS/REB/AST).`);
  const actual = context.topScorers;
  assert.equal(actual.length, oldRanking.length, "Cantidad de jugadores del ranking");
  for (let i=0; i<actual.length; i++) {
    assert.equal(actual[i].id, oldRanking[i].id, `Posición ${i+1}`);
    for (const field of ["gamesPlayed","points","rebounds","assists"]) {
      assert.equal(actual[i].stats[field], oldRanking[i].stats[field], `${actual[i].id}: ${field}`);
    }
  }
  console.log(`OK: ${players.length} jugadores disponibles; top ${actual.length} idéntico (PJ/PTS/REB/AST).`);
} finally {
  await vite.close();
}
