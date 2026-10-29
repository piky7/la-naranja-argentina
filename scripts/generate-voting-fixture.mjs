// Genera un calendario autorizado para la futura API de votaciones.
// No se ejecuta en la web ni altera el flujo de resultados en vivo.
// Ejecutar desde la raíz: node scripts/generate-voting-fixture.mjs
import fs from "node:fs";
import { officialSchedule } from "../src/data/officialSchedule.js";
import { matchResults } from "../src/data/matchResults.js";
import { players } from "../src/data/players.js";

const games = officialSchedule
  .filter(({ date, time, homeTeam, awayTeam }) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? "") &&
    Boolean(homeTeam && awayTeam)
  )
  .map(({ date, time, homeTeam, awayTeam }) => {
    const resultKey = `${date}-${homeTeam}-${awayTeam}`;
    return {
      // ID estable; el índice de la lista visual no debe usarse para votar.
      id: resultKey,
      homeTeam,
      awayTeam,
      eligiblePlayers: players.filter(player => (player.teamId === homeTeam || player.teamId === awayTeam) && typeof player.id === "string").map(player => player.id),
      // Hora argentina. El Worker debe interpretar esta zona en el servidor.
      startsAt: `${date}T${time}:00-03:00`,
      finished: matchResults[resultKey]?.status === "finished",
      homeScore: Number.isFinite(Number(matchResults[resultKey]?.homeScore)) && matchResults[resultKey]?.homeScore != null ? Number(matchResults[resultKey].homeScore) : null,
      awayScore: Number.isFinite(Number(matchResults[resultKey]?.awayScore)) && matchResults[resultKey]?.awayScore != null ? Number(matchResults[resultKey].awayScore) : null,
    };
  });

const output = {
  season: "2026/27",
  generatedAt: new Date().toISOString(),
  games,
};
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/voting-fixture.json", JSON.stringify(output, null, 2) + "\n");
console.log(`Calendario de votaciones: ${games.length} partidos con horario confirmado`);
