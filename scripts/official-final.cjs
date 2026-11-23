const auditedFinals = require("./audited-official-finals.json");
// A score, its age and matching player totals do not prove completion.
function isConfirmedFinal(match) {
  return match?.status === "finished" &&
    match?.finalEvidence?.type === "official-final-status" &&
    match.finalEvidence.officialUrl === match.officialUrl;
}

function assertPublishableResult(key, result, stats) {
  const baseline = auditedFinals[key];
  const auditedHistorical = baseline && baseline.homeScore === result.homeScore &&
    baseline.awayScore === result.awayScore && baseline.officialUrl === result.officialUrl &&
    result?.finalEvidence?.type === "audited-history-through-2026-10-19" &&
    result.finalEvidence.officialUrl === result.officialUrl;
  if ((!isConfirmedFinal(result) && !auditedHistorical) || !stats ||
      result.source !== "Liga Nacional" || stats.source !== result.source ||
      stats.officialUrl !== result.officialUrl ||
      !result.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/") ||
      key !== `${key.slice(0, 10)}-${result.homeTeam}-${result.awayTeam}` ||
      stats.homeTeam !== result.homeTeam || stats.awayTeam !== result.awayTeam) {
    throw new Error("Resultado sin finalización oficial y estadísticas verificadas: " + key);
  }
  for (const side of ["home", "away"]) {
    const score = result[`${side}Score`];
    const players = stats[result[`${side}Team`]];
    if (!Number.isInteger(score) || score < 0 || stats[`${side}Score`] !== score ||
        !Array.isArray(players) || !players.length ||
        players.some(p => !Number.isInteger(p.points) || p.points < 0) ||
        players.reduce((sum, p) => sum + p.points, 0) !== score) {
      throw new Error("Marcador o puntos individuales inconsistentes: " + key);
    }
  }
}

module.exports = { isConfirmedFinal, assertPublishableResult };
