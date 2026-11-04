import { useEffect, useState } from "react";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { requestPrediction } from "../auth/prodeBallot";

export default function LiveMyVote({ match }) {
  const matchId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const [votes, setVotes] = useState({ loading: true, winner: null, mvp: null, winnerError: false, mvpError: false, missingCareer: false });

  useEffect(() => {
    const controller = new AbortController();
    setVotes({ loading: true, winner: null, mvp: null, winnerError: false, mvpError: false, missingCareer: false });
    const load = kind => requestPrediction(kind, matchId, null, controller.signal).then(body => body.selected || null);
    Promise.allSettled([load("winner"), load("mvp")]).then(([winner, mvp]) => {
      if (controller.signal.aborted) return;
      setVotes({
        loading: false,
        winner: winner.status === "fulfilled" ? winner.value : null,
        mvp: mvp.status === "fulfilled" ? mvp.value : null,
        winnerError: winner.status !== "fulfilled",
        mvpError: mvp.status !== "fulfilled",
        missingCareer: false,
      });
    });
    return () => controller.abort();
  }, [matchId]);

  const winnerTeam = teams.find(team => team.id === votes.winner);
  const mvpPlayer = players.find(player => player.id === votes.mvp);
  const mvpTeam = teams.find(team => team.id === mvpPlayer?.teamId);
  const winnerText = votes.loading ? "Consultando..." : votes.missingCareer ? "Sin carrera en este navegador" : votes.winnerError ? "No se pudo consultar" : winnerTeam?.name || (votes.winner ? "Equipo no disponible" : "No elegiste ganador");
  const mvpText = votes.loading ? "Consultando..." : votes.missingCareer ? "Sin carrera en este navegador" : votes.mvpError ? "No se pudo consultar" : mvpPlayer?.name || (votes.mvp ? "Jugador no disponible" : "No elegiste MVP");

  return <section className="live-my-vote-panel upcoming-tab-panel" role="tabpanel" aria-label="Mis pronósticos del partido en vivo">
    <div className="live-my-vote-heading"><strong>MIS PRONÓSTICOS</strong><span>EN VIVO · SOLO LECTURA</span></div>
    <div className="live-my-vote-grid" aria-busy={votes.loading}>
      <div className="live-my-vote-card">
        <small>🏀 GANADOR ELEGIDO</small>
        <div className="live-my-vote-choice">
          {winnerTeam?.logo && <img src={winnerTeam.logo} alt="" />}
          <strong>{winnerText}</strong>
        </div>
      </div>
      <div className="live-my-vote-card">
        <small>★ MVP ELEGIDO</small>
        <div className="live-my-vote-choice">
          {mvpTeam?.logo && <img src={mvpTeam.logo} alt="" />}
          <div><strong>{mvpText}</strong>{mvpPlayer && <span>{mvpTeam?.shortName || mvpTeam?.name || ""}</span>}</div>
        </div>
      </div>
    </div>
    <p className="live-my-vote-footnote">{votes.missingCareer
      ? "Si tenés Prode iniciado con Google, tus pronósticos se consultan desde la misma cuenta en todos los dispositivos."
      : "Estos son tus pronósticos guardados antes del partido. Durante el vivo no se pueden cambiar."}</p>
  </section>;
}
