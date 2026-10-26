import { useEffect, useState } from "react";

const URL = import.meta.env.VITE_LNA_LIVE_OFICIAL_URL || "https://lna-live-oficial.lnab.workers.dev/api/live";

/** Uses the existing read-only LIVE API; never guesses scores or quarter data. */
export default function useLiveMatch(match) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!match) { return; }
    let active = true;
    const update = async () => {
      try {
        const response = await fetch(URL, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        const item = Array.isArray(data.liveMatches) && data.date === match.date
          ? data.liveMatches.find(item => item.homeTeam === match.homeTeam && item.awayTeam === match.awayTeam)
          : null;
        setSnapshot(item?.status === "live" ? item : null);
      } catch { if (active) setSnapshot(null); }
    };
    update();
    const timer = setInterval(update, 60000);
    const onReturn = () => { if (!document.hidden) update(); };
    document.addEventListener("visibilitychange", onReturn);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", onReturn); };
  }, [match?.date, match?.homeTeam, match?.awayTeam]);
  return match && snapshot?.homeTeam === match.homeTeam && snapshot?.awayTeam === match.awayTeam ? snapshot : null;
}
