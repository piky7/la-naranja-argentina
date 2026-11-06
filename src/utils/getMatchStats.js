import { matchPlayerStats } from "../data/matchStats.js";

/**
 * Única resolución de planillas para Home, Liga, Equipo y Estadísticas.
 * Prioridad histórica: ID exacto -> fecha/local/visitante -> clave legado.
 * Jamás usar claves ambiguas para partidos del calendario oficial.
 *
 * El mapa opcional permite probar la función sin descargar la planilla completa.
 */
export function getMatchStats(match, statsByMatch = matchPlayerStats) {
  if (!match) return null;

  const dateKey = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
  const directStats = statsByMatch[match.id] || statsByMatch[dateKey];
  if (directStats) return directStats;

  if (match.officialUrl) return null;

  const legacyKey = `${match.homeTeam}-${match.awayTeam}`;
  return statsByMatch[legacyKey] || null;
}
