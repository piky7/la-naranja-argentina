import "./PopupDeferredOverrides.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useLiveMatch from "../hooks/useLiveMatch";
import LiveMatchInfo from "./LiveMatchInfo";
import LiveRosters from "./LiveRosters";
import LiveStartingFive from "./LiveStartingFive";
import LiveMyVote from "./LiveMyVote";
import CategoryBalance from "./CategoryBalance";
import MatchVote from "./MatchVote";
import MvpPrediction from "./MvpPrediction";
import { requestPrediction } from "../auth/prodeBallot";
import { getMatchColorStyle } from "../data/teams";
import "../pages/Home.css";
import "./UpcomingHeader.css";

function defaultFormatLiveRemaining(live) {
  const parts = typeof live?.lastActionTime === "string"
    ? live.lastActionTime.match(/^(\\d{2}):(\\d{2}):(\\d{2})$/)
    : null;
  if (parts) {
    const seconds = Number(parts[1])*3600 + Number(parts[2])*60 + Number(parts[3]);
    if (seconds >= 0 && seconds <= 600)
      return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  }
  const minutes = Number(live?.minutesRemaining);
  return live?.minutesRemaining == null || !Number.isFinite(minutes)
    ? null : `${String(Math.max(0,Math.min(10,minutes))).padStart(2,"0")}:00`;
}

/**
 * Popup único de próximos partidos para Home y Liga.
 * La interfaz se conserva de Home, incluyendo voto, MVP, jugadores y LIVE.
 * La página que lo abre solo aporta datos y callbacks.
 */
export default function UpcomingMatchModal({
  selectedUpcomingMatch, selectedMatch, setSelectedUpcomingMatch,
  selectedUpcomingHomeTeam, selectedUpcomingAwayTeam,
  getTeam, getTeamPosition, getTeamRecord, goToTeam,
  formatDate, formatLiveRemaining = defaultFormatLiveRemaining, matches,
  getTeamLastTwoMatches, getMatchStats,
  getOfficialPlayerLeaders, getHighlightedPlayers, getPlayerStats,
  upcomingLeaderCategories, UPCOMING_COLLECTIVE_BY_TEAM,
  UPCOMING_COLLECTIVE_STATS, UPCOMING_COLLECTIVE_RANKS,
  setSelectedMatch, setSelectedPlayer,
}) {
  const upcomingLive = useLiveMatch(selectedUpcomingMatch);
  const [upcomingTab, setUpcomingTab] = useState("comparativa");
  const [upcomingVoteStatus, setUpcomingVoteStatus] = useState(null);
  const [upcomingMvpStatus, setUpcomingMvpStatus] = useState(null);

  useEffect(() => {
    if (!selectedUpcomingMatch || upcomingLive) return;
    const id = `${selectedUpcomingMatch.date}-${selectedUpcomingMatch.homeTeam}-${selectedUpcomingMatch.awayTeam}`;
    let cancelled = false;
    const check = async () => {
      const [winnerResult, mvpResult] = await Promise.allSettled([
        requestPrediction("winner", id),
        requestPrediction("mvp", id),
      ]);
      if (!cancelled) {
        setUpcomingVoteStatus(winnerResult.status === "fulfilled" ? {
          voted: winnerResult.value.voted, open: winnerResult.value.open,
        } : { error: true });
        setUpcomingMvpStatus(mvpResult.status === "fulfilled" ? {
          voted: mvpResult.value.voted, open: mvpResult.value.open,
        } : { error: true });
      }
    };
    check();
    window.addEventListener("lna-vote-updated", check);
    window.addEventListener("career-auth-updated", check);
    return () => {
      cancelled = true;
      window.removeEventListener("lna-vote-updated", check);
      window.removeEventListener("career-auth-updated", check);
    };
  }, [selectedUpcomingMatch?.date, selectedUpcomingMatch?.homeTeam, selectedUpcomingMatch?.awayTeam, Boolean(upcomingLive)]);

  useEffect(() => {
    setUpcomingTab(upcomingLive ? "quintetos" : "comparativa");
    setUpcomingVoteStatus(null);
    setUpcomingMvpStatus(null);
  }, [selectedUpcomingMatch?.id, Boolean(upcomingLive)]);

  return createPortal(
    <>
      {/* POPUP PRÓXIMO PARTIDO */}

      {selectedUpcomingMatch && !selectedMatch && (
        <div
          className="match-modal-overlay"
          onClick={() =>
            setSelectedUpcomingMatch(null)
          }
        >
          <div
          className={`match-modal match-modal-upcoming${upcomingLive ? " match-modal-is-live" : ""}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="match-modal-close"
              type="button"
              onClick={() =>
                setSelectedUpcomingMatch(null)
              }
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="match-modal-header">
              <div className="upcoming-header-meta">
                <span className="match-modal-label">LIGA NACIONAL 2026/27</span>
                <strong className="match-modal-date">{formatDate(selectedUpcomingMatch.date)}</strong>
              </div>
              <div className="match-modal-teams">
                <div className="match-modal-team">
                  {selectedUpcomingHomeTeam && (
                    <button
                      type="button"
                      className="home-modal-team-logo-button"
                      onClick={() =>
                        goToTeam(
                          selectedUpcomingHomeTeam.id
                        )
                      }
                      aria-label={`Ir al equipo ${selectedUpcomingHomeTeam.name}`}
                    >
                      <img
                        src={
                          selectedUpcomingHomeTeam.logo
                        }
                        alt={`Escudo de ${selectedUpcomingHomeTeam.name}`}
                      />
                    </button>
                  )}

                  <strong>
                    {selectedUpcomingHomeTeam?.shortName ||
                      selectedUpcomingHomeTeam?.name}

                    {selectedUpcomingHomeTeam && (
                        <small>
                          {getTeamPosition(selectedUpcomingHomeTeam.id)}° •{" "}
                          {getTeamRecord(selectedUpcomingHomeTeam.id).wins}-{getTeamRecord(selectedUpcomingHomeTeam.id).losses}
                          {selectedUpcomingHomeTeam.coach && <span className="match-modal-coach"> · DT: {selectedUpcomingHomeTeam.coach}</span>}
                        </small>
                      )}
                  </strong>
                </div>

                <div className="match-modal-score">
                  <span className="match-modal-status">{upcomingLive ? <>EN VIVO · {upcomingLive.isHalftime ? "ENTRETIEMPO" : upcomingLive.quarter ? `${upcomingLive.quarter}° CUARTO` : "PARTIDO EN JUEGO"}{!upcomingLive.isHalftime && upcomingLive.quarter && formatLiveRemaining(upcomingLive) != null && <span className="match-modal-live-remaining">{formatLiveRemaining(upcomingLive)} RESTANTES</span>}</> : "PRÓXIMO PARTIDO"}</span>
                  <strong>
                    {upcomingLive && upcomingLive.homeScore != null && upcomingLive.awayScore != null && Number.isFinite(Number(upcomingLive.homeScore)) && Number.isFinite(Number(upcomingLive.awayScore)) ? (
                      <span className="lna-live-score-numbers">
                        <span className={Number(upcomingLive.homeScore) > Number(upcomingLive.awayScore) ? "is-leading" : "is-trailing"}>{upcomingLive.homeScore}</span>
                        <span className="lna-live-score-dash"> - </span>
                        <span className={Number(upcomingLive.awayScore) > Number(upcomingLive.homeScore) ? "is-leading" : "is-trailing"}>{upcomingLive.awayScore}</span>
                      </span>
                    ) : selectedUpcomingMatch.time || "VS"}
                  </strong>

                  {selectedUpcomingMatch.tv &&
                    selectedUpcomingMatch.tv.length >
                      0 && (
                      <span>
                        {selectedUpcomingMatch.tv.join(
                          " · "
                        )}
                      </span>
                    )}
                </div>

                <div className="match-modal-team">
                  {selectedUpcomingAwayTeam && (
                    <button
                      type="button"
                      className="home-modal-team-logo-button"
                      onClick={() =>
                        goToTeam(
                          selectedUpcomingAwayTeam.id
                        )
                      }
                      aria-label={`Ir al equipo ${selectedUpcomingAwayTeam.name}`}
                    >
                      <img
                        src={
                          selectedUpcomingAwayTeam.logo
                        }
                        alt={`Escudo de ${selectedUpcomingAwayTeam.name}`}
                      />
                    </button>
                  )}

                  <strong>
                    {selectedUpcomingAwayTeam?.shortName ||
                      selectedUpcomingAwayTeam?.name}

                    {selectedUpcomingAwayTeam && (
                        <small>
                          {getTeamPosition(selectedUpcomingAwayTeam.id)}° •{" "}
                          {getTeamRecord(selectedUpcomingAwayTeam.id).wins}-{getTeamRecord(selectedUpcomingAwayTeam.id).losses}
                          {selectedUpcomingAwayTeam.coach && <span className="match-modal-coach"> · DT: {selectedUpcomingAwayTeam.coach}</span>}
                        </small>
                      )}
                  </strong>
                </div>
              </div>
            </div>

            <LiveMatchInfo live={upcomingLive} homeName={selectedUpcomingHomeTeam?.shortName || selectedUpcomingHomeTeam?.name || selectedUpcomingMatch.homeTeam} awayName={selectedUpcomingAwayTeam?.shortName || selectedUpcomingAwayTeam?.name || selectedUpcomingMatch.awayTeam} />
            {upcomingLive && <>
              <div className="upcoming-tabs upcoming-live-tabs" role="tablist" aria-label="Información del partido en vivo">
                <button type="button" role="tab" aria-selected={upcomingTab === "quintetos"} className={upcomingTab === "quintetos" ? "is-active" : ""} onClick={() => setUpcomingTab("quintetos")}>🏀 Quintetos</button>
                <button type="button" role="tab" aria-selected={upcomingTab === "planteles"} className={upcomingTab === "planteles" ? "is-active" : ""} onClick={() => setUpcomingTab("planteles")}>♟ Planteles</button>
                <button type="button" role="tab" aria-selected={upcomingTab === "comparativa"} className={upcomingTab === "comparativa" ? "is-active" : ""} onClick={() => setUpcomingTab("comparativa")}>▥ Comparativa</button>
                <button type="button" role="tab" aria-selected={upcomingTab === "mi-voto"} className={upcomingTab === "mi-voto" ? "is-active live-my-vote-tab" : "live-my-vote-tab"} onClick={() => setUpcomingTab("mi-voto")}>◎ Mi voto</button>
              </div>
              {upcomingTab === "quintetos" && selectedUpcomingHomeTeam && selectedUpcomingAwayTeam &&
                <LiveStartingFive live={upcomingLive} homeTeam={selectedUpcomingHomeTeam} awayTeam={selectedUpcomingAwayTeam} onPlayerClick={setSelectedPlayer} />}
              {upcomingTab === "planteles" && selectedUpcomingHomeTeam && selectedUpcomingAwayTeam &&
                <LiveRosters homeTeam={selectedUpcomingHomeTeam} awayTeam={selectedUpcomingAwayTeam} matches={matches} onPlayerClick={setSelectedPlayer} />}
              {upcomingTab === "mi-voto" && <LiveMyVote match={selectedUpcomingMatch} />}
            </>}
            {!upcomingLive && <>
            <div className="upcoming-tabs upcoming-tabs-three" role="tablist" aria-label="Información del próximo partido">
              <button type="button" role="tab" aria-selected={upcomingTab === "comparativa"} className={upcomingTab === "comparativa" ? "is-active" : ""} onClick={() => setUpcomingTab("comparativa")}>▥ Comparativa</button>
              <button type="button" role="tab" aria-selected={upcomingTab === "jugadores"} className={upcomingTab === "jugadores" ? "is-active" : ""} onClick={() => setUpcomingTab("jugadores")}>♟ Jugadores</button>
              <button type="button" role="tab" aria-selected={upcomingTab === "carrera"} className={upcomingTab === "carrera" ? "is-active" : "is-vote-glowing"} onClick={() => setUpcomingTab("carrera")}><span className="upcoming-vote-tab-title">◎ Votación</span></button>
            </div>
            </>}
            {!upcomingLive && upcomingTab === "carrera" && <div className="upcoming-tab-panel upcoming-career-panel upcoming-voting-redesign" role="tabpanel">
              <div className="upcoming-voting-head">
                <div><strong>◎ TU VOTACIÓN</strong><small>Un mismo pronóstico para Prode y Mi Carrera</small></div>
                <span className="upcoming-voting-rewards">Ganador <b>+15</b> · Error <b>+5</b> · MVP <b>+20</b></span>
              </div>
              <div className="upcoming-voting-subhead"><span>PRODE LNA</span><span>MI CARRERA</span><small>Se guarda automáticamente al elegir.</small></div>


              <MatchVote match={selectedUpcomingMatch} onStatusChange={setUpcomingVoteStatus} />
              <MvpPrediction match={selectedUpcomingMatch} onStatusChange={setUpcomingMvpStatus} />
              <button type="button" className={`upcoming-career-status ${upcomingVoteStatus?.voted && upcomingMvpStatus?.voted ? "is-voted" : ""}`} onClick={() => setUpcomingTab("carrera")}>
              <span>{upcomingVoteStatus === null || upcomingMvpStatus === null ? "◷ CONSULTANDO…" : upcomingVoteStatus?.voted && upcomingMvpStatus?.voted ? "✓ VOTACIÓN COMPLETA" : upcomingVoteStatus?.voted || upcomingMvpStatus?.voted ? "◷ VOTACIÓN INCOMPLETA" : upcomingVoteStatus?.error && upcomingMvpStatus?.error ? "◷ NO DISPONIBLE" : upcomingVoteStatus?.open === false && upcomingMvpStatus?.open === false ? "◷ VOTACIÓN CERRADA" : "● SIN VOTAR"}</span>
              <small>{`Ganador: ${upcomingVoteStatus === null ? "consultando" : upcomingVoteStatus?.error ? "sin datos" : upcomingVoteStatus?.voted ? "✓ votado" : "pendiente"} · MVP: ${upcomingMvpStatus === null ? "consultando" : upcomingMvpStatus?.error ? "sin datos" : upcomingMvpStatus?.voted ? "✓ votado" : "pendiente"}`}</small>
              <span aria-hidden="true">›</span>
            </button>
            </div>}
            {(upcomingTab === "comparativa" || (!upcomingLive && upcomingTab === "jugadores")) && <section className="match-highlighted-section">
              {(upcomingTab === "comparativa") && (<div className="upcoming-tab-panel" role="tabpanel">
              {/* COMPARATIVA DE EQUIPOS */}

<div className="upcoming-team-comparison upcoming-official-comparison" style={getMatchColorStyle(selectedUpcomingMatch.homeTeam, selectedUpcomingMatch.awayTeam)}>
  <span className="upcoming-comparison-label">COMPARATIVA COLECTIVA · 2026/27</span>
  {(() => {
    const home = UPCOMING_COLLECTIVE_BY_TEAM[selectedUpcomingMatch.homeTeam];
    const away = UPCOMING_COLLECTIVE_BY_TEAM[selectedUpcomingMatch.awayTeam];
    return <>
      <CategoryBalance home={home} away={away} homeId={selectedUpcomingMatch.homeTeam} awayId={selectedUpcomingMatch.awayTeam} stats={UPCOMING_COLLECTIVE_STATS} />
      <p className="upcoming-collective-source">Partidos con datos: {home.games} / {away.games} · Naranja = mejor registro</p>
      {UPCOMING_COLLECTIVE_STATS.map(([label, key, lowerIsBetter], index) => {
        const hv = home.values[key], av = away.values[key];
        const both = Number.isFinite(hv) && Number.isFinite(av);
        const homeBetter = both && hv !== av && (lowerIsBetter ? hv < av : hv > av);
        const awayBetter = both && hv !== av && (lowerIsBetter ? av < hv : av > hv);
        const percentage = index >= 8;
        const fmt = value => Number.isFinite(value) ? `${value.toFixed(1)}${percentage ? "%" : ""}` : "—";
        const max = Math.max(hv || 0, av || 0, 1);
        const homeRank = UPCOMING_COLLECTIVE_RANKS[key]?.[selectedUpcomingMatch.homeTeam];
        const awayRank = UPCOMING_COLLECTIVE_RANKS[key]?.[selectedUpcomingMatch.awayTeam];
        return <div className="upcoming-comparison-row upcoming-comparison-stat upcoming-ranked-row" key={key}>
          <span className={`upcoming-rank-badge rank-${homeRank || "none"}`} aria-label={homeRank ? `Puesto ${homeRank}` : "Sin posición"}>{homeRank ? `#${homeRank}` : "—"}</span>
          <strong className={homeBetter ? "collective-better" : ""}>{fmt(hv)}</strong>
          <div className="upcoming-comparison-track" aria-hidden="true"><span className={homeBetter ? "collective-better-bar" : ""} style={{ width: `${(Math.max(0, hv || 0) / max) * 100}%` }} /></div>
          <span className="upcoming-ranked-label">{label === "Recibidos" ? "Pts recibidos" : label}</span>
          <div className="upcoming-comparison-track" aria-hidden="true"><span className={awayBetter ? "collective-better-bar" : ""} style={{ width: `${(Math.max(0, av || 0) / max) * 100}%` }} /></div>
          <strong className={awayBetter ? "collective-better" : ""}>{fmt(av)}</strong>
          <span className={`upcoming-rank-badge rank-${awayRank || "none"}`} aria-label={awayRank ? `Puesto ${awayRank}` : "Sin posición"}>{awayRank ? `#${awayRank}` : "—"}</span>
        </div>;
      })}
    </>;
  })()}
</div>
{!upcomingLive && (<div className="upcoming-last-matches">
  <h3>ÚLTIMOS 2 PARTIDOS</h3>

  <div className="upcoming-last-matches-grid">
    {[
      selectedUpcomingMatch.homeTeam,
      selectedUpcomingMatch.awayTeam,
    ].map((teamId) => (
      <div className="upcoming-last-team" key={teamId}>
        <strong>{getTeam(teamId)?.shortName}</strong>

        {getTeamLastTwoMatches(teamId).map((match) => {
          const hasStats = Boolean(getMatchStats(match));

          return (
            <button
              type="button"
              key={match.id}
              className="upcoming-last-result"
              disabled={!hasStats}
             onClick={() => {
  setSelectedMatch(match);
}}
              title={
                hasStats
                  ? "Ver estadísticas del partido"
                  : "Estadísticas no disponibles"
              }
            >
              <span>{formatDate(match.date)}</span>

             <div className="upcoming-last-score">
  <div className="upcoming-last-score-team">
    {match.home?.logo && (
      <img src={match.home.logo} alt="" />
    )}
    <span>{match.home?.shortName || match.homeTeam}</span>
  </div>

  <strong>
    {match.homeScore} - {match.awayScore}
  </strong>

  <div className="upcoming-last-score-team">
    {match.away?.logo && (
      <img src={match.away.logo} alt="" />
    )}
    <span>{match.away?.shortName || match.awayTeam}</span>
  </div>
</div>

              <span className={
                match.result === "G" ? "is-win" : "is-loss"
              }>
                {match.result}
              </span>
            </button>
          );
        })}

        {getTeamLastTwoMatches(teamId).length === 0 && (
          <p>Sin resultados recientes</p>
        )}
      </div>
    ))}
  </div>
</div>)}
              </div>)}
              {!upcomingLive && upcomingTab === "jugadores" && (
                <div className="upcoming-tab-panel upcoming-players-comparison" role="tabpanel">
                  <div className="match-highlighted-title">
                    <h3>JUGADORES DESTACADOS</h3>
                    <span className="upcoming-highlighted-subtitle">PROMEDIOS DE TEMPORADA 2026/27</span>
                  </div>
                  {upcomingLeaderCategories.map(category => {
                    const getLeaders = teamId => ["valuation", "steals"].includes(category.key)
                      ? getOfficialPlayerLeaders(teamId, category.key)
                      : getHighlightedPlayers(teamId, category.key);
                    const homeLeaders = getLeaders(selectedUpcomingMatch.homeTeam);
                    const awayLeaders = getLeaders(selectedUpcomingMatch.awayTeam);
                    const allValues = [...homeLeaders, ...awayLeaders].map(player => Number(player.stats[category.key]));
                    const max = Math.max(...allValues, 0);
                    const renderSide = (leaders, team, side) => (
                      <div className={`upcoming-player-side upcoming-player-side-${side}`}>
                        {leaders.length ? leaders.map(player => {
                          const value = Number(player.stats[category.key]);
                          const isLeader = max > 0 && Math.abs(value - max) < 0.00001;
                          return <button key={player.id} type="button" className="upcoming-player-entry"
                            onClick={() => setSelectedPlayer({
                              ...player,
                              team: getTeam(player.teamId),
                              stats: getPlayerStats(player.id),
                            })}>
                            {team?.logo && <img src={team.logo} alt="" className="upcoming-player-crest" />}
                            <div className="upcoming-player-info">
                              <span className="upcoming-player-name">{player.name}</span>
                              <div className="upcoming-player-meter"><span style={{ width: `${max > 0 ? Math.max(0, value / max * 100) : 0}%` }} /></div>
                            </div>
                            <strong className={isLeader ? "upcoming-player-best" : ""}>{value.toFixed(1)}</strong>
                            {isLeader && <span className="upcoming-player-leader" aria-label="Mejor promedio">★</span>}
                          </button>;
                        }) : <span className="upcoming-player-empty">Sin datos disponibles</span>}
                      </div>
                    );
                    return <div className="upcoming-player-category" key={category.key}>
                      <div className="upcoming-player-category-title">{category.title}</div>
                      <div className="upcoming-player-versus">
                        {renderSide(homeLeaders, selectedUpcomingHomeTeam, "home")}
                        <div className="upcoming-player-center-icon" aria-hidden="true">{category.icon}</div>
                        {renderSide(awayLeaders, selectedUpcomingAwayTeam, "away")}
                      </div>
                    </div>;
                  })}
                </div>
              )}
            </section>}

            <div className="match-modal-footer">
              <span>LNA</span>

              <strong>
                PROMEDIOS DE TEMPORADA
              </strong>
            </div>
          </div>
        </div>
      )}


    </>,
    document.body
  );
}
