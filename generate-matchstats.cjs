
const fs = require("fs");

const inputFile = "flashscore-normalized.json";
const outputFile = "matchstats-generated.js";

function normalizeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    points: normalizeNumber(player.points),
    rebounds: normalizeNumber(player.rebounds),
    assists: normalizeNumber(player.assists),
    minutes: player.minutes || "00:00",
  };
}

function main() {
  console.log("");
  console.log("========================================");
  console.log("GENERADOR AUTOMÁTICO DE MATCHSTATS");
  console.log("========================================");

  if (!fs.existsSync(inputFile)) {
    throw new Error(
      `No existe ${inputFile}`
    );
  }

  const match = JSON.parse(
    fs.readFileSync(inputFile, "utf8")
  );

  const homeTeamId = match.homeTeam;
  const awayTeamId = match.awayTeam;

  if (!homeTeamId || !awayTeamId) {
    throw new Error(
      "El partido no tiene identificadores de equipos."
    );
  }

  if (homeTeamId === awayTeamId) {
    throw new Error(
      "El equipo local y visitante no pueden ser iguales."
    );
  }

  if (!Array.isArray(match.players)) {
    throw new Error(
      "El partido no contiene jugadores."
    );
  }

  const homePlayers = match.players
    .filter(
      (player) =>
        player.teamId === homeTeamId
    )
    .map(formatPlayer);

  const awayPlayers = match.players
    .filter(
      (player) =>
        player.teamId === awayTeamId
    )
    .map(formatPlayer);

  if (homePlayers.length === 0) {
    throw new Error(
      `No se encontraron jugadores para ${homeTeamId}`
    );
  }

  if (awayPlayers.length === 0) {
    throw new Error(
      `No se encontraron jugadores para ${awayTeamId}`
    );
  }

  const matchId =
    `${homeTeamId}-${awayTeamId}`;

  const matchData = {
  [homeTeamId]: homePlayers,
  [awayTeamId]: awayPlayers,

  quarterScores: Array.isArray(match.quarterScores)
    ? match.quarterScores
    : [],
};

  const block =
    `  ${JSON.stringify(matchId)}: ` +
    `${JSON.stringify(matchData, null, 2)},`;

  fs.writeFileSync(
    outputFile,
    block,
    "utf8"
  );

  console.log("");
  console.log(`Partido: ${matchId}`);
  console.log(
    `Resultado: ${match.homeScore}-${match.awayScore}`
  );

  console.log(
    `Jugadores ${homeTeamId}: ${homePlayers.length}`
  );

  console.log(
    `Jugadores ${awayTeamId}: ${awayPlayers.length}`
  );

  console.log("");
  console.log(
    `Archivo generado: ${outputFile}`
  );

  console.log("");
  console.log("GENERACIÓN COMPLETADA");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("ERROR GENERANDO MATCHSTATS");
  console.error(error.message);
  process.exit(1);
}
