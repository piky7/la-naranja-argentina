const fs = require("node:fs");

const PREVIEW = "official-sync-preview.json";
const MATCH_STATS = "src/data/matchStats.js";
const MATCH_RESULTS = "src/data/matchResults.js";

async function main() {
  if (!fs.existsSync(PREVIEW)) throw new Error("Falta la vista previa oficial.");
  const preview = JSON.parse(fs.readFileSync(PREVIEW, "utf8"));
  if (preview.source !== "Liga Nacional") throw new Error("Fuente inválida: se esperaba Liga Nacional.");
  if (!Number.isInteger(preview.verifiedMatches) || preview.verifiedMatches < 1) {
    throw new Error("No hay estadísticas oficiales validadas. Se cancela la publicación.");
  }

  const currentStats = (await import("./src/data/matchStats.js?official-sync")).matchPlayerStats;
  const currentResults = (await import("./src/data/matchResults.js?official-sync")).matchResults;
  const matchStats = structuredClone(currentStats);
  const matchResults = structuredClone(currentResults);

  let statsAdded = 0;
  for (const [key, record] of Object.entries(preview.matchStats || {})) {
    if (record.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) {
      throw new Error("Intento de publicar estadísticas sin URL oficial: " + key);
    }
    const home = record[record.homeTeam];
    const away = record[record.awayTeam];
    if (!Array.isArray(home) || !Array.isArray(away) || !home.length || !away.length) {
      throw new Error("Estadísticas incompletas: " + key);
    }
    const homePoints = home.reduce((sum, player) => sum + Number(player.points || 0), 0);
    const awayPoints = away.reduce((sum, player) => sum + Number(player.points || 0), 0);
    if (homePoints !== record.homeScore || awayPoints !== record.awayScore) {
      throw new Error("La suma de puntos no coincide con el marcador: " + key);
    }
    matchStats[key] = record;
    statsAdded++;
  }

  let resultsAdded = 0;
  for (const [key, record] of Object.entries(preview.matchResults || {})) {
    if (record.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) {
      throw new Error("Intento de publicar resultado sin URL oficial: " + key);
    }
    if (record.status !== "finished" || !Number.isInteger(record.homeScore) || !Number.isInteger(record.awayScore)) {
      throw new Error("Resultado oficial incompleto: " + key);
    }
    matchResults[key] = record;
    resultsAdded++;
  }

  if (statsAdded !== preview.verifiedMatches) {
    throw new Error(`Conteo de estadísticas inconsistente: ${statsAdded} registros, ${preview.verifiedMatches} declarados.`);
  }
  if (resultsAdded < statsAdded) {
    throw new Error("Hay más partidos con estadísticas que resultados oficiales.");
  }

  fs.writeFileSync(MATCH_STATS, "export const matchPlayerStats = " + JSON.stringify(matchStats, null, 2) + ";\n", "utf8");
  fs.writeFileSync(MATCH_RESULTS, "export const matchResults = " + JSON.stringify(matchResults, null, 2) + ";\n", "utf8");

  console.log("Publicación oficial preparada:");
  console.log("Estadísticas oficiales incorporadas:", statsAdded);
  console.log("Resultados oficiales incorporados/actualizados:", resultsAdded);
  console.log("Partidos con estadísticas incompletas permanecen sin estadísticas nuevas.");
}

main().catch((error) => {
  console.error("Error al preparar publicación oficial:", error.message);
  process.exitCode = 1;
});
