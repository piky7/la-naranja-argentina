import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Download, LockKeyhole, Medal, Play, RotateCcw, ShieldCheck, Sparkles, Trophy, X } from "lucide-react";
import { teams, teamMatchColors } from "../data/teams";
import { signInProdeWithGoogle, watchProdeUser } from "../auth/prodeAuth";
import { ACTIONS, ROUNDS, randomOpponentIds, createMatch, playAction } from "../games/caminoEngine";
import "./CaminoAlTitulo.css";

const ADMIN_ENDPOINT = "https://lna-prode-api.lnab.workers.dev/api/prode/admin/summary";
const CLOCKS = ["00:58", "00:31", "00:10"];
const MOMENTS = ["PRIMER ATAQUE", "DEFENSA DECISIVA", "ÚLTIMA POSESIÓN"];

function useAdminAccess() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true, stop;
    watchProdeUser(next => { if (alive) setUser(next); })
      .then(unsubscribe => { if (alive) stop = unsubscribe; else unsubscribe?.(); })
      .catch(() => { if (alive) { setStatus("error"); setError("No pudimos verificar tu sesión."); } });
    return () => { alive = false; stop?.(); };
  }, []);
  useEffect(() => {
    if (!user) {
      setStatus(previous => previous === "error" ? previous : "login");
      return;
    }
    let active = true;
    setStatus("checking");
    user.getIdToken().then(token => fetch(ADMIN_ENDPOINT, {
      headers: { Authorization: "Bearer " + token }, cache: "no-store",
    })).then(async response => {
      if (response.status === 403) throw new Error("Esta cuenta no tiene permisos de administrador.");
      if (!response.ok) throw new Error("No pudimos comprobar tus permisos.");
      const data = await response.json();
      if (!data.ok) throw new Error("No se pudo autorizar el acceso.");
      if (active) setStatus("allowed");
    }).catch(cause => { if (active) { setError(cause.message); setStatus("error"); } });
    return () => { active = false; };
  }, [user]);
  return { status, error };
}

function drawText(ctx, text, x, y, size, color, weight = 700, alignment = "center") {
  ctx.fillStyle = color;
  ctx.textAlign = alignment;
  ctx.font = weight + " " + size + "px Arial, sans-serif";
  ctx.fillText(String(text), x, y);
}

async function drawCrest(ctx, src, x, y, size) {
  if (!src) return;
  try {
    const img = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = src;
    });
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  } catch { /* Un escudo no debe impedir generar la placa. */ }
}

async function exportResult(team, result, won) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#091725");
  gradient.addColorStop(.56, "#112a42");
  gradient.addColorStop(1, "#07111d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = teamMatchColors[team.id] || "#ed8e23";
  ctx.globalAlpha = .22;
  ctx.beginPath();
  ctx.arc(540, 440, 340, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#e87c21";
  ctx.lineWidth = 7;
  ctx.strokeRect(35, 35, 1010, 1280);
  drawText(ctx, "LA NARANJA ARGENTINA", 540, 125, 34, "#ff9c3c", 900);
  drawText(ctx, "CAMINO AL TÍTULO", 540, 208, 65, "#ffffff", 900);
  drawText(ctx, "PLAYOFFS EXPRESS", 540, 260, 26, "#aabfd0", 800);
  await drawCrest(ctx, team.logo, 540, 455, 250);
  drawText(ctx, won ? "¡CAMPEÓN!" : "ELIMINADO", 540, 680, 98, won ? "#ffad40" : "#f5f7fa", 900);
  drawText(ctx, team.name.toUpperCase(), 540, 745, 39, "#ffffff", 800);
  drawText(ctx, won ? "TRES VICTORIAS. UNA COPA." : "TU CAMINO TERMINÓ EN " + ROUNDS[result.length - 1], 540, 806, won ? 32 : 24, "#aec2d2", 700);
  ctx.fillStyle = "#07121ecf";
  ctx.fillRect(96, 855, 888, 275);
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    const opponent = teams.find(t => t.id === item.opponentId);
    const row = 920 + i * 72;
    drawText(ctx, ["CUARTOS", "SEMIFINAL", "FINAL"][i], 126, row, 25, "#ff9c3c", 800, "left");
    drawText(ctx, (item.score + " - " + item.opponentScore), 700, row, 34, "#ffffff", 900);
    drawText(ctx, opponent?.shortName || "", 934, row, 21, "#b3c7d6", 700, "right");
  }
  drawText(ctx, "lanaranjaargentina.com.ar", 540, 1225, 36, "#ffffff", 800);
  drawText(ctx, "LNA GAMES  •  RESULTADO DE SIMULACIÓN", 540, 1275, 22, "#8daac0", 700);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const fileName = "lna-camino-al-titulo-" + team.id + ".png";
  // Compartir nativamente en iPhone cuando está disponible; descargar en el resto.
  if (navigator.canShare && navigator.share && navigator.canShare({ files: [new File([blob], fileName, { type: "image/png" })] })) {
    try {
      await navigator.share({ files: [new File([blob], fileName, { type: "image/png" })], title: "Camino al Título · LNA Games" });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 12000);
}

function MiniCourt({ action, round }) {
  return <div className="ct-court" aria-label="Cancha de básquet animada">
    <svg viewBox="0 0 440 205" role="img" aria-label="Representación de jugada en cancha">
      <rect width="440" height="205" rx="13" fill="#ad672f"/>
      <path d="M220 0V205 M0 100H440" stroke="#ffdfb1" strokeWidth="2" opacity=".65"/>
      <circle cx="220" cy="102" r="37" fill="none" stroke="#ffdfb1" strokeWidth="2" opacity=".7"/>
      <rect x="0" y="51" width="72" height="103" fill="none" stroke="#ffdfb1" strokeWidth="2"/>
      <rect x="368" y="51" width="72" height="103" fill="none" stroke="#ffdfb1" strokeWidth="2"/>
      <path d="M0 28A130 130 0 0 1 0 177 M440 28A130 130 0 0 0 440 177" fill="none" stroke="#ffdfb1" strokeWidth="2"/>
      <circle cx="48" cy="102" r="9" fill="none" stroke="#ffffff" strokeWidth="3"/>
      <circle cx="392" cy="102" r="9" fill="none" stroke="#ffffff" strokeWidth="3"/>
      <g className="ct-players">
        <circle cx="165" cy="102" r="14" fill="#f6a23c" stroke="#fff" strokeWidth="2"/>
        <circle cx="223" cy="62" r="13" fill="#f6a23c" stroke="#fff" strokeWidth="2"/>
        <circle cx="230" cy="151" r="13" fill="#f6a23c" stroke="#fff" strokeWidth="2"/>
        <circle cx="275" cy="109" r="14" fill="#163856" stroke="#d3edff" strokeWidth="2"/>
        <circle cx="330" cy="80" r="13" fill="#163856" stroke="#d3edff" strokeWidth="2"/>
        <circle cx="332" cy="149" r="13" fill="#163856" stroke="#d3edff" strokeWidth="2"/>
      </g>
      <g key={round + "-" + action} className="ct-ball">
        <circle cx="183" cy="102" r="8" fill="#ff8209" stroke="#111c2b" strokeWidth="2"/>
        <path d="M175 102h16m-8-8v16" stroke="#111c2b" strokeWidth="1.3"/>
      </g>
    </svg>
    <div className="ct-court-label">LNA · SIMULACIÓN DE JUGADA</div>
  </div>;
}

function Game({ access }) {
  const [teamId, setTeamId] = useState("");
  const [rivals, setRivals] = useState([]);
  const [round, setRound] = useState(0);
  const [match, setMatch] = useState(null);
  const [outcome, setOutcome] = useState(false);
  const [phase, setPhase] = useState("lobby");
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exportError, setExportError] = useState("");
  const team = useMemo(() => teams.find(t => t.id === teamId), [teamId]);
  const rival = useMemo(() => teams.find(t => t.id === match?.opponentId), [match]);
  const start = () => {
    if (!teamId) return;
    const ids = randomOpponentIds(teamId, teams.map(t => t.id));
    setRivals(ids); setRound(0); setResults([]);
    setMatch(createMatch(0, teamId, ids[0]));
    setOutcome(false); setPhase("playing"); setExportError("");
    window.scrollTo(0, 0);
  };
  const choose = id => {
    if (!match || outcome || match.done) return;
    setMatch(previous => playAction(previous, id));
    setOutcome(true);
  };
  const advance = () => {
    if (!match) return;
    if (!match.done) { setOutcome(false); return; }
    const next = [...results, { ...match }];
    setResults(next);
    setPhase(match.won ? (round === 2 ? "champion" : "advanced") : "eliminated");
    setOutcome(false);
  };
  const nextRound = () => {
    const index = round + 1;
    setRound(index); setMatch(createMatch(index, teamId, rivals[index]));
    setPhase("playing"); setOutcome(false);
    window.scrollTo(0, 0);
  };
  const reset = () => {
    setPhase("lobby"); setTeamId(""); setRivals([]); setResults([]);
    setMatch(null); setRound(0); setOutcome(false);
    window.scrollTo(0, 0);
  };
  const download = async () => {
    if (!team || saving) return;
    setSaving(true); setExportError("");
    try { await exportResult(team, results, phase === "champion"); }
    catch { setExportError("No pudimos generar la imagen. Probá nuevamente."); }
    finally { setSaving(false); }
  };
  return <main className="ct-root">
    <div className="ct-container">
      <div className="ct-eyebrow"><span>LNA GAMES</span><span className="ct-private"><LockKeyhole size={12}/> PRUEBA PRIVADA</span></div>
      <div className="ct-brand"><Trophy size={37}/><div><h1>CAMINO <em>AL TÍTULO</em></h1><p>3 PARTIDOS · 1 OPORTUNIDAD · 5 MINUTOS</p></div></div>
      {phase === "lobby" && <>
        <section className="ct-panel ct-intro">
          <div className="ct-kicker"><Sparkles size={15}/> PLAYOFFS EXPRESS</div>
          <h2>La gloria se decide ahora.</h2>
          <p>Elegí tu equipo, superá cuartos, semifinal y final. Si perdés, volvés a empezar. No hay revancha.</p>
          <div className="ct-steps"><span>01 CUARTOS</span><span>02 SEMIFINAL</span><span>03 FINAL</span></div>
        </section>
        <section className="ct-panel">
          <div className="ct-section-header"><div><small>PRIMER PASO</small><h2>Elegí tus colores</h2></div><span>18 EQUIPOS</span></div>
          <div className="ct-team-grid">
            {teams.map(t => <button key={t.id} type="button" className={"ct-team " + (teamId === t.id ? "ct-selected" : "")} style={{ "--ct-club": teamMatchColors[t.id] || "#ef902e" }} onClick={() => setTeamId(t.id)} aria-pressed={teamId === t.id}>
              <img src={t.logo} alt="" loading="lazy"/><span>{t.shortName}</span>{teamId === t.id && <Check size={15}/>}
            </button>)}
          </div>
          <button className="ct-primary ct-start" disabled={!teamId} onClick={start}><Play size={18} fill="currentColor"/> EMPEZAR PLAYOFFS <ArrowRight size={18}/></button>
        </section>
      </>}
      {phase === "playing" && match && <>
        <div className="ct-bracket">{ROUNDS.map((label, i) => <div key={label} className={"ct-bracket-item " + (i === round ? "ct-active" : i < round ? "ct-passed" : "")}><span>{i < round ? "✓" : "0" + (i + 1)}</span><small>{["CUARTOS", "SEMIFINAL", "FINAL"][i]}</small></div>)}</div>
        <section className="ct-panel ct-match" style={{ "--ct-club": teamMatchColors[team.id] || "#f28e22" }}>
          <div className="ct-match-top"><span>{ROUNDS[round]}</span><span>4.º CUARTO · {CLOCKS[Math.min(match.moment, 2)] && !match.done ? CLOCKS[Math.min(match.moment, 2)] : "00:00"}</span></div>
          <div className="ct-scoreboard">
            <div className="ct-side"><img src={team.logo} alt=""/><strong>{match.score}</strong><span>{team.shortName}</span></div>
            <div className="ct-center"><span>VS</span><strong>{match.done ? "FINAL" : CLOCKS[match.moment]}</strong></div>
            <div className="ct-side"><img src={rival.logo} alt=""/><strong>{match.opponentScore}</strong><span>{rival.shortName}</span></div>
          </div>
          <MiniCourt action={match.moment} round={round}/>
          <div className="ct-situation">
            <span>DECISIÓN {Math.min(match.moment + 1, 3)} DE 3</span>
            <h2>{match.done ? "¡FINAL DEL PARTIDO!" : MOMENTS[match.moment]}</h2>
            <p>{match.done ? (match.won ? "¡Lo lograste! Superaste a tu rival." : "El rival se quedó con la victoria.") : [
              "Tenés la pelota. Elegí cómo atacar el aro.",
              "Ahora defiende tu equipo. ¿Cómo frenás al rival?",
              "Última posesión. Elegí cómo cerrar el encuentro.",
            ][match.moment]}</p>
          </div>
          {!outcome && !match.done && <div className="ct-action-list">{ACTIONS[match.moment].map((option, i) => <button key={option.id} className="ct-action" onClick={() => choose(option.id)}><span className="ct-action-number">0{i + 1}</span><span><strong>{option.title}</strong><small>{option.detail}</small></span><ArrowRight size={19}/></button>)}</div>}
          {outcome && <div className={"ct-outcome " + (match.log[match.log.length - 1]?.success ? "ct-success" : "ct-miss")} role="status">
            <strong>{match.log[match.log.length - 1]?.success ? "¡BUENA JUGADA!" : "LA POSESIÓN CONTINÚA"}</strong>
            <p>{match.log[match.log.length - 1]?.message}</p>
            <button className="ct-primary" onClick={advance}>{match.done ? "VER RESULTADO" : "CONTINUAR PARTIDO"} <ArrowRight size={18}/></button>
          </div>}
        </section>
        <p className="ct-note">Simulación ficticia. Las estadísticas y el marcador no son resultados oficiales de la LNB.</p>
      </>}
      {phase === "advanced" && match && <section className="ct-panel ct-finish">
        <div className="ct-medal"><Medal size={62}/></div><small>{ROUNDS[round]} SUPERADOS</small>
        <h2>¡SEGUÍS EN CARRERA!</h2><p>Derrotaste a {rival.shortName} por {match.score} a {match.opponentScore}.</p>
        <div className="ct-next">PRÓXIMA RONDA <ArrowRight size={17}/> {ROUNDS[round + 1]}</div>
        <button className="ct-primary" onClick={nextRound}>JUGAR {ROUNDS[round + 1]} <ArrowRight size={18}/></button>
      </section>}
      {(phase === "champion" || phase === "eliminated") && <section className={"ct-panel ct-finish " + (phase === "champion" ? "ct-champion" : "")}>
        <div className="ct-medal">{phase === "champion" ? <Trophy size={68}/> : <X size={62}/>}</div>
        <small>{phase === "champion" ? "CAMPEONES · PLAYOFFS EXPRESS" : "ELIMINACIÓN DIRECTA"}</small>
        <h2>{phase === "champion" ? "¡SOS CAMPEÓN!" : "FIN DEL CAMINO"}</h2>
        <img className="ct-finish-crest" src={team.logo} alt={"Escudo de " + team.name}/>
        <p>{phase === "champion" ? "¡" + team.name + " conquistó el título! Tres partidos, tres victorias." : "Caíste en " + ROUNDS[round].toLowerCase() + " ante " + rival.shortName + ". Para volver a intentarlo tenés que empezar desde cuartos."}</p>
        <div className="ct-results">{results.map((item, i) => <div key={i}><span>{["CUARTOS", "SEMIFINAL", "FINAL"][i]}</span><strong>{item.score} – {item.opponentScore}</strong><small>{teams.find(t => t.id === item.opponentId)?.shortName}</small></div>)}</div>
        <button className="ct-primary" disabled={saving} onClick={download}><Download size={18}/>{saving ? "GENERANDO IMAGEN…" : "DESCARGAR MI RESULTADO"}</button>
        {exportError && <p className="ct-error">{exportError}</p>}
        <button className="ct-secondary" onClick={reset}><RotateCcw size={17}/> JUGAR DESDE CERO</button>
      </section>}
      <footer className="ct-footer"><ShieldCheck size={15}/> Vista de prueba privada · No se guarda tu partida ni se registran resultados.</footer>
    </div>
  </main>;
}

export default function CaminoAlTitulo() {
  const { status, error } = useAdminAccess();
  const [loginBusy, setLoginBusy] = useState(false);
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);
  if (status !== "allowed") return <main className="ct-root ct-auth"><div className="ct-gate">
    <LockKeyhole size={35}/><h1>CAMINO AL TÍTULO</h1><p>Versión privada de pruebas de La Naranja Argentina.</p>
    {status === "checking" && <p>Verificando acceso de administrador…</p>}
    {status === "login" && <button className="ct-primary" disabled={loginBusy} onClick={async () => {
      setLoginBusy(true);
      try { await signInProdeWithGoogle(); }
      catch { /* El estado de sesión determina el siguiente paso. */ }
      finally { setLoginBusy(false); }
    }}>{loginBusy ? "CONECTANDO…" : "INGRESAR CON GOOGLE"}</button>}
    {status === "error" && <p className="ct-error">{error}</p>}
    <a href="/">Volver a LNA <ArrowLeft size={15}/></a>
  </div></main>;
  return <Game/>;
}
