const { assertPublishableResult } = require("./scripts/official-final.cjs");
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

  // Validate the entire preview before any cleanup or writes, including stale previews.
  for (const [key, result] of Object.entries(preview.matchResults || {})) {
    assertPublishableResult(key, result, preview.matchStats?.[key]);
  }
  for (const key of Object.keys(preview.matchStats || {})) {
    if (!preview.matchResults?.[key]) throw new Error("Estadísticas sin resultado validado: " + key);
  }

  const currentStats = (await import("./src/data/matchStats.js?official-sync")).matchPlayerStats;
  const currentResults = (await import("./src/data/matchResults.js?official-sync")).matchResults;
  const matchStats = structuredClone(currentStats);
  const matchResults = structuredClone(currentResults);

  // Eliminar el fallback histórico de Flashscore para partidos cubiertos por
  // el fixture oficial. Si no hay estadísticas oficiales validadas, la web
  // debe mostrar que no hay estadísticas disponibles, nunca reutilizar datos
  // antiguos de otra fuente como si fueran oficiales.
  const officialStatsKeys = new Set(Object.keys(preview.matchStats || {}));
  let legacyStatsRemoved = 0;
  let unverifiedStatsRemoved = 0;

  for (const [key, result] of Object.entries(preview.matchResults || {})) {
    if (result.source !== "Liga Nacional" || !result.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) {
      throw new Error("No se puede limpiar ni reemplazar un partido sin origen oficial: " + key);
    }
    if (!result.homeTeam || !result.awayTeam) {
      throw new Error("Faltan los equipos internos para aplicar la política de fuente oficial: " + key);
    }

    const legacyKey = `${result.homeTeam}-${result.awayTeam}`;
    if (Object.prototype.hasOwnProperty.call(matchStats, legacyKey)) {
      delete matchStats[legacyKey];
      legacyStatsRemoved++;
    }

   if (
  !officialStatsKeys.has(key) &&
  Object.prototype.hasOwnProperty.call(matchStats, key) &&
  matchStats[key]?.source !== "Liga Nacional"
) {
  delete matchStats[key];
  unverifiedStatsRemoved++;
}
  }

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
    const legacyKey = `${record.homeTeam}-${record.awayTeam}`;

const HISTORICAL_QUARTERS_CUTOFF = "2026-10-19";

const previousStats =
  currentStats[key] ??
  (
    key.slice(0, 10) <= HISTORICAL_QUARTERS_CUTOFF
      ? currentStats[legacyKey]
      : null
  );

const quarterScores = previousStats?.quarterScores;

matchStats[key] = {
  ...record,
  ...(Array.isArray(quarterScores) && quarterScores.length > 0
    ? { quarterScores: structuredClone(quarterScores) }
    : {}),
};
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
    const previous = currentResults[key];
    const preserveHistorical = record.finalEvidence?.type === "audited-history-through-2026-10-19" &&
      previous?.status === "finished" && previous.homeScore === record.homeScore &&
      previous.awayScore === record.awayScore && previous.officialUrl === record.officialUrl;
    matchResults[key] = preserveHistorical ? previous : record;
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
  console.log("Claves antiguas eliminadas para evitar fallback a Flashscore:", legacyStatsRemoved);
  console.log("Estadísticas previas sin validación oficial retiradas:", unverifiedStatsRemoved);
  console.log("Los partidos sin estadísticas oficiales verificadas quedan sin estadísticas de jugador, en lugar de mostrar datos de otra fuente.");
}

main().catch((error) => {
  console.error("Error al preparar publicación oficial:", error.message);
  process.exitCode = 1;
});
