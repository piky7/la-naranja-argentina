import { isPlayerAppearance } from "../utils/playerAppearance";
import { players } from "./players";
import { matchPlayerStats } from "./matchStats";

const totalsByPlayer = {};

const seenOfficialMatches = new Set();

Object.entries(matchPlayerStats).forEach(([key, match]) => {
  if (!/^2026-(09|10|11|12)-|^2027-(0[1-6])-/.test(key)) return;
  if (match?.source !== "Liga Nacional" ||
      !match.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) return;
  if (seenOfficialMatches.has(match.officialUrl)) return;
  seenOfficialMatches.add(match.officialUrl);

  for (const teamId of [match.homeTeam, match.awayTeam]) {
    const entries = match[teamId];
    if (!Array.isArray(entries)) continue;
    for (const player of entries) {
      const playerId = player.id;
      if (!playerId || !isPlayerAppearance(player)) continue;
      const totals = totalsByPlayer[playerId] ||= {
        gamesPlayed: 0, points: 0, rebounds: 0, assists: 0, minutes: 0,
      };
      totals.gamesPlayed += 1;
      totals.points += Number(player.points) || 0;
      totals.rebounds += Number(player.rebounds) || 0;
      totals.assists += Number(player.assists) || 0;
      const parts = typeof player.minutes === "string"
        ? player.minutes.match(/^(\d+):(\d{2})$/) : null;
      if (parts && Number(parts[2]) < 60) {
        totals.minutes += Number(parts[1]) * 60 + Number(parts[2]);
      }
    }
  }
});

export const playerStats = players.map((player) => {
  const totals = totalsByPlayer[player.id];

  if (!totals || totals.gamesPlayed === 0) {
    return {
      playerId: player.id,
      gamesPlayed: 0,
      points: null,
      rebounds: null,
      assists: null,
      minutes: null,
    };
  }

  const gamesPlayed = totals.gamesPlayed;

  return {
    playerId: player.id,
    gamesPlayed,

    points:
      totals.points / gamesPlayed,

    rebounds:
      totals.rebounds / gamesPlayed,

    assists:
      totals.assists / gamesPlayed,

 minutes:
  totals.minutes / gamesPlayed / 60,
  };
});
