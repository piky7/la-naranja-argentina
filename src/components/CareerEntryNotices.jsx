import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Bell, Trophy } from "lucide-react";
import { matches } from "../data/matches";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { fetchCareerData, useCareerSession } from "../auth/careerAccount";
import { requestPrediction } from "../auth/prodeBallot";
import "./CareerEntryNotices.css";

const REWARD_SEEN_KEY = "lna-career-rewards-seen-v1";
const VOTE_NOTICE_SEEN_KEY = "lna-vote-entry-notice-seen-v1";
const TROPHY_IMAGES = ["/trofeos/desarrollo.svg", "/trofeos/federal.svg", "/trofeos/argentina.svg", "/trofeos/nacional.svg", "/trofeos/estrella.svg", "/trofeos/leyenda.svg"];

function argentinaToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function buildRewardGames(changes, previous) {
  return changes.map(p => {
    const oldPoints = Number(previous[p.partidoId] || 0);
    const earned = Number(p.earned || 0);
    const delta = earned - oldPoints;
    const mvpPoints = Number(p.mvpEarned) || 0;
    const winnerPoints = p.status === "correct" ? 15 : p.status === "incorrect" ? 5 : 0;
    const newMvpPoints = Math.min(mvpPoints, delta);
    const newWinnerPoints = Math.min(winnerPoints, Math.max(0, delta - newMvpPoints));
    const newBonusPoints = Math.max(0, delta - newMvpPoints - newWinnerPoints);
    const home = teams.find(t => t.id === p.homeTeam);
    const away = teams.find(t => t.id === p.awayTeam);
    const mvpPlayer = players.find(player => player.id === p.mvpSelected);
    return {
      id: p.partidoId,
      date: p.partidoId?.slice(5, 10)?.replace("-", "/") || "",
      home: home?.shortName || p.homeTeam || "Local",
      homeLogo: home?.logo || null,
      away: away?.shortName || p.awayTeam || "Visitante",
      awayLogo: away?.logo || null,
      score: Number.isFinite(p.homeScore) && Number.isFinite(p.awayScore) ? `${p.homeScore}–${p.awayScore}` : "Finalizado",
      winnerStatus: p.status,
      winnerPoints: newWinnerPoints,
      mvpStatus: p.mvpStatus,
      mvpName: mvpPlayer?.name || (p.mvpSelected ? "Jugador elegido" : ""),
      mvpPoints: newMvpPoints,
      bonus: newBonusPoints,
      delta,
    };
  });
}

export default function CareerEntryNotices() {
  const { user, loading } = useCareerSession();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (loading || !user) {
      setQueue([]);
      return;
    }
    let active = true;
    const loadEntryNotices = async () => {
      try {
        const [careerData, pointsData] = await Promise.all([
          fetchCareerData("predictions"),
          fetchCareerData("points").catch(() => null),
        ]);
        if (!active || !careerData?.ok || !Array.isArray(careerData.predictions)) return;
        const rewarded = careerData.predictions.filter(p => p.earned != null && Number(p.earned) > 0);
        let previous = {};
        try {
          const raw = localStorage.getItem(REWARD_SEEN_KEY);
          previous = raw ? JSON.parse(raw) || {} : {};
          if (!previous || typeof previous !== "object" || Array.isArray(previous)) previous = {};
        } catch { previous = {}; }
        const changes = rewarded.filter(p => Number(p.earned) > Number(previous[p.partidoId] || 0));
        const snapshot = Object.fromEntries(rewarded.map(p => [p.partidoId, Number(p.earned)]));
        try { localStorage.setItem(REWARD_SEEN_KEY, JSON.stringify(snapshot)); } catch { /* La notificación puede repetirse si el navegador bloquea el almacenamiento. */ }
        const next = [];
        if (changes.length) {
          const total = changes.reduce((sum, p) => sum + Number(p.earned) - Number(previous[p.partidoId] || 0), 0);
          next.push({
            type: "rewards",
            total,
            games: buildRewardGames(changes, previous),
            currentPoints: Number.isFinite(Number(pointsData?.points)) ? Number(pointsData.points) : null,
          });
        }

        const today = argentinaToday();
        let voteNoticeAlreadyShown = false;
        try { voteNoticeAlreadyShown = localStorage.getItem(`${VOTE_NOTICE_SEEN_KEY}:${user.uid}`) === "1"; } catch { /* Sin localStorage, se prioriza mostrar el aviso. */ }
        if (!voteNoticeAlreadyShown) {
          const gamesToday = matches.filter(match => match.date === today && match.status !== "finished" && match.status !== "postponed");
          const checks = await Promise.all(gamesToday.map(async match => {
            const gameId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
            const [winnerResult, mvpResult] = await Promise.allSettled([
              requestPrediction("winner", gameId),
              requestPrediction("mvp", gameId),
            ]);
            const winnerPending = winnerResult.status === "fulfilled" &&
              winnerResult.value.open && !winnerResult.value.voted;
            const mvpPending = mvpResult.status === "fulfilled" &&
              mvpResult.value.open && !mvpResult.value.voted;
            return winnerPending || mvpPending ? gameId : null;
          }));
          const pending = checks.filter(Boolean);
          if (active && pending.length) {
            try { localStorage.setItem(`${VOTE_NOTICE_SEEN_KEY}:${user.uid}`, "1"); } catch { /* El aviso queda limitado al estado actual de la app. */ }
            next.push({ type: "vote", date: today, pendingCount: pending.length });
          }
        }
        if (active) setQueue(next);
      } catch {
        // No mostrar avisos si no se pudo confirmar la información de la cuenta.
      }
    };
    loadEntryNotices();
    return () => { active = false; };
  }, [loading, user?.uid]);

  useEffect(() => {
    if (!user) return;
    const refreshVoteStatus = async () => {
      const today = argentinaToday();
      const gamesToday = matches.filter(match => match.date === today && match.status !== "finished" && match.status !== "postponed");
      const checks = await Promise.all(gamesToday.map(async match => {
        const gameId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
        const [winnerResult, mvpResult] = await Promise.allSettled([
          requestPrediction("winner", gameId),
          requestPrediction("mvp", gameId),
        ]);
        const winnerPending = winnerResult.status === "fulfilled" &&
          winnerResult.value.open && !winnerResult.value.voted;
        const mvpPending = mvpResult.status === "fulfilled" &&
          mvpResult.value.open && !mvpResult.value.voted;
        if (winnerResult.status === "rejected" && mvpResult.status === "rejected") return null;
        return winnerPending || mvpPending;
      }));
      if (checks.length && checks.every(pending => pending === false)) {
        setQueue(current => current.filter(item => item.type !== "vote"));
      }
    };
    window.addEventListener("lna-vote-updated", refreshVoteStatus);
    return () => window.removeEventListener("lna-vote-updated", refreshVoteStatus);
  }, [user?.uid]);

  if (!user || !queue.length) return null;
  const notice = queue[0];

  useEffect(() => {
    if (!user?.uid || notice?.type !== "vote" || !notice.date) return;
    try {
      localStorage.setItem(`${VOTE_NOTICE_SEEN_KEY}:${user.uid}:${notice.date}`, "1");
    } catch { /* Se mantiene el aviso en memoria si el navegador bloquea el almacenamiento. */ }
  }, [user?.uid, notice?.type, notice?.date]);

  const dismiss = () => setQueue(current => current.slice(1));

  return createPortal(
    <div className="lna-entry-notice-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) dismiss(); }}>
      {notice.type === "rewards" ? (
        <section className="lna-entry-notice lna-entry-notice-rewards" role="dialog" aria-modal="true" aria-labelledby="lna-entry-reward-title">
          <button type="button" className="lna-entry-notice-close" onClick={dismiss} aria-label="Cerrar felicitación"><X size={20}/></button>
          <span className="lna-entry-notice-kicker"><Trophy size={15}/> MI CARRERA · RECOMPENSAS</span>
          <h2 id="lna-entry-reward-title">¡FELICITACIONES!</h2>
          <strong className="lna-entry-notice-points">+{notice.total} PTS</strong>
          <div className="lna-entry-reward-games">{notice.games.map(game => (
            <div className="lna-entry-reward-game" key={game.id}>
              <div className="lna-entry-reward-match"><small>{game.date}</small><div className="lna-entry-reward-scoreline">
                <span>{game.homeLogo && <img src={game.homeLogo} alt=""/>}<strong>{game.home}</strong></span>
                <b>{game.score}</b>
                <span>{game.awayLogo && <img src={game.awayLogo} alt=""/>}<strong>{game.away}</strong></span>
              </div></div>
              <div className="lna-entry-reward-outcomes">
                <span><b>{game.winnerStatus === "correct" ? "✓" : "✕"} Ganador</b><strong>+{game.winnerPoints} pts</strong></span>
                {game.mvpStatus !== "none" && <span><b>{game.mvpStatus === "correct" ? "✓" : game.mvpStatus === "incorrect" ? "✕" : "·"} MVP</b><small>{game.mvpName}</small><strong>{game.mvpStatus === "pending" ? "Pendiente" : `+${game.mvpPoints} pts`}</strong></span>}
                {game.bonus > 0 && <span><b>★ Racha</b><strong>+{game.bonus} pts</strong></span>}
              </div>
            </div>
          ))}</div>
          {notice.currentPoints !== null && <div className="lna-entry-reward-total"><span>PUNTUACIÓN TOTAL</span><strong>{Math.max(0, notice.currentPoints - notice.total)} <i>→</i> <em>{notice.currentPoints} PTS</em></strong></div>}
          <button type="button" className="lna-entry-notice-action" onClick={dismiss}>Continuar</button>
        </section>
      ) : (
        <section className="lna-entry-notice lna-entry-notice-vote" role="dialog" aria-modal="true" aria-labelledby="lna-entry-vote-title">
          <button type="button" className="lna-entry-notice-close" onClick={dismiss} aria-label="Cerrar aviso"><X size={20}/></button>
          <span className="lna-entry-notice-kicker"><Bell size={15}/> MI CARRERA · PRONÓSTICOS</span>
          <h2 id="lna-entry-vote-title">¡HOY HAY QUE VOTAR!</h2>
          <p>Todavía no completaste tus pronósticos de hoy.</p>
          <strong className="lna-entry-vote-count">{notice.pendingCount} {notice.pendingCount === 1 ? "PARTIDO PENDIENTE" : "PARTIDOS PENDIENTES"}</strong>
          <button type="button" className="lna-entry-notice-action" onClick={dismiss}>Entendido</button>
        </section>
      )}
    </div>,
    document.body
  );
}
