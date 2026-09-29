import { players } from "./players";
import { matchPlayerStats } from "./matchStats";

/*
 * =========================================
 * EQUIVALENCIAS
 * =========================================
 *
 * Los IDs utilizados en los boxscores pueden
 * ser diferentes a los IDs de players.js.
 *
 * Acá relacionamos solamente los jugadores
 * cuya correspondencia conocemos con seguridad.
 */

const playerIdByMatchStatId = {
  "franchino-m": "martin-franchino",

  "chacon-m": "marcos-chacon",
  "toretta-e": "emiliano-toretta",
  "rivero-c": "carlos-rivero",
  "dato-m": "martiniano-dato",
  "inyaco-f": "felipe-inyaco",
  "carrasco-s": "sebastian-carrasco",
};


/*
 * =========================================
 * ESTADÍSTICAS BASE
 * =========================================
 */

const totalsByPlayer = {};


/*
 * =========================================
 * RECORRER TODOS LOS BOXSCORES
 * =========================================
 */

Object.values(matchPlayerStats).forEach(
  (match) => {
    Object.values(match).forEach(
      (teamPlayers) => {
        if (!Array.isArray(teamPlayers)) {
          return;
        }

        teamPlayers.forEach((player) => {
          const playerId =
            playerIdByMatchStatId[player.id];

          /*
           * Si todavía no conocemos la relación
           * con players.js, no lo incorporamos a
           * las estadísticas de los jugadores.
           */
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

          /*
           * Convertimos MM:SS a segundos para
           * poder calcular también el promedio
           * de minutos posteriormente.
           */
          if (player.minutes) {
            const [
              minutes,
              seconds,
            ] = player.minutes
              .split(":")
              .map(Number);

            totalsByPlayer[playerId].minutes +=
              (minutes * 60) + seconds;
          }
        });
      }
    );
  }
);


/*
 * =========================================
 * CONVERTIR A PROMEDIOS
 * =========================================
 */

export const playerStats = players.map(
  (player) => {
    const totals =
      totalsByPlayer[player.id];

    /*
     * Jugador que todavía no disputó partidos.
     */
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

    const gamesPlayed =
      totals.gamesPlayed;

    const averageMinutes =
      totals.minutes / gamesPlayed;

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
        averageMinutes,
    };
  }
);