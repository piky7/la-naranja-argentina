// A player listed on the scoresheet is not necessarily a participant.
// Confirmed DNP or a zero-minute, zero-action row is not a game played.
export function isPlayerAppearance(entry) {
  if (!entry || entry.dnp === true || entry.didNotPlay === true ||
      entry.played === false || entry.status === "DNP" ||
      entry.minutes === "DNP" || entry.minutes === "DNS") return false;
  const parts = typeof entry.minutes === "string" ? entry.minutes.match(/^(\d+):(\d{2})$/) : null;
  const seconds = parts && Number(parts[2]) < 60 ? Number(parts[1]) * 60 + Number(parts[2])
    : typeof entry.minutes === "number" ? entry.minutes * 60 : null;
  if (seconds !== null && seconds > 0) return true;
  const actions = ["points", "rebounds", "assists", "steals", "turnovers",
    "offensiveRebounds", "defensiveRebounds", "blocks", "fouls",
    "personalFouls", "fieldGoalsAttempted", "freeThrowsAttempted"];
  if (actions.some(key => Number(entry[key]) > 0)) return true;
  if (seconds === 0) return false;
  return true; // No reliable DNP evidence: don't invent one.
}
