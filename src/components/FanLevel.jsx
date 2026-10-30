import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, X, ChevronRight, Flame, LockKeyhole, Target, Crown, Pencil, Check } from "lucide-react";
import "./FanLevel.css";
import { teams } from "../data/teams";
import { matches } from "../data/matches";

const API = "https://lna-votaciones-api.lnab.workers.dev/api/puntos";
const KEY = "lna-vote-visitor-id";
const INTRO_KEY = "lna-career-intro-seen-v1";
const PLAYER_NAME_KEY = "lna-career-player-name-v1";
const PLAYER_NUMBER_KEY = "lna-career-player-number-v1";
const CAREER_EVENTS_KEY = "lna-career-events-seen-v1";
const REWARD_SEEN_KEY = "lna-career-rewards-seen-v1";
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
  const [pendingToday, setPendingToday] = useState([]);
  const seenEventsRef = useRef(readSeenEvents());
  const [pendingEvents, setPendingEvents] = useState([]);
  const [eventNotice, setEventNotice] = useState(null);
  const [rewardNotice, setRewardNotice] = useState(null);
  const [unseenRewards, setUnseenRewards] = useState(false);
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
  const [careerHistoryExpanded, setCareerHistoryExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [introStep, setIntroStep] = useState(null);
  const finishIntro = () => { try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* Sin almacenamiento disponible. */ } setIntroStep(null); };
  const openCareer = async () => {
    refresh(); setActiveView("levels"); setOpen(true);
    try { if (localStorage.getItem(INTRO_KEY) !== "1") { setIntroStep(0); return; } } catch { setIntroStep(0); return; }
    const id = getVisitorId();
    if (!id) return;
    try {
      const response = await fetch(`https://lna-votaciones-api.lnab.workers.dev/api/mis-pronosticos?visitanteId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.predictions)) return;
      const rewarded = data.predictions.filter(p => p.earned != null && Number(p.earned) > 0);
      const snapshot = Object.fromEntries(rewarded.map(p => [p.partidoId, Number(p.earned)]));
      const previousRaw = localStorage.getItem(REWARD_SEEN_KEY);
      if (previousRaw === null) { localStorage.setItem(REWARD_SEEN_KEY, JSON.stringify(snapshot)); setUnseenRewards(false); return; }
      let previous = {};
      try { previous = JSON.parse(previousRaw) || {}; } catch { /* Reestablecer seguimiento. */ }
      const changes = rewarded.filter(p => Number(p.earned) > Number(previous[p.partidoId] || 0));
      localStorage.setItem(REWARD_SEEN_KEY, JSON.stringify(snapshot));
      setUnseenRewards(false);
      if (changes.length) {
        const total = changes.reduce((sum,p) => sum + Number(p.earned) - Number(previous[p.partidoId] || 0), 0);
        const reasons = changes.flatMap(p => {
          const previousPoints = Number(previous[p.partidoId] || 0);
          const mvpPoints = Number(p.mvpEarned) || 0;
          const winnerPoints = p.status === "correct" ? 15 : p.status === "incorrect" ? 5 : 0;
          const streakBonus = Math.max(0, Number(p.earned) - winnerPoints - mvpPoints);
          const items = [];
          // Si el ganador ya se acreditó antes, anunciar solo la recompensa nueva.
          if (previousPoints === 0 && winnerPoints > 0) items.push(`${p.status === "correct" ? "Ganador acertado" : "Pronóstico de ganador errado"} (+${winnerPoints} pts)`);
          if (previousPoints === 0 && streakBonus > 0) items.push(`Bonificación por racha (+${streakBonus} pts)`);
          if (mvpPoints > 0 && (previousPoints === 0 || Number(p.earned) - previousPoints === mvpPoints)) items.push(`MVP acertado (+${mvpPoints} pts)`);
          return items;
        });
        setRewardNotice({total,reasons:[...new Set(reasons)]});
      }
    } catch { /* No anunciar premios sin confirmación del servidor. */ }
  };
  const dismissEvent = (goToCareer = false) => {
    if (!eventNotice) return;
    const seen = [...new Set([...(seenEventsRef.current || []), careerEventId(eventNotice)])].slice(-250);
    seenEventsRef.current = seen;
    try { localStorage.setItem(CAREER_EVENTS_KEY, JSON.stringify(seen)); } catch { /* El evento puede volver a mostrarse si no hay almacenamiento. */ }
    setEventNotice(null);
    setPendingEvents(previous => previous.filter(item => careerEventId(item) !== careerEventId(eventNotice)));
    if (goToCareer) openCareer();
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

  // El resplandor solo indica recompensas aún no vistas; esta consulta nunca las marca como vistas.
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (document.hidden) return;
      try {
        const saved = localStorage.getItem(REWARD_SEEN_KEY);
        if (saved === null) return;
        const previous = JSON.parse(saved);
        if (!previous || typeof previous !== "object") return;
        const id = getVisitorId();
        if (!id) return;
        const response = await fetch(`https://lna-votaciones-api.lnab.workers.dev/api/mis-pronosticos?visitanteId=${encodeURIComponent(id)}`, {cache:"no-store"});
        if (!response.ok) return;
        const data = await response.json();
        if (mounted && data.ok && Array.isArray(data.predictions)) {
          setUnseenRewards(data.predictions.some(p => Number(p.earned) > Number(previous[p.partidoId] || 0)));
        }
      } catch { /* No alterar el indicador si no hay conexión. */ }
    };
    check();
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 120000);
    return () => { mounted = false; document.removeEventListener("visibilitychange", onVisible); window.clearInterval(timer); };
  }, []);

  // Consultar únicamente partidos de HOY (hora argentina). El Worker decide si la votación sigue abierta.
  useEffect(() => {
    let active = true;
    const checkTodayVotes = async () => {
      const id = getVisitorId();
      if (!id) return;
      const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(part => [part.type, part.value]));
      const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      const games = matches.filter(match => match.date === today && match.status !== "finished" && match.status !== "postponed");
      if (!games.length) { if (active) setPendingToday([]); return; }
      const checks = await Promise.all(games.map(async match => {
        const gameId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
        try {
          const response = await fetch(`https://lna-votaciones-api.lnab.workers.dev/api/votos?partidoId=${encodeURIComponent(gameId)}&visitanteId=${encodeURIComponent(id)}`, { cache: "no-store" });
          if (!response.ok) return null;
          const data = await response.json();
          return data.open && !data.voted ? gameId : null;
        } catch { return null; }
      }));
      if (active) setPendingToday(checks.filter(Boolean));
    };
    checkTodayVotes();
    const timer = window.setInterval(checkTodayVotes, 60000);
    const onVote = () => checkTodayVotes();
    const onVisible = () => { if (!document.hidden) checkTodayVotes(); };
    window.addEventListener("lna-vote-updated", onVote);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("lna-vote-updated", onVote); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

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
      setPredictions([...result.predictions].sort((a, b) => {
        const aTime = Date.parse(a.startsAt || "");
        const bTime = Date.parse(b.startsAt || "");
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
        return String(b.partidoId || "").localeCompare(String(a.partidoId || ""));
      }));
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
    if (!editingProfile && !eventNotice && pendingEvents.length && (introStep === null || !open)) setEventNotice(pendingEvents[0]);
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
      <button className={`lna-fan-bar${pendingToday.length ? " has-pending-vote" : ""}${unseenRewards ? " has-unseen-rewards" : ""}`} type="button" onClick={openCareer} aria-label={pendingToday.length ? "Ver mi carrera LNA. Tenés un pronóstico pendiente de hoy" : "Ver mi carrera LNA"}>
        <Trophy size={19} aria-hidden="true" />
        <span className="lna-fan-summary">
          <span className="lna-fan-line"><strong className="lna-fan-bar-category">{level.name === "Liga de Desarrollo" ? <>Liga de<br/>Desarrollo</> : level.name}</strong><b>{seasonPoints === null ? "—" : `${seasonScore}/${level.goal ?? "∞"}`}</b></span>
          <span className="lna-fan-track"><span style={{ width: `${percent}%` }} /></span>
          {pendingToday.length > 0 && <span className="lna-fan-vote-alert"><span className="lna-fan-vote-dot" />SIN VOTAR</span>}
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      {rewardNotice && open && introStep === null && createPortal(<div className="lna-fan-achievement-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setRewardNotice(null); }}>
        <section className="lna-fan-achievement is-promotion" role="dialog" aria-modal="true" aria-labelledby="lna-fan-reward-title">
          <div className="lna-fan-achievement-rays" aria-hidden="true" />
          <button type="button" className="lna-fan-achievement-close" onClick={() => setRewardNotice(null)} aria-label="Cerrar felicitación"><X size={20}/></button>
          <span className="lna-fan-achievement-kicker">MI CARRERA · RECOMPENSAS</span>
          <h2 id="lna-fan-reward-title">¡FELICITACIONES!</h2>
          <strong className="lna-fan-reward-points">+{rewardNotice.total} PTS</strong>
          <p>Sumaste puntos en tus pronósticos:</p>
          <div className="lna-fan-reward-reasons">{rewardNotice.reasons.map(reason => <span key={reason}>{reason}</span>)}</div>
          <button type="button" className="lna-fan-achievement-continue" onClick={() => setRewardNotice(null)}>Continuar mi carrera</button>
        </section>
      </div>, document.body)}
      {eventNotice && createPortal(<div className="lna-fan-achievement-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) dismissEvent(false); }}>
        <section className={`lna-fan-achievement ${eventNotice.type === "descent" ? "is-descent" : "is-promotion"}`} role="dialog" aria-modal="true" aria-labelledby="lna-fan-achievement-title">
          <div className="lna-fan-achievement-rays" aria-hidden="true" />
          <button type="button" className="lna-fan-achievement-close" onClick={() => dismissEvent(false)} aria-label="Cerrar notificación"><X size={20}/></button>
          <span className="lna-fan-achievement-kicker">{eventNotice.type === "descent" ? "CAMBIO DE CATEGORÍA" : "NUEVO LOGRO DESBLOQUEADO"}</span>
          <h2 id="lna-fan-achievement-title">{eventNotice.type === "descent" ? "DESCENDISTE" : eventNotice.type === "legend-cup" ? "¡OTRA COPA!" : "¡CAMPEÓN!"}</h2>
          {eventNotice.type === "descent" ? <div className="lna-fan-achievement-fall"><span aria-hidden="true">↓</span><strong>{eventNotice.category}</strong></div> : <img className="lna-fan-achievement-trophy" src={TROPHY_IMAGES[Math.max(0, LEVELS.findIndex(item => item.name === eventNotice.category))]} alt={`Copa ${eventNotice.category}`} />}
          <strong className="lna-fan-achievement-category">{eventNotice.category}</strong>
          <p>{eventNotice.type === "descent" ? "Una etapa difícil, pero tu carrera continúa. ¡Volvé más fuerte!" : eventNotice.type === "legend-cup" ? "¡Sumaste otra copa por tu permanencia en Leyenda LNA!" : `Ganaste la copa de ${eventNotice.category} y ascendiste a ${LEVELS[Math.min(LEVELS.length - 1, LEVELS.findIndex(item => item.name === eventNotice.category) + 1)]?.name}.`}</p>
          <button type="button" className="lna-fan-achievement-continue" onClick={() => dismissEvent(pendingEvents.length <= 1)}>{pendingEvents.length > 1 ? "Siguiente logro" : "Continuar mi carrera"}</button>
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
            <span>★ Acertar MVP del partido <b>+20 PTS</b></span>
            <span>3 aciertos consecutivos <b>+30 PTS en el tercero</b></span>
            <span>5 aciertos consecutivos <b>+45 PTS en el quinto</b></span>
            <span>MVP <b>1 distintivo cada 10 aciertos consecutivos</b></span>
            <small>El ganador se puntúa al confirmar el resultado; el MVP, cuando se publican las valoraciones oficiales. No votar no suma puntos y corta las rachas de ganador.</small>
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
          <p className="lna-fan-next"><span className="lna-fan-next-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="careerRise" x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse"><stop stopColor="#f03b9e"/><stop offset="1" stopColor="#ffb8e1"/></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="12" fill="#271b3c" stroke="#f67bc2" strokeWidth="1.5"/><path d="M13 32L31 14M21 14H34V27" stroke="url(#careerRise)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 32L31 14M21 14H34V27" stroke="#ffe1f2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></span>{next ? (`Próximo objetivo: ganar la copa ${level.name} y ascender a ${next.name}${streakGoal ? ` (también podés ascender por racha)` : ""}.`) : "En Leyenda LNA ganás una copa cada 10 partidos consecutivos de permanencia."}</p>
          {pendingToday.length > 0 && <div className="lna-fan-today-reminder" role="status"><span className="lna-fan-vote-dot" /><span>{pendingToday.length === 1 ? "Tenés 1 partido de hoy sin votar." : `Tenés ${pendingToday.length} partidos de hoy sin votar.`} Entrá a Inicio para hacer tu pronóstico.</span></div>}
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
            <div className="lna-fan-journey">
              <div className="lna-fan-journey-heading"><span>MI TRAYECTORIA</span>{(career?.moves?.length || 0) > 3 && <button type="button" onClick={() => setCareerHistoryExpanded(value => !value)}>{careerHistoryExpanded ? "Ver menos" : "Ver todo"}</button>}</div>
              {!career?.moves?.length ? <small className="lna-fan-journey-empty">Tus ascensos, descensos y copas aparecerán acá cuando se registren.</small> :
                <div className="lna-fan-journey-list">{[...career.moves].reverse().slice(0, careerHistoryExpanded ? undefined : 3).map((event, i) =>
                  <div className="lna-fan-journey-event" key={careerEventId(event) + ":" + i}>
                    <span className="lna-fan-journey-symbol">{event.type === "descent" ? "↓" : "★"}</span>
                    <span><strong>{event.type === "descent" ? "Descenso" : event.type === "legend-cup" ? "Copa de permanencia" : "Ascenso y copa"}</strong><small>{event.category || "Categoría no disponible"}</small></span>
                  </div>
                )}</div>}
            </div>
            <p className="lna-fan-palmares-hint">Las copas se conservan para siempre. Cada ascenso suma una; en Leyenda LNA, cada 10 partidos de permanencia.</p>
          </div> : activeView === "mvp" ? <div className="lna-fan-mvp">
            <div className="lna-fan-streak-panel">
              <Flame className="lna-fan-streak-flame" size={27} aria-hidden="true" /><strong>RACHA MVP · TODAS LAS CATEGORÍAS</strong>
              <span>{streaks.winStreak > 0 ? `✓ ${streaks.winStreak} aciertos seguidos` : streaks.lossStreak > 0 ? `✕ ${streaks.lossStreak} ${streaks.lossStreak === 1 ? "error seguido" : "errores seguidos"}` : streaks.missedStreak > 0 ? `— ${streaks.missedStreak} ${streaks.missedStreak === 1 ? "partido sin votar" : "partidos sin votar"}` : "Sin racha activa"}</span>
              <small>La racha MVP cuenta los aciertos de todas las categorías.</small>
            </div>
            <div className="lna-fan-mvp-progress" aria-label={`Progreso MVP: ${streaks.winStreak % 10} de 10 aciertos`}>
              <div className="lna-fan-mvp-progress-label"><strong>PROGRESO AL MVP</strong><b>{streaks.winStreak % 10} / 10</b></div>
              <div className="lna-fan-mvp-progress-track"><span style={{ width: `${(streaks.winStreak % 10) * 10}%` }} /></div>
            </div>
            <span className="lna-fan-mvp-emblem"><img className="lna-fan-mvp-trophy-image" src="/trofeos/mvp.svg" alt="Trofeo MVP" loading="lazy" /></span>
            <strong>MVP DE PRONÓSTICOS</strong>
            <span className="lna-fan-mvp-count">{mvps}</span>
            <p>{mvps === 1 ? "Distintivo conseguido" : "Distintivos conseguidos"}</p>
            <small>Cada <b>10 aciertos seguidos</b> ganás un MVP permanente, sin puntos extra. Si errás o no votás, la racha se reinicia.</small>
          </div> : activeView === "levels" ? <div className="lna-fan-levels">
            {LEVELS.map((item, i) => <div key={item.name} className={`lna-fan-level ${i === index ? "is-current" : ""} ${i < index ? "is-earned" : ""}`}>
              <span>{i < index ? "✓" : i + 1}</span><strong>{item.name}<em className="lna-fan-record">Jugados: {Number.isFinite(career?.gamesPlayed?.[i]) ? `${career.gamesPlayed[i]} ${career.gamesPlayed[i] === 1 ? "partido" : "partidos"}` : "—"}</em></strong><small>{item.goal === null ? "10 partidos" : `${item.goal} PTS${i === 3 ? " / 4 aciertos consecutivos" : i === 4 ? " / 5 aciertos consecutivos" : ""}`}</small>{i > index && <LockKeyhole className="lna-fan-level-lock" size={13} aria-label="Categoría por alcanzar" /> }
            </div>)}

          </div> : <div className="lna-fan-history">
            <div className="lna-fan-section-title"><Target size={17} aria-hidden="true" /><span>MIS PRONÓSTICOS</span></div>
            {historyLoading ? <p className="lna-fan-history-message">Cargando tus votaciones…</p> : historyError ? <div className="lna-fan-history-message">No se pudo cargar el historial. <button type="button" onClick={refreshHistory}>Reintentar</button></div> : predictions.length === 0 ? <p className="lna-fan-history-message">Todavía no tenés pronósticos registrados.</p> : <>
              <div className="lna-fan-stats lna-fan-stats-performance">
                <span><b className="correct">{predictions.filter(p => p.status === "correct").length}</b> Acertados</span>
                <span><b className="incorrect">{predictions.filter(p => p.status === "incorrect").length}</b> Errados</span>
                <span><b>{predictions.filter(p => p.status === "correct" || p.status === "incorrect").length}</b> Jugados</span>
                <span><b className="correct">{(() => {
                  const settled = predictions.filter(p => p.status === "correct" || p.status === "incorrect");
                  return settled.length ? `${Math.round(predictions.filter(p => p.status === "correct").length * 100 / settled.length)}%` : "—";
                })()}</b> Efectividad</span>
              </div>
              <div className="lna-fan-history-list">
                {predictions.filter(p => p.status === "correct" || p.status === "incorrect").slice(page * 15, page * 15 + 15).map(p => {
                  const home = teams.find(t => t.id === p.homeTeam);
                  const away = teams.find(t => t.id === p.awayTeam);
                  const mvpHit = p.mvpStatus === "correct";
                  const earned = Number(p.earned ?? 0);
                  return <div className={`lna-fan-prediction ${p.status}`} key={p.partidoId} title={`${home?.shortName || p.homeTeam} vs ${away?.shortName || p.awayTeam} · ${p.status === "correct" ? "Ganador acertado" : "Ganador errado"} · ${earned >= 0 ? "+" : ""}${earned} puntos${mvpHit ? " · MVP acertado (+20)" : ""}`}>
                    <span className="lna-fan-prediction-date">{p.partidoId.slice(5, 10).replace("-", "/")}</span>
                    <span className="lna-fan-prediction-status" aria-label={p.status === "correct" ? "Acertado" : "Errado"}>{p.status === "correct" ? "✓" : "✕"}</span>
                    <div className="lna-fan-prediction-match">
                      {home?.logo ? <img src={home.logo} alt={home?.shortName || "Local"} /> : <span>{home?.shortName || "LOC"}</span>}
                      <span className="lna-fan-versus">VS</span>
                      {away?.logo ? <img src={away.logo} alt={away?.shortName || "Visitante"} /> : <span>{away?.shortName || "VIS"}</span>}
                    </div>
                    <b className="lna-fan-final-score">{p.homeScore}-{p.awayScore}</b>
                    <strong className="lna-fan-earned">{earned >= 0 ? "+" : ""}{earned} PTS</strong>
                    {p.mvpStatus === "incorrect" && <span className="lna-fan-mvp-hit lna-fan-mvp-miss" title="Pronóstico de MVP errado: +0 puntos">MVP ✕</span>}
                    {mvpHit && <span className="lna-fan-mvp-hit" title="Acertaste el MVP: +20 puntos">★ MVP +20</span>}
                  </div>;
                })}
              </div>
              {predictions.filter(p => p.status === "correct" || p.status === "incorrect").length > 15 && <div className="lna-fan-pages"><button type="button" disabled={page === 0} onClick={() => setPage(v => v - 1)}>‹ Recientes</button><span>{page + 1} / {Math.ceil(predictions.filter(p => p.status === "correct" || p.status === "incorrect").length / 15)}</span><button type="button" disabled={(page + 1) * 15 >= predictions.filter(p => p.status === "correct" || p.status === "incorrect").length} onClick={() => setPage(v => v + 1)}>Anteriores ›</button></div>}
            </>}
          </div>}
          <p className="lna-fan-note">Los puntos están vinculados a este navegador. Si borrás sus datos o cambiás de dispositivo, podrías perder el acceso a tu progreso.</p>
        </section>
      </div>}
    </>
  );
}
