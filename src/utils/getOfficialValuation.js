
import { officialValuations } from "../data/officialValuations";

export function getOfficialValuation(match, teamId, playerId) {
  if (!match || !teamId || !playerId) {
    return null;
  }

  const matchKey = `${match.homeTeam}-${match.awayTeam}`;

  const value =
    officialValuations[matchKey]?.[teamId]?.[playerId];

  return typeof value === "number" ? value : null;
}
