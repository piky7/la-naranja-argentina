import { useCallback, useEffect, useState } from "react";
import { Trophy, X, ChevronRight } from "lucide-react";
import "./FanLevel.css";
import { teams } from "../data/teams";

const API = "https://lna-votaciones-api.lnab.workers.dev/api/puntos";
const KEY = "lna-vote-visitor-id";
const LEVELS = [
  { name: "Rookie", points: 0 },
  { name: "Hincha", points: 50 },
  { name: "Sexto hombre", points: 150 },
  { name: "Titular", points: 300 },
  { name: "All-Star", points: 500 },
  { name: "Leyenda LNA", points: 1000 },
];

function getVisitorId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch { return null; }
}

export default function FanLevel() {
  const [points, setPoints] = useState(null);
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const refresh = useCallback(async () => {
    const id = getVisitorId();
    if (!id) return;
    try {
      const response = await fetch(`${API}?visitanteId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (result.ok && Number.isFinite(result.points)) setPoints(result.points);
    } catch { /* Conservar los últimos puntos conocidos si falla la conexión. */ }
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => { if (!document.hidden) refresh(); };
    const onVote = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("lna-vote-updated", onVote);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("lna-vote-updated", onVote);
    };
  }, [refresh]);

  const refreshHistory = useCallback(async () => {
    const id = getVisitorId();
    if (!id) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const response = await fetch(`https://lna-votaciones-api.lnab.workers.dev/api/mis-pronosticos?visitanteId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Historial no disponible");
      const result = await response.json();
      if (!result.ok || !Array.isArray(result.predictions)) throw new Error("Historial inválido");
      setPredictions(result.predictions);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refreshHistory();
  }, [open, refreshHistory]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const score = points ?? 0;
  const index = LEVELS.reduce((current, item, i) => score >= item.points ? i : current, 0);
  const level = LEVELS[index];
  const next = LEVELS[index + 1];
  const percent = next ? Math.min(100, (score - level.points) * 100 / (next.points - level.points)) : 100;

  return (
    <>
      <button className="lna-fan-bar" type="button" onClick={() => { refresh(); setOpen(true); }} aria-label="Ver mis puntos y nivel de hincha">
        <Trophy size={19} aria-hidden="true" />
        <span className="lna-fan-summary">
          <span className="lna-fan-line"><strong>{level.name}</strong><b>{points === null ? "—" : score} PTS</b></span>
          <span className="lna-fan-track"><span style={{ width: `${percent}%` }} /></span>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      {open && <div className="lna-fan-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="lna-fan-modal" role="dialog" aria-modal="true" aria-labelledby="lna-fan-title">
          <button className="lna-fan-close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20}/></button>
          <div className="lna-fan-hero">
            <Trophy className="lna-fan-trophy" size={34} aria-hidden="true" />
            <span className="lna-fan-eyebrow">TU NIVEL ACTUAL</span>
            <h2 id="lna-fan-title">Nivel {index + 1} · {level.name}</h2>
            <p className="lna-fan-total">{points === null ? "—" : score} <span>PTS</span></p>
            <div className="lna-fan-track lna-fan-track-large"><span style={{ width: `${percent}%` }} /></div>
            <p className="lna-fan-next">{next ? `Te faltan ${next.points - score} puntos para ${next.name}` : "¡Alcanzaste el nivel máximo!"}</p>
          </div>
          <p className="lna-fan-how">Sumás <strong>10 puntos</strong> por cada pronóstico válido, aciertes o no.</p>
          <div className="lna-fan-history">
            <h3>MIS PRONÓSTICOS</h3>
            {historyLoading ? <p className="lna-fan-history-message">Cargando tus votaciones…</p> : historyError ? <div className="lna-fan-history-message">No se pudo cargar el historial. <button type="button" onClick={refreshHistory}>Reintentar</button></div> : predictions.length === 0 ? <p className="lna-fan-history-message">Todavía no tenés pronósticos registrados.</p> : <>
              <div className="lna-fan-stats">
                <span><b className="correct">{predictions.filter(p => p.status === "correct").length}</b> Acertados</span>
                <span><b className="incorrect">{predictions.filter(p => p.status === "incorrect").length}</b> Errados</span>
                <span><b>{predictions.filter(p => p.status === "pending").length}</b> Pendientes</span>
              </div>
              <div className="lna-fan-history-list">
                {predictions.map(p => {
                  const home = teams.find(t => t.id === p.homeTeam);
                  const away = teams.find(t => t.id === p.awayTeam);
                  const chosen = teams.find(t => t.id === p.selected);
                  const statusText = p.status === "correct" ? "Acertaste" : p.status === "incorrect" ? "Erraste" : "Pendiente";
                  return <div className={`lna-fan-prediction ${p.status}`} key={p.partidoId}>
                    <div className="lna-fan-prediction-top"><span>{p.partidoId.slice(0, 10).split("-").reverse().join("/")}</span><strong>{statusText}</strong></div>
                    <div className="lna-fan-prediction-match">
                      <span>{home?.logo && <img src={home.logo} alt="" />}{home?.shortName || p.homeTeam || "Local"}</span>
                      <b>{p.homeScore != null && p.awayScore != null ? `${p.homeScore} - ${p.awayScore}` : "VS"}</b>
                      <span>{away?.logo && <img src={away.logo} alt="" />}{away?.shortName || p.awayTeam || "Visitante"}</span>
                    </div>
                    <small>Tu voto: <strong>{chosen?.shortName || p.selected.replace(/-/g, " ")}</strong></small>
                  </div>;
                })}
              </div>
            </>}
          </div>
          <button type="button" className="lna-fan-levels-toggle" onClick={() => setShowAllLevels(v => !v)} aria-expanded={showAllLevels}>{showAllLevels ? "Ocultar niveles" : "Ver todos los niveles"} <ChevronRight size={16} /></button>
          {showAllLevels && <div className="lna-fan-levels">
            {LEVELS.map((item, i) => <div key={item.name} className={`lna-fan-level ${i === index ? "is-current" : ""} ${i < index ? "is-earned" : ""}`}>
              <span>{i < index ? "✓" : i + 1}</span><strong>{item.name}</strong><small>{item.points} PTS</small>
            </div>)}
          </div>}
          <p className="lna-fan-note">Los puntos están vinculados a este navegador. Si borrás sus datos o cambiás de dispositivo, podrías perder el acceso a tu progreso.</p>
        </section>
      </div>}
    </>
  );
}
