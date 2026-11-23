import { officialValuations } from "../data/officialValuations.js";
import { matchPlayerStats } from "../data/matchStats.js";

export function getOfficialValuation(match, teamId, playerId) {
  if (!match || !teamId || !playerId) {
    return null;
  }

  // Priorizar la clave única del partido (fecha + equipos).
  const datedMatchKey =
    `${match.date}-${match.homeTeam}-${match.awayTeam}`;

  const officialMatch = matchPlayerStats[datedMatchKey];

  const officialPlayer = officialMatch?.[teamId]?.find(
    (player) => player.id === playerId
  );

  if (
    typeof officialPlayer?.valuation === "number" &&
    Number.isFinite(officialPlayer.valuation)
  ) {
    return officialPlayer.valuation;
  }

  // Respaldo para partidos históricos.
  // No reutilizar valoraciones históricas en partidos posteriores
// a la migración oficial.
if (!match.date || match.date > "2026-10-19") {
  return null;
}
  const legacyMatchKey = `${match.homeTeam}-${match.awayTeam}`;

  const legacyValue =
    officialValuations[legacyMatchKey]?.[teamId]?.[playerId];

  return typeof legacyValue === "number" &&
    Number.isFinite(legacyValue)
    ? legacyValue
    : null;
}