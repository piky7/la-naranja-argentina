export const isLabMatchFinished = match => {
  if (match?.status !== "finished" || match.homeScore == null || match.awayScore == null) return false;
  const home = Number(match.homeScore), away = Number(match.awayScore);
  return Number.isFinite(home) && Number.isFinite(away) && !(home === 0 && away === 0);
};
