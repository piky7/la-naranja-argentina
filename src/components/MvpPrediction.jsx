import { useEffect, useMemo, useState } from "react";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { playerStats } from "../data/stats";
import "./MvpPrediction.css";

export default function MvpPrediction({ match, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("loading");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ranking, setRanking] = useState([]);
  const id = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const API = "https://lna-votaciones-api.lnab.workers.dev/api/mvp";
  const visitorId = (() => {
    try {
      let value = localStorage.getItem("lna-vote-visitor-id");
      if (!value) { value = crypto.randomUUID(); localStorage.setItem("lna-vote-visitor-id", value); }
      return value;
    } catch { return null; }
  })();
  useEffect(() => {
    if (!visitorId) { setStatus("error"); return; }
    let active = true;
    setStatus("loading");
    fetch(`${API}?partidoId=${encodeURIComponent(id)}&visitanteId=${encodeURIComponent(visitorId)}`, {cache:"no-store"})
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "No disponible"); return body; })
      .then(body => { if (active) { setSelected(body.selected); setOpen(body.open); setRanking(Array.isArray(body.ranking) ? body.ranking : []); setStatus("ready"); } })
      .catch(err => { if (active) { setStatus("error"); setError(err.message); } });
    return () => { active = false; };
  }, [id, visitorId]);
  async function choosePlayer(playerId) {
    if (busy || !open || !visitorId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(API, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({partidoId:id,visitanteId:visitorId,jugadorId:playerId})});
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "No se pudo guardar");
      setSelected(body.selected); setOpen(body.open); setRanking(Array.isArray(body.ranking) ? body.ranking : []); setExpanded(false);
      window.dispatchEvent(new Event("lna-vote-updated"));
    } catch(err) { setError(err.message || "No se pudo guardar"); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (status === "ready" && onStatusChange) onStatusChange({voted:!!selected,open}); }, [status,selected,open,onStatusChange]);
  const statsById = useMemo(() => new Map(playerStats.map(stat => [stat.playerId, stat])), []);
  const rosters = useMemo(() => [match.homeTeam, match.awayTeam].map(teamId => {
    const team = teams.find(item => item.id === teamId);
    const seen = new Set();
    const roster = players.filter(player => {
      if (player.teamId !== teamId) return false;
      const key = player.officialPlayerId ? `official:${player.officialPlayerId}` : player.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(player => ({ ...player, averageMinutes: statsById.get(player.id)?.minutes ?? null }))
      .sort((a,b) => (b.averageMinutes ?? -1) - (a.averageMinutes ?? -1) || a.name.localeCompare(b.name, "es"));
    return { teamId, team, roster };
  }), [match.homeTeam, match.awayTeam, statsById]);
  const allPlayers = rosters.flatMap(group => group.roster);
  const selectedPlayer = allPlayers.find(player => player.id === selected);
  const rankedPlayers = ranking.filter(item => Number(item.votes) > 0).map(item => ({...item,player:allPlayers.find(player => player.id === item.playerId)})).filter(item => item.player);
  const totalVotes = rankedPlayers.reduce((sum,item) => sum + Number(item.votes),0);
  return <section className="lna-mvp-prediction">
    <div className="lna-mvp-prediction-heading"><strong>★ ¿QUIÉN SERÁ EL MVP?</strong><span>+20 PTS</span></div>
    <button type="button" className="lna-mvp-prediction-trigger" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} disabled={status !== "ready" || !open}>
      <span>{selectedPlayer ? `${selectedPlayer.name} · ${teams.find(team => team.id === selectedPlayer.teamId)?.shortName || selectedPlayer.teamId}` : "Elegir jugador"}</span><span>{expanded ? "▴" : "▾"}</span>
    </button>
    {expanded && <div className="lna-mvp-prediction-picker">
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar jugador…" aria-label="Buscar jugador para MVP" />
      <div className="lna-mvp-prediction-list">
        {rosters.map(({teamId,team,roster}) => <div key={teamId}>
          <div className="lna-mvp-prediction-team">{team?.logo && <img src={team.logo} alt="" />}<strong>{team?.name || teamId}</strong></div>
          {roster.filter(player => player.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))).map(player => <button type="button" key={player.id} className={selected === player.id ? "is-selected" : ""} onClick={() => choosePlayer(player.id)} disabled={busy}>
            <span>{player.number != null ? `#${player.number} · ` : ""}{player.name}</span>
            <small>{Number.isFinite(player.averageMinutes) ? `${player.averageMinutes.toFixed(1)} min` : "Sin minutos"}</small>
          </button>)}
        </div>)}
      </div>
    </div>}
    {rankedPlayers.length > 0 && <div className="lna-mvp-vote-ranking" aria-label="Jugadores más votados para MVP">
      <div className="lna-mvp-vote-ranking-heading"><strong>MÁS VOTADOS PARA MVP</strong><span>{totalVotes} {totalVotes === 1 ? "voto" : "votos"}</span></div>
      {rankedPlayers.map(({playerId,player,votes}) => <div className="lna-mvp-vote-ranking-row" key={playerId}>
        <span className="lna-mvp-vote-ranking-name">{player.name}</span>
        <div className="lna-mvp-vote-ranking-track"><span style={{width:`${totalVotes ? Number(votes) / totalVotes * 100 : 0}%`}} /></div>
        <strong>{votes} {Number(votes) === 1 ? "voto" : "votos"}</strong>
      </div>)}
    </div>}
    <small className="lna-mvp-prediction-notice">{error || (status === "loading" ? "Consultando pronóstico…" : status === "error" ? "Votación no disponible" : !open ? "Votación cerrada" : selected ? "Pronóstico guardado. Podés cambiarlo hasta el inicio." : "Elegí tu MVP antes de que empiece el partido.")}</small>
  </section>;
}
