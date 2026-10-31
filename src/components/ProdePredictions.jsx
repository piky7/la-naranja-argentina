import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Trophy } from "lucide-react";
import { teams } from "../data/teams";
import { watchProdeUser } from "../auth/prodeAuth";

const API = "https://lna-prode-api.lnab.workers.dev";
const teamName = id => teams.find(team => team.id === id)?.shortName || id;
const timeLabel = iso => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function ProdePredictions() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [votes, setVotes] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true, unsubscribe;
    watchProdeUser(next => { if (active) setUser(next); }).then(stop => { if (active) unsubscribe = stop; else stop(); }).catch(() => setReady(true));
    return () => { active = false; unsubscribe?.(); };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    let active = true;
    setReady(false); setError(""); setVotes([]);
    if (!user) { setReady(true); return () => { active = false; }; }
    (async () => {
      try {
        const token = await user.getIdToken();
        const [fixtureRes, votesRes] = await Promise.all([
          fetch("/voting-fixture.json", { cache: "no-store" }),
          fetch(API + "/api/prode/votes", { headers: { Authorization: "Bearer " + token } }),
        ]);
        if (!fixtureRes.ok || !votesRes.ok) throw Error("No se pudieron cargar los pronósticos");
        const [fixture, stored] = await Promise.all([fixtureRes.json(), votesRes.json()]);
        if (!stored.ok) throw Error(stored.error || "Error de pronósticos");
        if (active) { setGames(fixture.games || []); setVotes(stored.votes || []); }
      } catch (e) { if (active) setError(e.message || "Error de conexión"); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, [user]);

  const available = useMemo(() => games.filter(game => !game.finished && Date.parse(game.startsAt) > now).sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0,8), [games, now]);
  const voteMap = useMemo(() => new Map(votes.map(vote => [vote.match_id, vote.winner_team_id])), [votes]);

  const predict = async (game, teamId) => {
    if (!user || busy || voteMap.has(game.id) || Date.now() >= Date.parse(game.startsAt)) return;
    setBusy(game.id); setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/votes", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ matchId: game.id, winnerTeamId: teamId }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo guardar el pronóstico");
      setVotes(prev => [...prev, { match_id: game.id, winner_team_id: teamId }]);
    } catch (e) { setError(e.message || "Error de conexión"); }
    finally { setBusy(""); }
  };

  return <section className="prode-panel prode-predictions" aria-label="Pronósticos de prueba">
    <div className="prode-panel-heading"><span className="prode-panel-icon"><Trophy size={18}/></span><h2>Mis <em>pronósticos</em></h2><span className="prode-small-tag">Prueba</span></div>
    <p className="prode-predictions-note">Elegí al ganador antes del inicio. Un pronóstico por partido, válido para todas tus ligas. Por ahora no suma puntos y no modifica Mi Carrera.</p>
    {!user ? <p className="prode-muted-note">Iniciá sesión con Google para participar.</p> : !ready ? <p className="prode-muted-note">Cargando partidos…</p> : <>
      {error && <p role="alert" className="prode-group-error">{error}</p>}
      {available.length === 0 && <p className="prode-muted-note">No hay partidos futuros con horario confirmado.</p>}
      <div className="prode-predictions-list">{available.map(game => {
        const selected = voteMap.get(game.id);
        return <div key={game.id} className="prode-prediction-game">
          <div className="prode-prediction-time">{timeLabel(game.startsAt)} {selected && <span><CheckCircle2 size={13}/> Registrado</span>}</div>
          <div className="prode-prediction-options">
            {[game.homeTeam, game.awayTeam].map(teamId => <button key={teamId} type="button" className={selected === teamId ? "selected" : ""} disabled={Boolean(selected) || Boolean(busy)} onClick={() => predict(game, teamId)}>{teamName(teamId)}</button>)}
          </div>
        </div>;
      })}</div>
    </>}
  </section>;
}
