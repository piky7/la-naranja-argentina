import { players } from "./players";
import { matchPlayerStats } from "./matchStats";

const totalsByPlayer = {};

Object.values(matchPlayerStats).forEach((match) => {
  Object.values(match).forEach((teamPlayers) => {
    if (!Array.isArray(teamPlayers)) {
      return;
    }

    teamPlayers.forEach((player) => {
      const playerId = player.id;

      if (!playerId) {
        return;
      }

      if (!totalsByPlayer[playerId]) {
        totalsByPlayer[playerId] = {
          gamesPlayed: 0,
          points: 0,
          rebounds: 0,
          assists: 0,
          minutes: 0,
        };
      }

      totalsByPlayer[playerId].gamesPlayed += 1;

      totalsByPlayer[playerId].points +=
        Number(player.points) || 0;

      totalsByPlayer[playerId].rebounds +=
        Number(player.rebounds) || 0;

      totalsByPlayer[playerId].assists +=
        Number(player.assists) || 0;

      if (player.minutes) {
        const [minutes, seconds] =
          player.minutes.split(":").map(Number);

        totalsByPlayer[playerId].minutes +=
          (minutes * 60) + seconds;
      }
    });
  });
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
      totals.minutes / gamesPlayed,
  };
});