import { useLiveSnapshot } from "./useLiveSnapshot";

/** Read the shared official LIVE snapshot without starting another poll. */
export default function useLiveMatch(match) {
  const { date, liveMatches } = useLiveSnapshot();
  if (!match || date !== match.date) return null;
  const item = liveMatches.find(entry =>
    entry.homeTeam === match.homeTeam && entry.awayTeam === match.awayTeam
  );
  return item?.status === "live" ? item : null;
}
