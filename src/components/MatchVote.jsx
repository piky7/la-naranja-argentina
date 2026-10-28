import { teams } from "../data/teams";
import { useEffect, useState } from "react";
import "./MatchVote.css";

const API = "https://lna-votaciones-api.lnab.workers.dev/api/votos";
const KEY = "lna-vote-visitor-id";

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

export default function MatchVote({ match }) {
  const date = match?.date;
  const home = match?.homeTeam;
  const away = match?.awayTeam;
  const id = date && home && away ? `${date}-${home}-${away}` : null;
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const visitorId = getVisitorId();
    setData(null);
    setError("");
    if (!visitorId) return;
    fetch(`${API}?partidoId=${encodeURIComponent(id)}&visitanteId=${encodeURIComponent(visitorId)}`, { signal: controller.signal })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "No disponible");
        setData(body);
      })
      .catch(err => { if (err.name !== "AbortError") setError("Votación no disponible"); });
    return () => controller.abort();
  }, [id]);

  if (!id || (!data && !error)) return null;
  if (!data) return null;
  if (!data.open && !data.voted) return null;

  async function vote(team) {
    if (busy || data.voted || !data.open) return;
    const visitorId = getVisitorId();
    if (!visitorId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partidoId: id, visitanteId: visitorId, equipoVotado: team }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "No se pudo votar");
      setData(body);
      window.dispatchEvent(new Event("lna-vote-updated"));
    } catch { setError("No se pudo registrar el voto. Reintentá."); }
    finally { setBusy(false); }
  }

  const teamInfo = teamId => teams.find(team => team.id === teamId);
  const total = (data.home?.votes || 0) + (data.away?.votes || 0);
  const percent = votes => total ? Math.round(votes * 100 / total) : 0;
  return (
    <section className="lna-vote" aria-label="Pronóstico de hinchas">
      <div className="lna-vote-title"><strong>¿QUIÉN GANA?</strong><span>{data.voted ? `${total} ${total === 1 ? "voto" : "votos"}` : "Votá tu favorito"}</span></div>
      <div className="lna-vote-options">
        {[{ team: home, result: data.home }, { team: away, result: data.away }].map(({ team, result }) => (
          <button key={team} type="button" disabled={busy || data.voted || !data.open}
            className={`lna-vote-option ${data.selected === team ? "is-selected" : ""}`}
            onClick={() => vote(team)}>
            <span className="lna-vote-team">{teamInfo(team)?.logo && <img className="lna-vote-logo" src={teamInfo(team).logo} alt="" />}{teamInfo(team)?.shortName || team.replace(/-/g, " ")}</span>
            {data.voted && <strong>{percent(result?.votes || 0)}%</strong>}
            {data.voted && <span className="lna-vote-bar" style={{ width: `${percent(result?.votes || 0)}%` }} />}
          </button>
        ))}
      </div>
      {false && <div className="lna-vote-rewards" aria-label="Tus puntos y nivel de hincha">
        <div className="lna-vote-rewards-heading"><strong>🏀 {level.name}</strong><span>{points} PTS</span></div>
        <div className="lna-vote-rewards-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso al próximo nivel"><span style={{ width: `${progress}%` }} /></div>
        <small>{nextLevel ? `${nextLevel.points - points} pts para ${nextLevel.name}` : "¡Alcanzaste el nivel máximo!"} · +10 pts por pronóstico</small>
      </div>}
      {error && <small role="status">{error}</small>}
      {data.voted && <small>{data.open ? "Tu voto quedó registrado" : "Votación cerrada"}</small>}
    </section>
  );
}
