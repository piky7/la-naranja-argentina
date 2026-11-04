import { useEffect, useId, useState } from "react";
import { isPlayerAppearance } from "../utils/playerAppearance";
import { createPortal } from "react-dom";
import { teams } from "../data/teams";
import { matches } from "../data/matches";
import { playerStats } from "../data/stats";
import { matchPlayerStats } from "../data/matchStats";
import { getOfficialValuation } from "../utils/getOfficialValuation";
import { playerMatchStatCorrections } from "../data/playerMatchStatCorrections";
import { radarPercent } from "../utils/seasonRadar";
import "./PlayerModalSeason.css";


export default function PlayerModal({
  player,
  team,
  stats,
  recentMatches = [],
  onClose,
  onTeamClick,
}) {
  const [activeTab, setActiveTab] = useState("match");
  const tabId = useId();
  const matchContext = player?.matchContext;
  const match = matchContext?.match;
  const matchStat = matchContext?.playerStats;
  const hasMatchTab = Boolean(match && matchStat && matchContext.teamId);
  // El id del fixture puede variar entre páginas; la clave por fecha y equipos es estable.
  const matchKey = match ? `${match.date}-${match.homeTeam}-${match.awayTeam}` : null;
  const manualStat = (playerMatchStatCorrections[matchKey] || playerMatchStatCorrections[match?.id])?.[player?.id] || {};
  // Las correcciones puntuales solo cubren datos ausentes, nunca sustituyen
  // un valor oficial publicado (incluido el cero).
  const gameMetric = key => matchStat?.[key] ?? manualStat[key] ?? null;
  const shotValues = value => {
    if (!value || typeof value !== "object") return null;
    // Las planillas oficiales preservan Aciertos/Totales/Porcentaje.
    // También aceptar el formato normalizado made/attempted/percentage.
    const made = value.made ?? value.Aciertos;
    const attempted = value.attempted ?? value.Totales;
    const percentage = value.percentage ?? value.Porcentaje;
    return { made, attempted, percentage };
  };
  useEffect(() => {
    setActiveTab("match");
  }, [player?.id, match?.id, match?.date]);

  if (!player) return null;

  // Priorizar el dorsal extraído del partido más reciente de la temporada.
  // Evitar mostrar un número desactualizado del roster cuando hay uno comprobado.
  const latestDorsal = matches
    .filter((match) => match.homeTeam === player.teamId || match.awayTeam === player.teamId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map((match) => {
      const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
      const record = matchPlayerStats[key] || matchPlayerStats[match.id];
      if (record?.source !== "Liga Nacional") return null;
      const entry = record[player.teamId]?.find((item) => item.id === player.id);
      const value = entry?.number;
      return value != null && /^\\d{1,3}$/.test(String(value).trim())
        ? String(value).trim()
        : null;
    })
    .find((value) => value !== null);
  const displayNumber = latestDorsal ?? player.number ?? "—";

  const average = (value) => value == null ? "—" : Number(value).toFixed(1);
  const saved = playerStats.find((entry) => entry.playerId === player.id);
  const seen = new Set();
  const games = matches.filter((match) => {
    if (match.status !== "finished" && (match.homeScore == null || match.awayScore == null)) return false;
    if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) return false;
    if (match.homeTeam !== player.teamId && match.awayTeam !== player.teamId) return false;
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    if (seen.has(key)) return false;
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    if (record?.source !== "Liga Nacional" || !record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) return false;
    if (!record[player.teamId]?.some((entry) => entry.id === player.id && isPlayerAppearance(entry))) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)).map((match) => {
    const key = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
    const record = matchPlayerStats[match.id] || matchPlayerStats[key];
    const entry = record[player.teamId].find((item) => item.id === player.id);
    const rivalId = match.homeTeam === player.teamId ? match.awayTeam : match.homeTeam;
    return {
      id: match.id || key, date: match.date,
      rival: teams.find((item) => item.id === rivalId),
      points: Number(entry.points) || 0,
      rebounds: Number(entry.rebounds) || 0,
      assists: Number(entry.assists) || 0,
      steals: entry.steals ?? null,
      turnovers: entry.turnovers ?? null,
      blocks: entry.blocks ?? null,
      fouls: entry.fouls ?? entry.personalFouls ?? null,
      offensiveRebounds: entry.offensiveRebounds ?? null,
      defensiveRebounds: entry.defensiveRebounds ?? null,
      twoPointers: entry.twoPointers ?? null,
      threePointers: entry.threePointers ?? null,
      freeThrows: entry.freeThrows ?? null,
      minutes: entry.minutes,
      valuation: getOfficialValuation(match, player.teamId, player.id),
    };
  });
  const mean = (field) => games.length
    ? average(games.reduce((sum, game) => sum + game[field], 0) / games.length)
    : "—";
  // Un promedio se calcula solo sobre partidos con el dato publicado.
  // Para tiro usamos el porcentaje ponderado: sumatoria de aciertos / intentos.
  const metricMean = field => {
    const available = games.map(game => game[field]).filter(v => v != null && Number.isFinite(Number(v)));
    return available.length ? average(available.reduce((sum,value) => sum + Number(value), 0) / available.length) : "—";
  };
  const shotSeason = field => {
    const available = games.map(game => shotValues(game[field]))
      .filter(v => v && Number.isFinite(Number(v.made)) && Number.isFinite(Number(v.attempted)) && v.made != null && v.attempted != null);
    if (!available.length) return null;
    const made = available.reduce((sum,v) => sum + Number(v.made),0);
    const attempted = available.reduce((sum,v) => sum + Number(v.attempted),0);
    const percentage = attempted > 0 ? Math.round(made / attempted * 1000) / 10 : 0;
    return {made,attempted,percentage, games:available.length};
  };
  const radarItems = [
    {key:"points",label:"PTS",value:mean("points")},
    {key:"rebounds",label:"REB",value:mean("rebounds")},
    {key:"assists",label:"AST",value:mean("assists")},
    {key:"steals",label:"ROB",value:metricMean("steals")},
  ].map(item => ({...item,percent:radarPercent(item.key,item.value==="—"?null:Number(item.value))}));
  const radarXY = (index,ratio) => {
    const positions = [[110,98],[177,158],[110,218],[43,158]];
    return [110+(positions[index][0]-110)*ratio,158+(positions[index][1]-158)*ratio];
  };
  const radarPoints = ratio => radarItems.map((_,i) => radarXY(i,ratio).join(",")).join(" ");
  const radarFill = radarItems.map((item,i) => radarXY(i,(item.percent??0)/100).join(",")).join(" ");
  const minuteValues = games.map(game => {
    const parts = typeof game.minutes === "string" ? game.minutes.match(/^(\d+):(\d{2})$/) : null;
    return parts && Number(parts[2]) < 60 ? Number(parts[1]) * 60 + Number(parts[2]) : null;
  }).filter(value => value !== null);
  const avgMinuteSeconds = minuteValues.length
    ? minuteValues.reduce((sum, value) => sum + value, 0) / minuteValues.length
    : null;
  const formattedMinutes = avgMinuteSeconds == null ? "—"
    : `${String(Math.floor(Math.round(avgMinuteSeconds) / 60)).padStart(2, "0")}:${String(Math.round(avgMinuteSeconds) % 60).padStart(2, "0")}`;
  const valued = games.filter((game) => typeof game.valuation === "number" && Number.isFinite(game.valuation));
  const valuation = valued.length
    ? average(valued.reduce((sum, game) => sum + game.valuation, 0) / valued.length)
    : "—";
  const latest = games.length ? games.slice(0, 2) : recentMatches.map((game) => ({
    ...game,
    rival: teams.find((item) => item.shortName === game.rival) || { shortName: game.rival },
  }));

  return createPortal(
    <div className="home-modal-overlay" onClick={onClose}>
      <div
        className="home-player-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="home-player-modal-header">
          {team?.logo && <img className="home-player-modal-watermark" src={team.logo} alt="" aria-hidden="true" />}
          {team?.logo && (
            <div className="home-player-modal-logo">
              <button
                type="button"
                className="home-player-modal-logo-button"
                onClick={() => onTeamClick?.(team.id)}
                aria-label={`Ir al equipo ${team.name}`}
              >
                <img src={team.logo} alt={`Escudo de ${team.name}`} />
              </button>
            </div>
          )}

          <div className="home-player-modal-info">
            <span>{player.position || "—"}</span>
            <h2>{player.name}</h2>
            <p>{team?.name || "Equipo no disponible"}</p>
            <small>{player.nationality || "—"}</small>
          </div>

          <button
            type="button"
            className="home-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {hasMatchTab && (
          <div className="lna-player-modal-tabs" role="tablist" aria-label="Estadísticas del jugador">
            <button type="button" role="tab" id={tabId + "-match-tab"}
              aria-controls={tabId + "-match-panel"} aria-selected={activeTab === "match"}
              onClick={() => setActiveTab("match")}>Este partido</button>
            <button type="button" role="tab" id={tabId + "-season-tab"}
              aria-controls={tabId + "-season-panel"} aria-selected={activeTab === "season"}
              onClick={() => setActiveTab("season")}>Promedios temporada</button>
          </div>
        )}
        {hasMatchTab && activeTab === "match" && (
          <section role="tabpanel" id={tabId + "-match-panel"} aria-labelledby={tabId + "-match-tab"}
            className="lna-player-match-panel">
            <div className="lna-player-match-context">
              <span>ESTADÍSTICAS DEL PARTIDO · {match.date?.split("-").reverse().join("/")}</span>
              <strong>{teams.find(t => t.id === match.homeTeam)?.shortName || "Local"}
                <em>{match.homeScore ?? "—"} - {match.awayScore ?? "—"}</em>
                {teams.find(t => t.id === match.awayTeam)?.shortName || "Visitante"}</strong>
            </div>
            <div className="lna-player-match-main">
              {[
                ["PTS", matchStat.points], ["REB", matchStat.rebounds],
                ["AST", matchStat.assists], ["VAL", matchContext.valuation],
                ["MIN", matchStat.minutes]
              ].map(([label, value]) => (
                <div key={label} className={label === "PTS" ? "is-primary" : ""}>
                  <strong>{value ?? "—"}</strong><span>{label}</span>
                </div>
              ))}
            </div>
            <span className="home-player-modal-label">PLANILLA COMPLETA</span>
            <div className="lna-player-match-extra">
              {[
                ["REB OF", gameMetric("offensiveRebounds")], ["REB DEF", gameMetric("defensiveRebounds")],
                ["ROB", gameMetric("steals")], ["TAP", gameMetric("blocks")],
                ["PÉRD", gameMetric("turnovers")], ["FALTAS", gameMetric("fouls") ?? gameMetric("personalFouls")],
                ["+/-", gameMetric("plusMinus")]
              ].map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>
              ))}
            </div>
            <div className="lna-player-match-shots">
              {[
                ["DOBLES", matchStat.twoPointers],
                ["TRIPLES", matchStat.threePointers],
                ["LIBRES", matchStat.freeThrows]
              ].map(([label, value]) => {
                const shots = shotValues(value);
                const made = shots?.made;
                const attempted = shots?.attempted;
                const pct = shots?.percentage;
                const rate = Number(pct);
                const validRate = pct != null && Number.isFinite(rate);
                return <div key={label}>
                  <span>{label}</span>
                  <strong>{made != null && attempted != null ? `${made}/${attempted}` : "—"}</strong>
                  <div className="lna-player-shot-track" aria-hidden="true">
                    <span style={{ width: validRate ? `${Math.max(0, Math.min(100, rate))}%` : "0%" }} />
                  </div>
                  <small>{validRate ? `${rate}%` : "Sin dato"}</small>
                </div>;
              })}
            </div>
            {[
              ["DOBLES", matchStat.twoPointers],
              ["TRIPLES", matchStat.threePointers],
              ["LIBRES", matchStat.freeThrows],
            ].some(([, value]) => !shotValues(value) || shotValues(value).made == null || shotValues(value).attempted == null) ||
            ["blocks", "fouls"].some(key => gameMetric(key) == null) ? (
              <p className="lna-player-match-note">— indica un dato no disponible.</p>
            ) : null}
          </section>
        )}
        {(!hasMatchTab || activeTab === "season") && (
          <div role={hasMatchTab ? "tabpanel" : undefined}
            id={hasMatchTab ? tabId + "-season-panel" : undefined}
            aria-labelledby={hasMatchTab ? tabId + "-season-tab" : undefined}>
        <div className="home-player-modal-details">
          <div>
            <span>POSICIÓN</span>
            <strong>{player.position || "—"}</strong>
          </div>
          <div>
            <span>NACIONALIDAD</span>
            <strong>{player.nationality || "—"}</strong>
          </div>
          <div>
            <span>NÚMERO</span>
            <strong>{displayNumber}</strong>
          </div>
        </div>

        <div className="home-player-modal-season">
          <span className="home-player-modal-label">
            ESTADÍSTICAS DE LA TEMPORADA
          </span>

          <div className="home-player-modal-stats">
            <div>
              <strong>{games.length}</strong>
              <span>PJ</span>
            </div>
            <div>
              <strong>{mean("points")}</strong>
              <span>PTS</span>
            </div>
            <div>
              <strong>{mean("rebounds")}</strong>
              <span>REB</span>
            </div>
            <div>
              <strong>{mean("assists")}</strong>
              <span>AST</span>
            </div>
            <div><strong>{valuation}</strong><span>VAL</span></div>
            <div><strong>{formattedMinutes}</strong><span>MIN</span></div>
          </div>
        </div>

        <section className="lna-player-radar-section" aria-label="Radar de puntos, rebotes, asistencias y robos">
          <div className="lna-player-radar-heading">
            <span className="home-player-modal-label">PERFIL ESTADÍSTICO</span>
            <small>PTS · REB · AST · ROB</small>
          </div>
          <svg className="lna-player-radar-graphic" viewBox="0 55 260 210" role="img"
            aria-label={`Radar: ${radarItems.map(item => item.label+" "+item.value).join(", ")}`}>
            {[.25,.5,.75,1].map(level => <polygon key={level} points={radarPoints(level)}
              fill="none" stroke="#446178" strokeWidth="1" />)}
            {radarItems.map((item,i) => {
              const [x,y] = radarXY(i,1);
              return <line key={item.key} x1="110" y1="158" x2={x} y2={y} stroke="#446178" strokeWidth="1" />;
            })}
            <polygon points={radarFill} fill="#f68b2c" fillOpacity=".23"
              stroke="#fa9233" strokeWidth="2.8" strokeLinejoin="round" />
            {radarItems.map((item,i)=>{
              const [x,y] = radarXY(i,(item.percent??0)/100);
              return item.percent!=null && <circle key={item.key} cx={x} cy={y} r="3.1" fill="#ffa447"/>;
            })}
            {radarItems.map((item,i)=>{
              // Las etiquetas incluyen el dato real; no se repiten cuatro tarjetas.
              const ty = i === 2 ? 248 : i === 0 ? 79 : 164;
              const tx = i === 1 ? 192 : i === 3 ? 5 : 110;
              return <text key={item.key} x={tx} y={ty}
                textAnchor={i===1?"start":i===3?"start":"middle"}
                fill="#e8f1f8" fontSize="13" fontWeight="800">{item.label} <tspan fill="#ff9b39">{item.value}</tspan></text>;
            })}
          </svg>
          <small className="lna-player-radar-note">Escala de referencia: 25 PTS · 12 REB · 8 AST · 3 ROB por partido.</small>
        </section>
        <section className="lna-player-season-expanded" aria-label="Estadísticas completas de la temporada">
          <span className="home-player-modal-label">PROMEDIOS POR PARTIDO</span>
          <div className="lna-player-match-extra lna-player-season-extra">
            {[
              ["REB OF", metricMean("offensiveRebounds")],
              ["REB DEF", metricMean("defensiveRebounds")],
              ["ROB", metricMean("steals")],
              ["TAP", metricMean("blocks")],
              ["PÉRD", metricMean("turnovers")],
              ["FALTAS", metricMean("fouls")]
            ].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
          <span className="home-player-modal-label lna-player-season-shots-title">EFECTIVIDAD DE TIRO</span>
          <div className="lna-player-shot-bars">
            {[
              ["DOBLES",shotSeason("twoPointers")],
              ["TRIPLES",shotSeason("threePointers")],
              ["LIBRES",shotSeason("freeThrows")]
            ].map(([label,shots]) => <div key={label} className="lna-player-shot-bar-row">
              <span className="lna-player-shot-bar-label">{label}</span>
              <div className="lna-player-shot-bar-track" role="img" aria-label={shots ? `${label}: ${shots.made} de ${shots.attempted}, ${shots.percentage.toFixed(1)} por ciento` : `${label}: sin dato`}>
                <span style={{width:shots?`${Math.min(100,Math.max(0,shots.percentage))}%`:"0%"}}/>
              </div>
              <strong>{shots?`${shots.percentage.toFixed(1)}%`:"—"}</strong>
              <small>{shots?`${shots.made}/${shots.attempted}`:"S/D"}</small>
            </div>)}
          </div>
          <p className="lna-player-match-note">Promedios por partido con dato oficial. Tiros: porcentaje de aciertos sobre intentos acumulados.</p>
        </section>

        {(!hasMatchTab) && <div className="home-player-modal-recent-section">
          <span className="home-player-modal-label">
            ÚLTIMOS 2 PARTIDOS
          </span>

          {latest.length > 0 ? (
            <div className="home-player-modal-recent-list">
              {latest.map((match) => (
                <div
                  className="home-player-modal-recent-match"
                  key={match.id}
                >
                  <div className="home-player-modal-recent-header">
                    <div className="home-player-modal-rival">
                      {match.rival?.logo && <img src={match.rival.logo} alt="" loading="lazy" />}
                      <strong>vs. {match.rival?.shortName || "Rival"}</strong>
                    </div>
                    <span className="home-player-modal-recent-meta">
                      {match.date.split("-").reverse().join("/")}
                      {match.minutes != null && match.minutes !== "" && <span className="home-player-modal-recent-minutes"> · {match.minutes} min</span>}
                    </span>
                  </div>

                  <div className="home-player-modal-recent-stats">
                    <div>
                      <strong>{match.points}</strong>
                      <span>PTS</span>
                    </div>
                    <div>
                      <strong>{match.rebounds}</strong>
                      <span>REB</span>
                    </div>
                    <div>
                      <strong>{match.assists}</strong>
                      <span>AST</span>
                    </div>
                    <div><strong>{match.valuation ?? "—"}</strong><span>VAL</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="home-player-modal-recent-empty">
              Todavía no hay estadísticas de partidos disponibles.
            </p>
          )}
        </div>}

          </div>
        )}

        <div className="home-player-modal-footer">
          <span>LIGA NACIONAL 2026/27</span>
          <strong>{team?.shortName || ""}</strong>
        </div>
      </div>
    </div>,
    document.body
  );
}
