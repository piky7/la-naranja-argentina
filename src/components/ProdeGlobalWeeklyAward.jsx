import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { watchProdeUser } from "../auth/prodeAuth";
import ProdeWeeklyAwards from "./ProdeWeeklyAwards";

const API = "https://lna-prode-api.lnab.workers.dev";
const seenKey = (uid, week) => `lna-global-week-award:${uid}:${week.startsAt}`;

export default function ProdeGlobalWeeklyAward() {
  const [user, setUser] = useState(null);
  const [award, setAward] = useState(null);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe;
    watchProdeUser(next => { if (active) setUser(next); })
      .then(stop => { if (active) unsubscribe = stop; else stop?.(); })
      .catch(() => {});
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) { return undefined; }
    const load = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(API + "/api/prode/ranking/weekly/awards", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw Error(data.error || "Reconocimiento no disponible");
        if (!active) return;
        const week = data.week;
        if (!week?.finished || !week.eligibleForMedals || !week.ranking?.length || week.number < 1 || Date.parse(week.startsAt) < Date.UTC(2026, 10, 2)) {
          setLatest(null);
          setAward(null);
          return;
        }
        const item = { week, league: { name: "PRODE LNA · RANKING GLOBAL" }, storageKey: seenKey(user.uid, week), variant: "global" };
        setLatest(item);
        let seen = false;
        try { seen = localStorage.getItem(item.storageKey) === "1"; } catch { /* almacenamiento privado */ }
        if (!seen) setAward(current => current || item);
        setError("");
      } catch (cause) {
        if (active) setError(cause.message || "Reconocimiento no disponible");
      }
    };
    void load();
    window.addEventListener("prode-page-reopened", load);
    window.addEventListener("prode-profile-updated", load);
    return () => {
      active = false;
      window.removeEventListener("prode-page-reopened", load);
      window.removeEventListener("prode-profile-updated", load);
    };
  }, [user]);

  const dismiss = () => {
    if (award) {
      try { localStorage.setItem(award.storageKey, "1"); } catch { /* almacenamiento privado */ }
    }
    setAward(null);
  };

  if (!user || (!latest && !error)) return null;
  return <>
    {latest && <button type="button" className="prode-global-award-open" onClick={() => setAward(latest)}><Award size={15}/> Reconocimiento global · Semana {latest.week.number}</button>}
    {award && <ProdeWeeklyAwards award={award} userId={"firebase:" + user.uid} variant="global" onClose={dismiss}/>}
  </>;
}
