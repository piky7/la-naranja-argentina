import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
const API = "https://lna-prode-api.lnab.workers.dev";
export default function ProdeHistoricalRanking() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(API + "/api/prode/ranking/historical").then(async res => {
      const json = await res.json();
      if (!res.ok || !json.ok) throw Error(json.error || "Ranking no disponible");
      if (active) setData(json);
    }).catch(() => { if (active) setError("No se pudo cargar el ranking histórico."); });
    return () => { active = false; };
  }, []);
  const leaders = data?.ranking || [];
  const podium = [leaders[1], leaders[0], leaders[2]];
  return <>
    <div className="prode-podium" aria-label="Tres mejores del ranking histórico">
      {podium.map((entry, index) => <div key={index} className={"prode-podium-item " + ["second","first","third"][index]}>
        <span className="prode-podium-medal">{[2,1,3][index]}</span>
        <div className="prode-podium-avatar">{entry ? entry.username.slice(0,1).toUpperCase() : index === 1 ? <Trophy size={23}/> : "?"}</div>
        <span>{entry?.username || "Sin participante"}</span>
        <strong>{entry ? entry.points + " pts" : "— pts"}</strong>
      </div>)}
    </div>
    <div className="prode-panel-bottom"><span>{error || (data ? (data.total ? "Puntos históricos de Mi Carrera · " + data.total + " participantes vinculados" : "Vinculá Mi Carrera para participar del ranking histórico.") : "Cargando puntos históricos…")}</span></div>
  </>;
}
