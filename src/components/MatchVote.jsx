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

export default function MatchVote({ match, onStatusChange }) {
  const date = match?.date;
  const home = match?.homeTeam;
  const away = match?.awayTeam;
  const id = date && home && away ? `${date}-${home}-${away}` : null;
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const visitorId = getVisitorId();
    setData(null);
    setEditing(false);
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

  useEffect(() => { if (data && onStatusChange) onStatusChange({ voted: data.voted, open: data.open }); }, [data, onStatusChange]);

  if (!id || (!data && !error)) return null;
  if (!data) return null;
  if (!data.open && !data.voted) return null;

  async function vote(team) {
    if (busy || !data.open || (data.voted && !editing) || (data.voted && data.selected === team)) return;
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
      if (!res.ok || !body.ok) throw new Error(body.error || "No se pudo votar");
      setData(body);
      setEditing(false);
      window.dispatchEvent(new Event("lna-vote-updated"));
    } catch (err) { setError(err.message || "No se pudo registrar el voto. Reintentá."); }
    finally { setBusy(false); }
  }

  const teamInfo = teamId => teams.find(team => team.id === teamId);
  const total = (data.home?.votes || 0) + (data.away?.votes || 0);
  const percent = votes => total ? Math.round(votes * 100 / total) : 0;
  return (
    <section className="lna-vote" aria-label="Pronóstico de hinchas">
      <div className="lna-vote-title"><div className="lna-vote-title-group"><strong>¿QUIÉN GANA?</strong><span className="lna-vote-career-label">🏆 MI CARRERA</span></div><span>{data.voted ? `${total} ${total === 1 ? "voto" : "votos"}` : "Votá tu favorito"}</span></div>
      <div className="lna-vote-options">
        {[{ team: home, result: data.home }, { team: away, result: data.away }].map(({ team, result }) => (
          <button key={team} type="button" disabled={busy || !data.open || (data.voted && !editing) || (data.voted && data.selected === team)}
            className={`lna-vote-option ${data.selected === team ? "is-selected" : ""}`}
            onClick={() => vote(team)}>
            <span className="lna-vote-team">{teamInfo(team)?.logo && <img className="lna-vote-logo" src={teamInfo(team).logo} alt="" />}{teamInfo(team)?.shortName || team.replace(/-/g, " ")}</span>
            {data.voted && <strong>{percent(result?.votes || 0)}%</strong>}
            {data.voted && <span className="lna-vote-bar" style={{ width: `${percent(result?.votes || 0)}%` }} />}
          </button>
        ))}
      </div>
      {error && <small role="status">{error}</small>}
      {data.voted && <div className="lna-vote-change"><small>{data.open ? (editing ? "Elegí el nuevo ganador para confirmar el cambio." : "Podés cambiar tu pronóstico hasta que empiece el partido.") : "Votación cerrada"}</small>{data.open && <button type="button" disabled={busy} onClick={() => setEditing(value => !value)}>{editing ? "Cancelar" : "Cambiar pronóstico"}</button>}</div>}
    </section>
  );
}
