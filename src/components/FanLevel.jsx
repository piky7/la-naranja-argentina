import { useCallback, useEffect, useState } from "react";
import { Trophy, X, ChevronRight } from "lucide-react";
import "./FanLevel.css";
import { teams } from "../data/teams";

const API = "https://lna-votaciones-api.lnab.workers.dev/api/puntos";
const KEY = "lna-vote-visitor-id";
const INTRO_KEY = "lna-career-intro-seen-v1";
const LEVELS = [
  { name: "Liga de Desarrollo", goal: 50 },
  { name: "Liga Federal", goal: 100 },
  { name: "Liga Argentina", goal: 150 },
  { name: "Liga Nacional", goal: 200 },
  { name: "Estrella LNB", goal: 300 },
  { name: "Leyenda LNA", goal: null },
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
  const [seasonPoints, setSeasonPoints] = useState(null);
  const [career, setCareer] = useState(null);
  const [streaks, setStreaks] = useState({winStreak:0,lossStreak:0,missedStreak:0});
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [introStep, setIntroStep] = useState(null);
  const finishIntro = () => { try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* Sin almacenamiento disponible. */ } setIntroStep(null); };
  const openCareer = () => { refresh(); setActiveView("levels"); setOpen(true); try { if (localStorage.getItem(INTRO_KEY) !== "1") setIntroStep(0); } catch { setIntroStep(0); } };
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
        setSeasonPoints(Number.isFinite(result.seasonPoints) ? result.seasonPoints : result.points);
        setMvps(Number(result.mvps) || 0);
        setCareer(result.career || null);
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
  const seasonScore = seasonPoints ?? score;
  const index = career && Number.isInteger(career.categoryIndex) ? career.categoryIndex : 0;
  const level = LEVELS[index];
  const next = LEVELS[index + 1];
  const streakGoal = index === 3 ? 4 : index === 4 ? 5 : null;
  const categoryStreak = career?.categoryWinStreak || 0;
  const descentLimit = index === 5 ? 2 : index === 4 ? 3 : index === 3 ? 4 : index === 2 ? 5 : null;
  const errorsLeft = descentLimit ? descentLimit - streaks.lossStreak : null;
  const mvpLeft = 10 - (streaks.winStreak % 10);
  const percent = level.goal ? Math.max(0,Math.min(100, seasonScore * 100 / level.goal)) : Math.min(100, ((career?.currentStay || 0) % 10) * 10);

  return (
    <>
      <button className="lna-fan-bar" type="button" onClick={openCareer} aria-label="Ver mi carrera LNA">
        <Trophy size={19} aria-hidden="true" />
        <span className="lna-fan-summary">
          <span className="lna-fan-line"><strong className="lna-fan-bar-category">{level.name === "Liga de Desarrollo" ? <>Liga de<br/>Desarrollo</> : level.name}</strong><b>{seasonPoints === null ? "—" : `${seasonScore}/${level.goal ?? "∞"}`}</b></span>
          <span className="lna-fan-track"><span style={{ width: `${percent}%` }} /></span>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      {open && introStep !== null && <div className="lna-fan-backdrop lna-fan-intro-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) finishIntro(); }}>
        <section className="lna-fan-intro" role="dialog" aria-modal="true" aria-labelledby="lna-career-intro-title">
          <button className="lna-fan-close" type="button" onClick={finishIntro} aria-label="Cerrar presentación"><X size={20}/></button>
          <Trophy size={36} className="lna-fan-intro-icon" aria-hidden="true" />
          <span className="lna-fan-intro-kicker">MI CARRERA · {introStep + 1} DE 3</span>
          <h2 id="lna-career-intro-title">{["TU PASIÓN TAMBIÉN JUEGA","CADA PRONÓSTICO CUENTA","¿DÓNDE VOTAR?"][introStep]}</h2>
          {introStep === 0 ? <p>Elegí quién gana los partidos de la Liga Nacional, sumá puntos, ascendé de categoría y conseguí el distintivo MVP.</p> : introStep === 1 ? <div className="lna-fan-intro-rules"><span>✓ Acierto <b>+15 PTS</b></span><span>✕ Error <b>+5 PTS</b></span><span>🥉 3 aciertos seguidos <b>+30 PTS</b></span><span>🥈 5 aciertos seguidos <b>+45 PTS</b></span><span>Descenso directo <b>según tu categoría</b></span><span>🏆 10 aciertos seguidos <b>MVP</b></span><small>Se acredita al finalizar el partido. No votar corta la racha, pero no resta puntos.</small></div> : <p>En <strong>Inicio → Partidos de hoy</strong>, tocá el partido que quieras pronosticar y elegí el ganador en <strong>¿QUIÉN GANA?</strong> antes de que empiece.</p>}
          <div className="lna-fan-intro-dots">{[0,1,2].map(i => <span key={i} className={introStep === i ? "active" : ""} />)}</div>
          <div className="lna-fan-intro-actions">{introStep > 0 && <button type="button" className="secondary" onClick={() => setIntroStep(v => v - 1)}>Atrás</button>}<button type="button" className="primary" onClick={() => { if (introStep < 2) setIntroStep(v => v + 1); else { finishIntro(); setOpen(false); window.location.assign("/"); } }}>{introStep === 2 ? "¡Empezar a jugar!" : "Siguiente"}</button></div>
          <button className="lna-fan-intro-dismiss" type="button" onClick={finishIntro}>Entendido · Ver mi carrera</button>
        </section>
      </div>}
      {open && introStep === null && <div className="lna-fan-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="lna-fan-modal" role="dialog" aria-modal="true" aria-labelledby="lna-fan-title">
          <button className="lna-fan-close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20}/></button>
          <Trophy className="lna-fan-trophy" size={30} aria-hidden="true" />
          <h2 id="lna-fan-title">MI CARRERA <button type="button" className="lna-fan-help" onClick={() => setIntroStep(0)} aria-label="Ver presentación de Mi carrera" title="Cómo jugar">?</button></h2>
          <p className="lna-fan-total">{seasonPoints === null ? "—" : seasonScore} <span>{level.goal ? `/ ${level.goal} PTS DE CATEGORÍA` : "PTS DE CATEGORÍA"}</span></p>
          <p className="lna-fan-historical">Histórico: <b>{points === null ? "—" : score} PTS</b></p>
          <strong className="lna-fan-current">Categoría {index + 1} · {level.name}</strong>
          <div className="lna-fan-track lna-fan-track-large"><span style={{ width: `${percent}%` }} /></div>
          <p className="lna-fan-next">{next ? (`Te faltan ${Math.max(0,level.goal - seasonScore)} puntos${streakGoal ? ` o ${Math.max(0,streakGoal-categoryStreak)} aciertos consecutivos` : ""} para ganar la copa ${level.name} y ascender a ${next.name}`) : "En Leyenda LNA ganás una copa cada 10 partidos consecutivos de permanencia."}</p>
          <p className="lna-fan-how"><strong>Errado +5</strong> · <strong>Acertado +15</strong> · <strong>3 seguidos +30</strong> · <strong>5 seguidos +45</strong>. <strong>Los errores consecutivos pueden provocar descensos</strong>. Los puntos se suman al terminar el partido.</p>
          <div className="lna-fan-tabs" role="tablist" aria-label="Categorías y pronósticos de Mi carrera">
            <button type="button" role="tab" aria-selected={activeView === "levels"} className={activeView === "levels" ? "active" : ""} onClick={() => setActiveView("levels")}>Categorías</button>
            <button type="button" role="tab" aria-selected={activeView === "predictions"} className={activeView === "predictions" ? "active" : ""} onClick={() => setActiveView("predictions")}>Pronósticos</button>
            <button type="button" role="tab" aria-selected={activeView === "mvp"} className={activeView === "mvp" ? "active" : ""} onClick={() => setActiveView("mvp")}>MVP</button>
            <button type="button" role="tab" aria-selected={activeView === "palmares"} className={activeView === "palmares" ? "active" : ""} onClick={() => setActiveView("palmares")}>Palmarés</button>
          </div>
          {activeView === "levels" && <div className="lna-fan-streak-panel">
            <strong>RACHA DE MI CATEGORÍA</strong>
            <span>{streaks.lossStreak > 0 ? `✕ ${streaks.lossStreak} ${streaks.lossStreak === 1 ? "error consecutivo" : "errores consecutivos"}` : categoryStreak > 0 ? `✓ ${categoryStreak} ${categoryStreak === 1 ? "acierto consecutivo" : "aciertos consecutivos"}` : "Sin racha activa"}</span>
            <small>{streaks.lossStreak > 0 && descentLimit ? `Te ${errorsLeft === 1 ? "falta 1 error consecutivo" : `faltan ${errorsLeft} errores consecutivos`} para descender.` : streakGoal ? `Te ${streakGoal-categoryStreak === 1 ? "falta 1 acierto consecutivo" : `faltan ${streakGoal-categoryStreak} aciertos consecutivos`} para ascender por racha.` : descentLimit ? `En esta categoría descendés con ${descentLimit} errores consecutivos. El ascenso es por puntos.` : "En esta categoría ascendés por puntos."}</small>
          </div>}
          {activeView === "palmares" ? <div className="lna-fan-palmares">
            <div className="lna-fan-palmares-totals"><div><Trophy size={22}/><strong>{career?.cups ?? "—"}</strong><small>Copas ganadas</small></div><div><span aria-hidden="true">↓</span><strong>{career?.descents ?? "—"}</strong><small>Descensos</small></div></div>
            <h3>VITRINA DE COPAS</h3>
            <div className="lna-fan-cup-grid">{LEVELS.map((item,i) => <div className={`lna-fan-cup ${(career?.cupCounts?.[i] || 0)>0 ? "earned" : ""}`} key={item.name}><Trophy size={20}/><strong>{item.name}</strong><small>{(career?.cupCounts?.[i] || 0)>0 ? `×${career.cupCounts[i]}` : "—"}</small></div>)}</div>
            <p className="lna-fan-palmares-hint">Cada ascenso suma la copa de la liga disputada. En Leyenda LNA ganás otra copa cada 10 partidos consecutivos de permanencia. Las copas nunca se pierden.</p>
          </div> : activeView === "mvp" ? <div className="lna-fan-mvp">
            <div className="lna-fan-streak-panel">
              <strong>RACHA MVP · TODAS LAS CATEGORÍAS</strong>
              <span>{streaks.winStreak > 0 ? `✓ ${streaks.winStreak} aciertos seguidos` : streaks.lossStreak > 0 ? `✕ ${streaks.lossStreak} ${streaks.lossStreak === 1 ? "error seguido" : "errores seguidos"}` : streaks.missedStreak > 0 ? `— ${streaks.missedStreak} ${streaks.missedStreak === 1 ? "partido sin votar" : "partidos sin votar"}` : "Sin racha activa"}</span>
              <small>{`Te faltan ${mvpLeft} ${mvpLeft === 1 ? "acierto consecutivo" : "aciertos consecutivos"} para ${mvps > 0 ? "otro MVP" : "conseguir el MVP"}.`}</small>
            </div>
                        <Trophy size={38} aria-hidden="true" />
            <strong>MVP DE PRONÓSTICOS</strong>
            <span className="lna-fan-mvp-count">{mvps}</span>
            <p>{mvps === 1 ? "Distintivo conseguido" : "Distintivos conseguidos"}</p>
            <small>Acertá <b>10 partidos consecutivos</b> para conseguir un MVP. No suma puntos y queda como recuerdo permanente. Si errás o no votás un partido, se corta la racha. Cada 10 aciertos consecutivos ganás otro MVP.</small>
          </div> : activeView === "levels" ? <div className="lna-fan-levels">
            {LEVELS.map((item, i) => <div key={item.name} className={`lna-fan-level ${i === index ? "is-current" : ""} ${i < index ? "is-earned" : ""}`}>
              <span>{i < index ? "✓" : i + 1}</span><strong>{item.name}<em className="lna-fan-record">Récord: {career?.records?.[i] ? `${career.records[i]} partidos` : "—"}</em></strong><small>{item.goal === null ? "10 partidos" : `${item.goal} PTS${i === 3 ? " / 4 aciertos consecutivos" : i === 4 ? " / 5 aciertos consecutivos" : ""}`}</small>
            </div>)}

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
