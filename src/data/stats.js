import { players } from "./players";

export const playerStats = players.map((player) => ({
  playerId: player.id,

  gamesPlayed: 0,
  points: 0,
  rebounds: 0,
  assists: 0,
}));