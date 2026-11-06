/**
 * Indexar una sola vez los resultados finales confirmados por el Worker LIVE.
 * Si hay más de un registro para el mismo partido, conserva el primero,
 * igual que Array.find en las pantallas anteriores.
 */
export function indexFinishedLiveMatches(snapshot) {
  const byMatch = new Map();
  for (const live of snapshot.liveMatches || []) {
    if (live.status !== "finished" || live.isHalftime ||
        live.homeScore == null || live.awayScore == null) continue;
    const key = `${snapshot.date}|${live.homeTeam}|${live.awayTeam}`;
    if (!byMatch.has(key)) byMatch.set(key, live);
  }
  return byMatch;
}

export function getFinishedLiveMatch(index, match) {
  return index.get(`${match.date}|${match.homeTeam}|${match.awayTeam}`) || null;
}
