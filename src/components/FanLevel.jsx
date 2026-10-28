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
  const [mvps, setMvps] = useState(0);
  const [streaks, setStreaks] = useState({winStreak:0,lossStreak:0,missedStreak:0});
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [activeView, setActiveView] = useState("levels");
  const refresh = useCallback(async () => {
    const id = getVisitorId();
    if (!id) return;
    try {
      const response = await fetch(`${API}?visitanteId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (result.ok && Number.isFinite(result.points)) {
        setPoints(result.points);
        setMvps(Number(result.mvps) || 0);
        setStreaks({winStreak:result.winStreak || 0,lossStreak:result.lossStreak || 0,missedStreak:result.missedStreak || 0});
      }
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
      setPage(0);
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
      <button className="lna-fan-bar" type="button" onClick={() => { refresh(); setActiveView("levels"); setOpen(true); }} aria-label="Ver mi carrera LNA">
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
          <Trophy className="lna-fan-trophy" size={30} aria-hidden="true" />
          <h2 id="lna-fan-title">MI CARRERA</h2>
          <p className="lna-fan-total">{points === null ? "—" : score} <span>PTS</span></p>
          <strong className="lna-fan-current">Nivel {index + 1} · {level.name}</strong>
          <div className="lna-fan-track lna-fan-track-large"><span style={{ width: `${percent}%` }} /></div>
          <p className="lna-fan-next">{next ? `Te faltan ${next.points - score} puntos para ${next.name}` : "¡Alcanzaste el nivel máximo!"}</p>
          <p className="lna-fan-how"><strong>Errado +5</strong> · <strong>Acertado +15</strong> · <strong>3 seguidos +30</strong> · <strong>5 seguidos +45</strong>. Los puntos se suman al terminar el partido.</p>
          <div className="lna-fan-tabs" role="tablist" aria-label="Información de hincha">
            <button type="button" role="tab" aria-selected={activeView === "levels"} className={activeView === "levels" ? "active" : ""} onClick={() => setActiveView("levels")}>Mis niveles</button>
            <button type="button" role="tab" aria-selected={activeView === "predictions"} className={activeView === "predictions" ? "active" : ""} onClick={() => setActiveView("predictions")}>Pronósticos</button>
            <button type="button" role="tab" aria-selected={activeView === "mvp"} className={activeView === "mvp" ? "active" : ""} onClick={() => setActiveView("mvp")}>MVP</button>
          </div>
          {activeView === "mvp" ? <div className="lna-fan-mvp">
            <Trophy size={38} aria-hidden="true" />
            <strong>MVP DE PRONÓSTICOS</strong>
            <span className="lna-fan-mvp-count">{mvps}</span>
            <p>{mvps === 1 ? "Distintivo conseguido" : "Distintivos conseguidos"}</p>
            <small>Acertá <b>10 partidos consecutivos</b> para conseguir un MVP. No suma puntos y queda como recuerdo permanente. Si errás o no votás un partido, se corta la racha. Cada 10 aciertos consecutivos ganás otro MVP.</small>
          </div> : activeView === "levels" ? <div className="lna-fan-levels">
            {LEVELS.map((item, i) => <div key={item.name} className={`lna-fan-level ${i === index ? "is-current" : ""} ${i < index ? "is-earned" : ""}`}>
              <span>{i < index ? "✓" : i + 1}</span><strong>{item.name}</strong><small>{item.points} PTS</small>
            </div>)}
            <div className="lna-fan-streak-panel">
              <strong>MI RACHA ACTUAL</strong>
              <span>{streaks.winStreak > 0 ? `✓ ${streaks.winStreak} aciertos seguidos` : streaks.lossStreak > 0 ? `✕ ${streaks.lossStreak} errores seguidos` : streaks.missedStreak > 0 ? `— ${streaks.missedStreak} partidos sin votar` : "Sin racha activa"}</span>
              <small>{streaks.winStreak === 2 ? "¡Estás a un acierto de sumar 30 PTS!" : streaks.winStreak === 4 ? "¡Estás a un acierto de sumar 45 PTS!" : streaks.winStreak === 9 ? "¡Estás a un acierto del MVP!" : streaks.lossStreak === 2 ? "Cuidado: otro error activa la penalización de −5 PTS." : streaks.missedStreak === 4 ? "No votar corta las rachas, pero no descuenta puntos." : streaks.winStreak > 0 && streaks.winStreak < 3 ? `Te faltan ${3-streaks.winStreak} aciertos para los 30 PTS.` : streaks.winStreak >= 3 && streaks.winStreak < 5 ? `Te faltan ${5-streaks.winStreak} aciertos para los 45 PTS.` : streaks.winStreak >= 5 ? `Te faltan ${10-streaks.winStreak%10} aciertos para otro MVP.` : streaks.lossStreak > 0 ? `Otro error te acerca a la penalización de −5 PTS.` : streaks.missedStreak > 0 ? `Llevás ${streaks.missedStreak} partidos sin votar.` : "Acertá partidos consecutivos para conseguir premios."}</small>
            </div>
          </div> : <div className="lna-fan-history">
            {historyLoading ? <p className="lna-fan-history-message">Cargando tus votaciones…</p> : historyError ? <div className="lna-fan-history-message">No se pudo cargar el historial. <button type="button" onClick={refreshHistory}>Reintentar</button></div> : predictions.length === 0 ? <p className="lna-fan-history-message">Todavía no tenés pronósticos registrados.</p> : <>
              <div className="lna-fan-stats">
                <span><b className="correct">{predictions.filter(p => p.status === "correct").length}</b> Acertados</span>
                <span><b className="incorrect">{predictions.filter(p => p.status === "incorrect").length}</b> Errados</span>
                <span><b>{predictions.filter(p => p.status === "pending").length}</b> Pendientes</span>
              </div>
              <div className="lna-fan-history-list">
                {predictions.slice(page * 6, page * 6 + 6).map(p => {
                  const home = teams.find(t => t.id === p.homeTeam);
                  const away = teams.find(t => t.id === p.awayTeam);
                  const chosen = teams.find(t => t.id === p.selected);
                  const statusText = p.status === "correct" ? "✓" : p.status === "incorrect" ? "✕" : "·";
                  return <div className={`lna-fan-prediction ${p.status} ${p.medal ? `medal-${p.medal}` : ""}`} key={p.partidoId}>
                    <span className="lna-fan-prediction-status" aria-label={p.status === "correct" ? "Acertaste" : p.status === "incorrect" ? "Erraste" : "Pendiente"}>{statusText}</span>
                    <span className="lna-fan-prediction-date">{p.partidoId.slice(5, 10).replace("-", "/")}</span>
                    <div className="lna-fan-prediction-match">
                      <span>{home?.logo && <img src={home.logo} alt="" />}{home?.shortName || p.homeTeam || "Local"}</span>
                      <b>{p.homeScore != null && p.awayScore != null ? `${p.homeScore}-${p.awayScore}` : "VS"}</b>
                      <span>{away?.logo && <img src={away.logo} alt="" />}{away?.shortName || p.awayTeam || "Visitante"}</span>
                    </div>
                    <small>Votaste: <strong>{chosen?.shortName || p.selected.replace(/-/g, " ")}</strong> <b className="lna-fan-earned">{p.earned == null ? "Pendiente" : `${p.earned >= 0 ? "+" : ""}${p.earned} PTS`}{p.medal === "gold" ? " 🥇" : p.medal === "silver" ? " 🥈" : p.medal === "bronze" ? " 🥉" : ""}</b></small>
                  </div>;
                })}
              </div>
              {predictions.length > 6 && <div className="lna-fan-pages"><button type="button" disabled={page === 0} onClick={() => setPage(v => v - 1)}>‹ Recientes</button><span>{page + 1} / {Math.ceil(predictions.length / 6)}</span><button type="button" disabled={(page + 1) * 6 >= predictions.length} onClick={() => setPage(v => v + 1)}>Anteriores ›</button></div>}
            </>}
          </div>}
          <p className="lna-fan-note">Los puntos están vinculados a este navegador. Si borrás sus datos o cambiás de dispositivo, podrías perder el acceso a tu progreso.</p>
        </section>
      </div>}
    </>
  );
}
