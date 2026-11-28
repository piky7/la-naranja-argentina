import { useLiveSnapshot } from "./useLiveSnapshot";

/** Return only a current official LIVE match; never revive stale snapshots. */
export default function useLiveMatch(match) {
  const { date, liveMatches } = useLiveSnapshot();
  if (!match || date !== match.date) return null;
  const item = liveMatches.find(entry =>
    entry.homeTeam === match.homeTeam &&
    entry.awayTeam === match.awayTeam &&
    entry.status === "live" &&
    entry.isStale !== true
  );
  return item || null;
}
