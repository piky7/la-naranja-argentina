import { useCallback, useEffect, useState } from "react";
import { Trophy, X, ChevronRight } from "lucide-react";
import "./FanLevel.css";

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
          <Trophy className="lna-fan-trophy" size={32} aria-hidden="true" />
          <h2 id="lna-fan-title">MI NIVEL LNA</h2>
          <p className="lna-fan-total">{points === null ? "—" : score} <span>PTS</span></p>
          <strong className="lna-fan-current">Nivel {index + 1} · {level.name}</strong>
          <div className="lna-fan-track lna-fan-track-large"><span style={{ width: `${percent}%` }} /></div>
          <p className="lna-fan-next">{next ? `Te faltan ${next.points - score} puntos para ${next.name}` : "¡Alcanzaste el nivel máximo!"}</p>
          <p className="lna-fan-how">Sumás <strong>10 puntos</strong> por cada pronóstico válido. No necesitás crear una cuenta.</p>
          <div className="lna-fan-levels">
            {LEVELS.map((item, i) => <div key={item.name} className={`lna-fan-level ${i === index ? "is-current" : ""} ${i < index ? "is-earned" : ""}`}>
              <span>{i < index ? "✓" : i + 1}</span><strong>{item.name}</strong><small>{item.points} PTS</small>
            </div>)}
          </div>
          <p className="lna-fan-note">Los puntos están vinculados a este navegador. Si borrás sus datos o cambiás de dispositivo, podrías perder el acceso a tu progreso.</p>
        </section>
      </div>}
    </>
  );
}
