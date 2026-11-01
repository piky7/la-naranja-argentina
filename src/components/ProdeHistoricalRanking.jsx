import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import ProdeCrest from "./ProdeCrest";
const API = "https://lna-prode-api.lnab.workers.dev";

export default function ProdeHistoricalRanking({ weekly = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => fetch(API + (weekly ? "/api/prode/ranking/weekly" : "/api/prode/ranking/historical")).then(async res => {
      const json = await res.json();
      if (!res.ok || !json.ok) throw Error(json.error || "Ranking no disponible");
      if (active) { setData(json); setError(""); }
    }).catch(() => { if (active) setError("No se pudo cargar el ranking."); });
    load();
    const refresh = () => { load(); };
    window.addEventListener("prode-profile-updated",refresh);
    return () => { active = false; window.removeEventListener("prode-profile-updated",refresh); };
  }, [weekly]);
  const leaders = (data?.ranking || []).filter(entry => entry.position != null);
  const podium = [leaders[1], leaders[0], leaders[2]];
  const weekLabel = data?.weekStartsAt ? (() => {
    const start = new Date(data.weekStartsAt);
    const end = new Date(start.getTime() + 6*86400000);
    const fmt = d => d.toLocaleDateString("es-AR",{day:"numeric",month:"short",timeZone:"UTC"});
    return fmt(start) + " – " + fmt(end);
  })() : "Lunes a domingo";
  return <>
    <div className="prode-podium" aria-label={weekly ? "Tres mejores de la semana" : "Tres mejores del ranking histórico"}>
      {podium.map((entry, index) => <div key={index} className={"prode-podium-item " + ["second","first","third"][index]}>
        <span className="prode-podium-medal">{[2,1,3][index]}</span>
        <div className="prode-podium-avatar prode-podium-vector">{entry ? <ProdeCrest name={entry.username} primary={entry.crestPrimary} secondary={entry.crestSecondary} textColor={entry.crestText} size={index === 1 ? 64 : 54}/> : <Trophy size={23}/>}</div>
        <span>{entry?.username || "Sin participante"}</span>
        <strong>{entry ? entry.points + " pts" : "— pts"}</strong>
      </div>)}
    </div>
    <div className="prode-panel-bottom"><span>{error || (data ? weekly ? "Semana " + weekLabel + " · " + leaders.length + " participantes con pronósticos" : "Puntos históricos de Mi Carrera · " + data.total + " participantes vinculados" : "Cargando clasificación…")}</span></div>
  </>;
}
