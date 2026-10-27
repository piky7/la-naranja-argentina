import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teams } from "../data/teams";
import { matches } from "../data/matches";
import { matchResults } from "../data/matchResults";
import { matchPlayerStats } from "../data/matchStats";
import "./TeamRankings.css";

const metrics = [
  { key: "points", label: "Puntos por partido", short: "PTS", unit: "PTS / PJ", average: true },
  { key: "pointsAgainst", label: "Puntos recibidos", short: "PTS REC", unit: "PTS REC / PJ", average: true, lowerBetter: true },
  { key: "rebounds", label: "Rebotes", short: "REB", unit: "REB / PJ", average: true, collective: true },
  { key: "assists", label: "Asistencias", short: "AST", unit: "AST / PJ", average: true, collective: true },
  { key: "winsHome", label: "Ganados de local", short: "G. LOC", unit: "VICTORIAS", fixedScope: true },
  { key: "winsAway", label: "Ganados de visitante", short: "G. VIS", unit: "VICTORIAS", fixedScope: true },
];

const gameKey = (game) => `${game.date}-${game.homeTeam}-${game.awayTeam}`;
const validNumber = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

function calculateRankings() {
  const records = new Map(teams.map((team) => [team.id, {
    team,
    overall: { games: 0, wins: 0, points: 0, pointsAgainst: 0, rebounds: 0, assists: 0, collectiveGames: 0 },
    home: { games: 0, wins: 0, points: 0, pointsAgainst: 0, rebounds: 0, assists: 0, collectiveGames: 0 },
    away: { games: 0, wins: 0, points: 0, pointsAgainst: 0, rebounds: 0, assists: 0, collectiveGames: 0 },
  }]));
  const seen = new Set();

  for (const match of matches) {
    const key = gameKey(match);
    if (seen.has(key)) continue;
    seen.add(key);
    const result = matchResults[key] ?? matchResults[match.id];
    if (result?.status !== "finished" || !validNumber(result.homeScore) || !validNumber(result.awayScore)) continue;
    // Solo temporada 2026/27.
    if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(match.date || "")) continue;
    const home = records.get(match.homeTeam);
    const away = records.get(match.awayTeam);
    if (!home || !away) continue;
    const homePoints = Number(result.homeScore);
    const awayPoints = Number(result.awayScore);
    const stats = matchPlayerStats[match.id] || matchPlayerStats[key];
    const isOfficial = stats?.source === "Liga Nacional" && stats?.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/");

    for (const [entry, side, scored, conceded, won, teamId] of [
      [home, "home", homePoints, awayPoints, homePoints > awayPoints, match.homeTeam],
      [away, "away", awayPoints, homePoints, awayPoints > homePoints, match.awayTeam],
    ]) {
      for (const bucket of [entry.overall, entry[side]]) {
        bucket.games += 1;
        bucket.wins += Number(won);
        bucket.points += scored;
        bucket.pointsAgainst += conceded;
        const collective = isOfficial ? stats.teamStats?.[teamId] : null;
        if (collective && validNumber(collective.rebounds) && validNumber(collective.assists)) {
          bucket.rebounds += Number(collective.rebounds);
          bucket.assists += Number(collective.assists);
          bucket.collectiveGames += 1;
        }
      }
    }
  }

  return [...records.values()];
}

const rankingData = calculateRankings();

function metricValue(record, key, scope) {
  const bucket = record[scope];
  if (key === "winsHome") return record.home.wins;
  if (key === "winsAway") return record.away.wins;
  if (key === "rebounds" || key === "assists") return bucket.collectiveGames ? bucket[key] / bucket.collectiveGames : null;
  return bucket.games ? bucket[key] / bucket.games : null;
}

const formatValue = (value, metric) => value == null ? "—" : metric.percent
  ? `${value.toFixed(1).replace(".", ",")}%`
  : metric.average ? value.toFixed(1).replace(".", ",") : String(value);

export default function TeamRankings() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("overall");
  const [metricKey, setMetricKey] = useState("points");
  const [direction, setDirection] = useState("best");
  const metric = metrics.find((item) => item.key === metricKey) || metrics[0];

  const sorted = useMemo(() => {
    return rankingData
      .map((record) => ({ ...record, value: metricValue(record, metricKey, scope) }))
      .sort((a, b) => {
        if (a.value == null && b.value == null) return a.team.name.localeCompare(b.team.name, "es");
        if (a.value == null) return 1;
        if (b.value == null) return -1;
        const ascending = metric.lowerBetter ? direction === "best" : direction !== "best";
        return (ascending ? a.value - b.value : b.value - a.value) || a.team.name.localeCompare(b.team.name, "es");
      });
  }, [scope, metricKey, direction, metric.lowerBetter]);

  // Los máximos de barras y planillas dependen del filtro, no del render.
  const maximum = useMemo(
    () => Math.max(1, ...sorted.map((row) => Math.max(0, row.value ?? 0))),
    [sorted]
  );
  const collectiveSampleByScope = useMemo(() => ({
    overall: Math.max(0, ...rankingData.map((record) => record.overall.collectiveGames)),
    home: Math.max(0, ...rankingData.map((record) => record.home.collectiveGames)),
    away: Math.max(0, ...rankingData.map((record) => record.away.collectiveGames)),
  }), []);
  const sample = collectiveSampleByScope[scope];
  const isCollective = Boolean(metric.collective);

  return (
    <div className="team-ranking">
      <div className="team-ranking-scopes" role="group" aria-label="Ámbito de los partidos">
        {[["overall", "General"], ["home", "Local"], ["away", "Visitante"]].map(([value, label]) => (
          <button type="button" key={value} className={scope === value ? "active" : ""} onClick={() => setScope(value)} aria-pressed={scope === value}>{label}</button>
        ))}
      </div>

      <div className="team-ranking-metrics" role="group" aria-label="Estadística a comparar">
        {metrics.map((item) => (
          <button type="button" key={item.key} className={metricKey === item.key ? "active" : ""} onClick={() => setMetricKey(item.key)} aria-pressed={metricKey === item.key}>
            {item.short}
          </button>
        ))}
      </div>

      <div className="team-ranking-tools">
        <div className="team-ranking-heading">
          <span className="team-ranking-eyebrow">RANKING DE EQUIPOS · 2026/27</span>
          <h2>{metric.label}</h2>
          <p>{metric.fixedScope ? "Victorias acumuladas en la condición indicada, independientemente del filtro General/Local/Visitante." : scope === "overall" ? "Todos los partidos" : scope === "home" ? "Solo partidos como local" : "Solo partidos como visitante"}</p>
        </div>
        <div className="team-ranking-controls">
          <label>
            <span>ORDENAR</span>
            <select value={direction} onChange={(event) => setDirection(event.target.value)}>
              <option value="best">Mejor a peor</option>
              <option value="worst">Peor a mejor</option>
            </select>
          </label>
        </div>
      </div>

      <div className="team-ranking-list" aria-label={`Ranking de ${metric.label}`}>
        <div className="team-ranking-listhead"><span>POS. · EQUIPO</span><span>{metric.unit}</span></div>
        {sorted.map((row, index) => {
          const games = metric.collective ? row[scope].collectiveGames : row[scope].games;
          return (
            <button className="team-ranking-row" type="button" key={row.team.id} onClick={() => navigate(`/equipos/${row.team.id}`)} aria-label={`Ver ${row.team.name}, posición ${index + 1}, ${formatValue(row.value, metric)}`}>
              <span className="team-ranking-position">{index + 1}.</span>
              <img src={row.team.logo} alt="" loading="lazy" className="team-ranking-logo" />
              <span className="team-ranking-name">{row.team.shortName || row.team.name}<small>{games ? `${games} PJ` : "Sin partidos con datos"}</small></span>
              <span className="team-ranking-track" aria-hidden="true"><span style={{ width: `${row.value == null ? 0 : Math.max(4, 100 * Math.max(0, row.value) / maximum)}%` }} /></span>
              <strong className="team-ranking-value">{formatValue(row.value, metric)}</strong>
              <span className="team-ranking-chevron" aria-hidden="true">›</span>
            </button>
          );
        })}
        {sorted.length === 0 && <p className="team-ranking-empty">No se encontraron equipos.</p>}
      </div>
      <p className="team-ranking-note">
        {isCollective
          ? "REB y AST: promedio calculado únicamente con partidos finalizados que cuentan con estadísticas colectivas oficiales completas. PJ indica cuántas planillas se utilizaron."
          : "PTS, REC, DIF, victorias y efectividad: calculados con resultados finales publicados de la temporada. PJ indica los partidos utilizados."}
        {isCollective && sample === 0 ? " Aún no hay planillas oficiales disponibles para este ámbito." : ""}
      </p>
    </div>
  );
}
