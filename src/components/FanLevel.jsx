import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, X, ChevronRight, Flame, LockKeyhole, Target, Crown, Pencil, Check } from "lucide-react";
import "./FanLevel.css";
import { teams } from "../data/teams";

const API = "https://lna-votaciones-api.lnab.workers.dev/api/puntos";
const KEY = "lna-vote-visitor-id";
const INTRO_KEY = "lna-career-intro-seen-v1";
const PLAYER_NAME_KEY = "lna-career-player-name-v1";
const PLAYER_NUMBER_KEY = "lna-career-player-number-v1";
const CAREER_EVENTS_KEY = "lna-career-events-seen-v1";
const careerEventId = event => `${event.gameId}:${event.type}:${event.category}`;
const readSeenEvents = () => { try { const value = JSON.parse(localStorage.getItem(CAREER_EVENTS_KEY) || "null"); return Array.isArray(value) ? value : null; } catch { return null; } };
const readPlayerNumber = () => { try { return localStorage.getItem(PLAYER_NUMBER_KEY) ?? ""; } catch { return ""; } };
const readPlayerName = () => { try { return localStorage.getItem(PLAYER_NAME_KEY) || ""; } catch { return ""; } };
const TROPHY_IMAGES = ["/trofeos/desarrollo.svg", "/trofeos/federal.svg", "/trofeos/argentina.svg", "/trofeos/nacional.svg", "/trofeos/estrella.svg", "/trofeos/leyenda.svg"];
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

function PlayerJersey({ name, number }) {
  const displayName = (name || "TU NOMBRE").toLocaleUpperCase("es-AR");
  const fontSize = displayName.length > 18 ? 8 : displayName.length > 12 ? 10 : displayName.length > 8 ? 12 : 15;
  return <svg className="lna-fan-player-jersey" viewBox="0 0 116 134" role="img" aria-label={`Camiseta de básquet de ${name || "jugador"} con número ${number || "sin asignar"}`}>
    <defs>
      <linearGradient id="lnaJersey" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#20253b"/><stop offset=".5" stopColor="#090f1f"/><stop offset="1" stopColor="#2c1733"/></linearGradient>
      <linearGradient id="lnaJerseyTrim" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffa4da"/><stop offset=".5" stopColor="#e83c9e"/><stop offset="1" stopColor="#ffb1df"/></linearGradient>
    </defs>
    <path d="M36 9 43 5h30l7 4 24 11-9 33-13-5v73H34V48l-13 5-9-33z" fill="url(#lnaJersey)" stroke="#f86cb5" strokeWidth="2.4" strokeLinejoin="round"/>
    <path d="M36 9 43 5Q43 23 58 23T73 5l7 4M12 20l9 33 13-5M104 20 95 53 82 48" fill="none" stroke="url(#lnaJerseyTrim)" strokeWidth="5"/>
    <path d="M34 117h48M38 42v70M78 42v70" fill="none" stroke="#ed4b9f" strokeWidth="1.5" opacity=".65"/>
    <path d="M39 10q19 24 38 0" fill="none" stroke="#ffb1df" strokeWidth="1.5"/>
    <circle cx="58" cy="39" r="7" fill="none" stroke="#ff83c4" strokeWidth="1.5"/>
    <path d="M51 39h14M58 32v14M53 34q9 6 10 10" fill="none" stroke="#ff83c4" strokeWidth="1"/>
    <text x="58" y="60" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize={fontSize} textLength={displayName.length > 9 ? 72 : undefined} lengthAdjust="spacingAndGlyphs" fill="#fff">{displayName}</text>
    <text x="58" y="102" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="950" fontSize={number?.length === 2 ? 45 : 50} fill="#f15aa9" stroke="#fff0fa" strokeWidth="1.3" paintOrder="stroke">{number || "—"}</text>
  </svg>;
}

export default function FanLevel() {
  const modalRef = useRef(null);
  const seenEventsRef = useRef(readSeenEvents());
  const [pendingEvents, setPendingEvents] = useState([]);
  const [eventNotice, setEventNotice] = useState(null);
  const [playerName, setPlayerName] = useState(readPlayerName);
  const [playerNumber, setPlayerNumber] = useState(readPlayerNumber);
  const [nameDraft, setNameDraft] = useState("");
  const [numberDraft, setNumberDraft] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const startEditProfile = () => { setNameDraft(playerName); setNumberDraft(playerNumber); setProfileError(""); setEditingProfile(true); };
  const closeProfileEditor = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setEditingProfile(false);
    setProfileError("");
  };
  const saveProfile = (event) => {
    event.preventDefault();
    const name = nameDraft.trim().replace(/\s+/g, " ");
    if (!name || name.length > 24) { setProfileError("Ingresá un nombre de hasta 24 caracteres."); return; }
    if (!/^(?:[0-9]|[1-9][0-9])$/.test(numberDraft)) { setProfileError("Elegí un dorsal del 0 al 99."); return; }
    try {
      localStorage.setItem(PLAYER_NAME_KEY, name);
      localStorage.setItem(PLAYER_NUMBER_KEY, numberDraft);
    } catch { setProfileError("No se pudo guardar el perfil en este navegador."); return; }
    setPlayerName(name); setPlayerNumber(numberDraft); closeProfileEditor();
  };
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
  const dismissEvent = () => {
    if (!eventNotice) return;
    const seen = [...new Set([...(seenEventsRef.current || []), careerEventId(eventNotice)])].slice(-250);
    seenEventsRef.current = seen;
    try { localStorage.setItem(CAREER_EVENTS_KEY, JSON.stringify(seen)); } catch { /* El evento puede volver a mostrarse si no hay almacenamiento. */ }
    setEventNotice(null);
    setPendingEvents(previous => previous.filter(item => careerEventId(item) !== careerEventId(eventNotice)));
  };
  const [predictions, setPredictions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [activeView, setActiveView] = useState("levels");
  useEffect(() => { if (modalRef.current) modalRef.current.scrollTop = 0; }, [editingProfile, activeView]);
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
        if (Array.isArray(result.career?.moves)) {
          const moves = [...result.career.moves].reverse().filter(item => item?.gameId && item?.type && item?.category);
          if (seenEventsRef.current === null) {
            // Primera visita tras instalar la función: no reproducir logros antiguos.
            const baseline = moves.map(careerEventId);
            seenEventsRef.current = baseline;
            try { localStorage.setItem(CAREER_EVENTS_KEY, JSON.stringify(baseline)); } catch {}
          } else {
            const seen = new Set(seenEventsRef.current);
            setPendingEvents(moves.filter(item => !seen.has(careerEventId(item))));
          }
        }
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
    if (open && activeView === "predictions") refreshHistory();
  }, [open, activeView, refreshHistory]);

  useEffect(() => {
    if (open && introStep === null && !editingProfile && !eventNotice && pendingEvents.length) setEventNotice(pendingEvents[0]);
  }, [open, introStep, editingProfile, eventNotice, pendingEvents]);

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
      {open && introStep === null && eventNotice && createPortal(<div className="lna-fan-achievement-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) dismissEvent(); }}>
        <section className={`lna-fan-achievement ${eventNotice.type === "descent" ? "is-descent" : "is-promotion"}`} role="dialog" aria-modal="true" aria-labelledby="lna-fan-achievement-title">
          <div className="lna-fan-achievement-rays" aria-hidden="true" />
          <button type="button" className="lna-fan-achievement-close" onClick={dismissEvent} aria-label="Cerrar notificación"><X size={20}/></button>
          <span className="lna-fan-achievement-kicker">{eventNotice.type === "descent" ? "CAMBIO DE CATEGORÍA" : "NUEVO LOGRO DESBLOQUEADO"}</span>
          <h2 id="lna-fan-achievement-title">{eventNotice.type === "descent" ? "DESCENDISTE" : eventNotice.type === "legend-cup" ? "¡OTRA COPA!" : "¡CAMPEÓN!"}</h2>
          {eventNotice.type === "descent" ? <div className="lna-fan-achievement-fall"><span aria-hidden="true">↓</span><strong>{eventNotice.category}</strong></div> : <img className="lna-fan-achievement-trophy" src={TROPHY_IMAGES[Math.max(0, LEVELS.findIndex(item => item.name === eventNotice.category))]} alt={`Copa ${eventNotice.category}`} />}
          <strong className="lna-fan-achievement-category">{eventNotice.category}</strong>
          <p>{eventNotice.type === "descent" ? "Una etapa difícil, pero tu carrera continúa. ¡Volvé más fuerte!" : eventNotice.type === "legend-cup" ? "¡Sumaste otra copa por tu permanencia en Leyenda LNA!" : `Ganaste la copa de ${eventNotice.category} y ascendiste a ${LEVELS[Math.min(LEVELS.length - 1, LEVELS.findIndex(item => item.name === eventNotice.category) + 1)]?.name}.`}</p>
          <button type="button" className="lna-fan-achievement-continue" onClick={dismissEvent}>{pendingEvents.length > 1 ? "Siguiente logro" : "Continuar mi carrera"}</button>
        </section>
      </div>, document.body)}
      {open && introStep !== null && <div className="lna-fan-backdrop lna-fan-intro-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) finishIntro(); }}>
        <section className="lna-fan-intro" role="dialog" aria-modal="true" aria-labelledby="lna-career-intro-title">
          <button className="lna-fan-close" type="button" onClick={finishIntro} aria-label="Cerrar presentación"><X size={20}/></button>
          <Trophy size={36} className="lna-fan-intro-icon" aria-hidden="true" />
          <span className="lna-fan-intro-kicker">MI CARRERA · {introStep + 1} DE 3</span>
          <h2 id="lna-career-intro-title">{["CÓMO JUGAR","PUNTOS Y PREMIOS","LIGAS · ASCENSOS Y DESCENSOS"][introStep]}</h2>
          {introStep === 0 ? <p>Elegí al ganador en <strong>Inicio → Partidos de hoy → ¿QUIÉN GANA?</strong> antes de que empiece el partido. Cuando termina, sumás puntos para tu liga y para tu histórico. En <strong>Mi carrera</strong> podés consultar tu progreso, pronósticos, MVP y copas.</p> : introStep === 1 ? <div className="lna-fan-intro-rules">
            <span>✓ Pronóstico acertado <b>+15 PTS</b></span>
            <span>✕ Pronóstico errado <b>+5 PTS</b></span>
            <span>3 aciertos consecutivos <b>+30 PTS en el tercero</b></span>
            <span>5 aciertos consecutivos <b>+45 PTS en el quinto</b></span>
            <span>MVP <b>1 distintivo cada 10 aciertos consecutivos</b></span>
            <small>Los puntos se acreditan al finalizar el partido. No votar no suma puntos y corta las rachas. La racha MVP continúa aunque cambies de liga.</small>
          </div> : <div className="lna-fan-intro-rules lna-fan-intro-leagues">
            <span><strong>Desarrollo</strong><small>↑ 50 PTS</small><small>↓ Sin descenso</small></span>
            <span><strong>Federal</strong><small>↑ 100 PTS</small><small>↓ Sin descenso</small></span>
            <span><strong>Argentina</strong><small>↑ 150 PTS</small><small>↓ 5 errores seguidos</small></span>
            <span><strong>Nacional</strong><small>↑ 200 PTS o 4 aciertos seguidos</small><small>↓ 4 errores seguidos</small></span>
            <span><strong>Estrella LNB</strong><small>↑ 300 PTS o 5 aciertos seguidos</small><small>↓ 3 errores seguidos</small></span>
            <span><strong>Leyenda LNA</strong><small>🏆 Cada 10 partidos</small><small>↓ 2 errores seguidos</small></span>
            <small>Al ascender ganás la copa. Los puntos y la racha de categoría se reinician al cambiar de liga; el histórico, las copas y la racha MVP se conservan.</small>
          </div>}
          <div className="lna-fan-intro-dots">{[0,1,2].map(i => <span key={i} className={introStep === i ? "active" : ""} />)}</div>
          <div className="lna-fan-intro-actions">{introStep > 0 && <button type="button" className="secondary" onClick={() => setIntroStep(v => v - 1)}>Atrás</button>}<button type="button" className="primary" onClick={() => { if (introStep < 2) setIntroStep(v => v + 1); else { finishIntro(); } }}>{introStep === 2 ? "¡Entendido!" : "Siguiente"}</button></div>
          <button className="lna-fan-intro-dismiss" type="button" onClick={finishIntro}>Entendido · Ver mi carrera</button>
        </section>
      </div>}
      {open && introStep === null && <div className="lna-fan-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section ref={modalRef} className={`lna-fan-modal ${activeView === "palmares" ? "lna-fan-modal-palmares" : ""}`} role="dialog" aria-modal="true" aria-labelledby="lna-fan-title">
          <button className="lna-fan-close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20}/></button>
          <div className="lna-fan-gamer-heading">
            <span className="lna-fan-gamer-trophy"><Trophy size={23} aria-hidden="true" /></span>
            <h2 id="lna-fan-title">MI CARRERA <button type="button" className="lna-fan-help" onClick={() => setIntroStep(0)} aria-label="Ver presentación de Mi carrera" title="Cómo jugar">?</button></h2>
          </div>
          <div className="lna-fan-player-profile lna-fan-player-profile-with-jersey">
            <div className="lna-fan-jersey-panel"><PlayerJersey name={playerName} number={playerNumber}/></div>
            <div className="lna-fan-player-fields lna-fan-player-display">
              <div className="lna-fan-player-display-top">
                <span className="lna-fan-player-caption">MI JUGADOR</span>
                <button type="button" className="lna-fan-edit-profile-button" onClick={startEditProfile} aria-label="Editar perfil de jugador"><Pencil size={13} aria-hidden="true" /> <span>Editar perfil</span></button>
              </div>
              <strong className="lna-fan-player-display-name">{playerName || "TU NOMBRE"}</strong>
              <span className="lna-fan-player-display-number">DORSAL <b>#{playerNumber || "—"}</b></span>
              <small className="lna-fan-player-display-league">{level.name}</small>
            </div>
          </div>
          {editingProfile && createPortal(<div className="lna-fan-profile-edit-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeProfileEditor(); }}>
            <form className="lna-fan-profile-edit-dialog" onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="lna-fan-edit-title">
              <div className="lna-fan-profile-edit-heading"><h3 id="lna-fan-edit-title">EDITAR MI JUGADOR</h3><button type="button" aria-label="Cerrar edición" onClick={closeProfileEditor}><X size={18}/></button></div>
              <label htmlFor="lna-player-name">Nombre o apodo</label>
              <input id="lna-player-name" maxLength={24} value={nameDraft} onChange={e => { setNameDraft(e.target.value); setProfileError(""); }} placeholder="Tu nombre" />
              <label htmlFor="lna-player-number">Número de camiseta (0 a 99)</label>
              <input id="lna-player-number" inputMode="numeric" maxLength={2} pattern="[0-9]{1,2}" value={numberDraft} onChange={e => { setNumberDraft(e.target.value.replace(/\D/g, "").slice(0,2)); setProfileError(""); }} placeholder="Ej. 7" />
              {profileError && <small role="alert" className="lna-fan-profile-edit-error">{profileError}</small>}
              <div className="lna-fan-profile-edit-actions"><button type="button" onClick={closeProfileEditor}>Cancelar</button><button type="submit"><Check size={15}/> Guardar perfil</button></div>
            </form>
          </div>, document.body)}
          <div className="lna-fan-gamer-hero">
            <div className="lna-fan-gamer-score">
              <p className="lna-fan-total">{seasonPoints === null ? "—" : seasonScore} <span>/ {level.goal ?? "∞"} PTS</span></p>
              <p className="lna-fan-historical">HISTÓRICO: <b>{points === null ? "—" : score} PTS</b></p>
            </div>
            <div className="lna-fan-gamer-rank">
              <span>CATEGORÍA ACTUAL</span>
              <strong>{level.name}</strong>
              <small>POSICIÓN {index + 1} DE {LEVELS.length}</small>
            </div>
          </div>
          <div className="lna-fan-gamer-progress"><div className="lna-fan-track lna-fan-track-large"><span style={{ width: `${percent}%` }} /></div><strong>{next ? `${Math.max(0,(level.goal ?? 0)-seasonScore)} PTS` : `${10 - ((career?.currentStay || 0) % 10)} PARTIDOS`}<small>{next ? "PARA ASCENDER" : "PARA LA COPA"}</small></strong></div>
          <p className="lna-fan-next"><span aria-hidden="true">↗</span>{next ? (`Te faltan ${Math.max(0,level.goal - seasonScore)} puntos${streakGoal ? ` o ${Math.max(0,streakGoal-categoryStreak)} aciertos consecutivos` : ""} para ganar la copa ${level.name} y ascender a ${next.name}`) : "En Leyenda LNA ganás una copa cada 10 partidos consecutivos de permanencia."}</p>
          <div className="lna-fan-tabs" role="tablist" aria-label="Categorías y pronósticos de Mi carrera">
            <button type="button" role="tab" aria-selected={activeView === "levels"} className={activeView === "levels" ? "active" : ""} onClick={() => setActiveView("levels")}>Categorías</button>
            <button type="button" role="tab" aria-selected={activeView === "predictions"} className={activeView === "predictions" ? "active" : ""} onClick={() => setActiveView("predictions")}>Pronósticos</button>
            <button type="button" role="tab" aria-selected={activeView === "mvp"} className={activeView === "mvp" ? "active" : ""} onClick={() => setActiveView("mvp")}>MVP</button>
            <button type="button" role="tab" aria-selected={activeView === "palmares"} className={activeView === "palmares" ? "active" : ""} onClick={() => setActiveView("palmares")}>Palmarés</button>
          </div>
          {activeView === "levels" && <div className="lna-fan-streak-panel">
            <Flame className="lna-fan-streak-flame" size={27} aria-hidden="true" /><strong>RACHA DE MI CATEGORÍA</strong>
            <span>{streaks.lossStreak > 0 ? `✕ ${streaks.lossStreak} ${streaks.lossStreak === 1 ? "error consecutivo" : "errores consecutivos"}` : categoryStreak > 0 ? `✓ ${categoryStreak} ${categoryStreak === 1 ? "acierto consecutivo" : "aciertos consecutivos"}` : "Sin racha activa"}</span>
            <small>{streaks.lossStreak > 0 && descentLimit ? `Te ${errorsLeft === 1 ? "falta 1 error consecutivo" : `faltan ${errorsLeft} errores consecutivos`} para descender.` : streakGoal ? `Te ${streakGoal-categoryStreak === 1 ? "falta 1 acierto consecutivo" : `faltan ${streakGoal-categoryStreak} aciertos consecutivos`} para ascender por racha.` : descentLimit ? `Descendés con ${descentLimit} errores consecutivos.` : "En esta categoría no hay descensos."}</small>
          </div>}
          {activeView === "palmares" ? <div className="lna-fan-palmares">
            <div className="lna-fan-section-title"><Crown size={17} aria-hidden="true" /><span>MI PALMARÉS</span></div>
            <div className="lna-fan-palmares-totals"><div><Trophy size={22}/><strong>{career?.cups ?? "—"}</strong><small>Copas ganadas</small></div><div><span aria-hidden="true">↓</span><strong>{career?.descents ?? "—"}</strong><small>Descensos</small></div></div>
            <h3><Trophy size={15} aria-hidden="true" /> VITRINA DE COPAS</h3>
            <div className="lna-fan-cup-grid">{LEVELS.map((item,i) => <div className={`lna-fan-cup ${(career?.cupCounts?.[i] || 0)>0 ? "earned" : ""}`} key={item.name}><img className="lna-fan-trophy-image" src={TROPHY_IMAGES[i]} alt={`Trofeo ${item.name}`} loading="lazy" /><strong>{item.name}</strong><small>{(career?.cupCounts?.[i] || 0)>0 ? `×${career.cupCounts[i]}` : "—"}</small></div>)}</div>
            <p className="lna-fan-palmares-hint">Cada ascenso suma la copa de la liga disputada. En Leyenda LNA ganás otra copa cada 10 partidos consecutivos de permanencia. Las copas nunca se pierden.</p>
          </div> : activeView === "mvp" ? <div className="lna-fan-mvp">
            <div className="lna-fan-streak-panel">
              <Flame className="lna-fan-streak-flame" size={27} aria-hidden="true" /><strong>RACHA MVP · TODAS LAS CATEGORÍAS</strong>
              <span>{streaks.winStreak > 0 ? `✓ ${streaks.winStreak} aciertos seguidos` : streaks.lossStreak > 0 ? `✕ ${streaks.lossStreak} ${streaks.lossStreak === 1 ? "error seguido" : "errores seguidos"}` : streaks.missedStreak > 0 ? `— ${streaks.missedStreak} ${streaks.missedStreak === 1 ? "partido sin votar" : "partidos sin votar"}` : "Sin racha activa"}</span>
              <small>{`Te faltan ${mvpLeft} ${mvpLeft === 1 ? "acierto consecutivo" : "aciertos consecutivos"} para ${mvps > 0 ? "otro MVP" : "conseguir el MVP"}.`}</small>
            </div>
            <span className="lna-fan-mvp-emblem"><img className="lna-fan-mvp-trophy-image" src="/trofeos/mvp.svg" alt="Trofeo MVP" loading="lazy" /></span>
            <strong>MVP DE PRONÓSTICOS</strong>
            <span className="lna-fan-mvp-count">{mvps}</span>
            <p>{mvps === 1 ? "Distintivo conseguido" : "Distintivos conseguidos"}</p>
            <small>Acertá <b>10 partidos consecutivos</b> para conseguir un MVP. No suma puntos y queda como recuerdo permanente. Si errás o no votás un partido, se corta la racha. Cada 10 aciertos consecutivos ganás otro MVP.</small>
          </div> : activeView === "levels" ? <div className="lna-fan-levels">
            {LEVELS.map((item, i) => <div key={item.name} className={`lna-fan-level ${i === index ? "is-current" : ""} ${i < index ? "is-earned" : ""}`}>
              <span>{i < index ? "✓" : i + 1}</span><strong>{item.name}<em className="lna-fan-record">Jugados: {Number.isFinite(career?.gamesPlayed?.[i]) ? `${career.gamesPlayed[i]} ${career.gamesPlayed[i] === 1 ? "partido" : "partidos"}` : "—"}</em></strong><small>{item.goal === null ? "10 partidos" : `${item.goal} PTS${i === 3 ? " / 4 aciertos consecutivos" : i === 4 ? " / 5 aciertos consecutivos" : ""}`}</small>{i > index && <LockKeyhole className="lna-fan-level-lock" size={13} aria-label="Categoría por alcanzar" /> }
            </div>)}

          </div> : <div className="lna-fan-history">
            <div className="lna-fan-section-title"><Target size={17} aria-hidden="true" /><span>MIS PRONÓSTICOS</span></div>
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
