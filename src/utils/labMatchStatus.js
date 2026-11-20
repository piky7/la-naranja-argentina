export const isLabMatchFinished = match => {
  if (match?.status !== "finished" || match.homeScore == null || match.awayScore == null) return false;
  return Number.isFinite(Number(match.homeScore)) && Number.isFinite(Number(match.awayScore));
};
