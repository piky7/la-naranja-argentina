import { useEffect, useState } from "react";
import { Award, ArrowDownRight, ArrowUpRight, Crown, Flame, Trophy } from "lucide-react";
import { fetchProdeRead } from "../utils/prodeRequestCache";
import "./ProdeCareerDetails.css";

const CATEGORIES = ["Liga de Desarrollo","Liga Federal","Liga Argentina","Liga Nacional","Estrella LNB","Leyenda LNA"];

const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString("es-AR") : "—";

export default function ProdeCareerDetails({ memberId, user }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    setBusy(true);
    if (!memberId || !user) {
      setBusy(false);
      return () => { active = false; };
    }
    const load = async () => {
      try {
        const result = await fetchProdeRead("/api/prode/career/public-profile?memberId=" + encodeURIComponent(memberId), user, { ttlMs: 30000 });
        if (active) setData(result);
      } catch (cause) {
        if (active) setError(cause.message || "Error al cargar Mi Carrera");
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [memberId,user]);

  if (!user) return <p className="prode-career-note">Iniciá sesión con Google para consultar las carreras de los jugadores.</p>;
  if (busy) return <p className="prode-career-note" role="status">Consultando Mi Carrera del participante…</p>;
  if (error) return <p className="prode-career-note" role="alert">{error}</p>;
  if (!data?.available) return <p className="prode-career-note">Este participante todavía no tiene una carrera vinculada o disponible.</p>;

  const career = data.career || {};
  const index = Math.max(0, Math.min(CATEGORIES.length - 1, Number(career.categoryIndex) || 0));
  const best = Math.max(index, Math.min(CATEGORIES.length - 1, Number(career.bestCategory) || 0));
  const movements = Array.isArray(career.history) ? career.history : [];
  return <div className="prode-career-details">
    <div className="prode-career-current">
      <span><Crown size={16}/> CATEGORÍA ACTUAL</span>
      <strong>{CATEGORIES[index]}</strong>
      <small>Máxima alcanzada: {CATEGORIES[best]}</small>
    </div>
    <div className="prode-career-metrics">
      <div><Trophy size={18}/><strong>{fmt(career.cups)}</strong><span>Copas</span></div>
      <div><ArrowDownRight size={18}/><strong>{fmt(career.descents)}</strong><span>Descensos</span></div>
      <div><Award size={18}/><strong>{fmt(data.points)}</strong><span>PTS históricos</span></div>
      <div><Flame size={18}/><strong>{fmt(data.winStreak)}/5</strong><span>Racha global</span></div>
    </div>
    <div className="prode-career-progress">
      <div className="prode-career-progress-copy"><strong>Progreso de categoría</strong><span>{fmt(data.seasonPoints)} {career.goal == null ? "PTS" : "/ " + fmt(career.goal) + " PTS"}</span></div>
      {career.goal != null && <div className="prode-career-progress-track"><span style={{ width: Math.min(100, Math.max(0, (Number(data.seasonPoints) || 0) / Math.max(1, Number(career.goal)) * 100)) + "%" }}/></div>}
      <small>Los ascensos también pueden depender de la racha global, según la categoría.</small>
    </div>
    <h4 className="prode-career-subtitle">Copas por categoría</h4>
    <div className="prode-career-cups">
      {CATEGORIES.map((name,i) => <div key={name} className={i === index ? "is-current" : ""}><span>{name}</span><strong>{fmt(career.cupCounts?.[i] || 0)} <Trophy size={13}/></strong></div>)}
    </div>
    <h4 className="prode-career-subtitle">Trayectoria</h4>
    {movements.length ? <div className="prode-career-timeline">
      {movements.map((move,i) => <div className={"prode-career-event " + (move.type || "")} key={(move.gameId || i) + "-" + i}>
        <span className="prode-career-event-icon">{move.type === "descent" ? <ArrowDownRight size={17}/> : move.type === "promotion" ? <ArrowUpRight size={17}/> : <Trophy size={17}/>}</span>
        <div><strong>{move.type === "descent" ? "Descenso" : move.type === "promotion" ? "Ascenso" : "Copa de permanencia"}</strong><span>{move.category || "Mi Carrera"}</span></div>
        <small>{typeof move.gameId === "string" && /^\d{4}-\d{2}-\d{2}/.test(move.gameId) ? move.gameId.slice(0,10).split("-").reverse().join("/") : ""}</small>
      </div>)}
    </div> : <p className="prode-career-note">Todavía no registra ascensos, descensos ni copas en su trayectoria.</p>}
    <p className="prode-career-disclaimer">Estos datos pertenecen a Mi Carrera de LNA y son independientes de los puntos y medallas obtenidos en cada liga de amigos.</p>
  </div>;
}
