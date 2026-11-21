const argentinaToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

export const isLabMatchFinished = match => {
  if (match?.homeScore == null || match?.awayScore == null) return false;
  const homeScore = Number(match.homeScore), awayScore = Number(match.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || (homeScore === 0 && awayScore === 0)) return false;

  if (match.status === "finished") return true;

  // Los fixtures históricos conservan el estado score_available cuando el resultado
  // fue publicado, pero todavía no se importó su boxscore completo.
  return match.status === "score_available" && Boolean(match.date) && match.date < argentinaToday();
};
