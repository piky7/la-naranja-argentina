const fs = require("fs");

const inputFile = "flashscore-normalized.json";
const outputFile = "matchstats-generated.js";

function main() {
  console.log("========================================");
  console.log("GENERADOR DE MATCHSTATS");
  console.log("========================================");
  console.log("");

  if (!fs.existsSync(inputFile)) {
    throw new Error(
      `No existe ${inputFile}. Ejecutá primero normalizer-flashscore.cjs.`
    );
  }

  const match = JSON.parse(
    fs.readFileSync(inputFile, "utf8")
  );

  if (!match.homeTeam) {
    throw new Error("El partido no tiene homeTeam.");
  }

  if (!match.awayTeam) {
    throw new Error("El partido no tiene awayTeam.");
  }

  if (!Array.isArray(match.players)) {
    throw new Error("El partido no tiene jugadores.");
  }

  const matchId = match.matchId;

  const homePlayers =
    match.players.filter(
      (player) =>
        player.teamId === match.homeTeam
    );

  const awayPlayers =
    match.players.filter(
      (player) =>
        player.teamId === match.awayTeam
    );

  function formatPlayers(players) {
    return players
      .map((player) => {
        return `      {
        id: "${player.id}",
        name: "${player.name}",
        points: ${player.points},
        rebounds: ${player.rebounds},
        assists: ${player.assists},
        minutes: "${player.minutes}",
      }`;
      })
      .join(",\n");
  }

  const block = `  "${matchId}": {
    "${match.homeTeam}": [
${formatPlayers(homePlayers)}
    ],

    "${match.awayTeam}": [
${formatPlayers(awayPlayers)}
    ],
  },`;

  console.log(
    `Partido: ${match.homeTeam} - ${match.awayTeam}`
  );

  console.log(
    `Resultado: ${match.homeScore}-${match.awayScore}`
  );

  console.log("");

  console.log(
    `Jugadores ${match.homeTeam}: ${homePlayers.length}`
  );

  console.log(
    `Jugadores ${match.awayTeam}: ${awayPlayers.length}`
  );

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "BLOQUE GENERADO"
  );

  console.log(
    "========================================"
  );

  console.log("");

  console.log(block);

  console.log("");

  fs.writeFileSync(
    outputFile,
    block,
    "utf8"
  );

  console.log(
    `Archivo generado: ${outputFile}`
  );

  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);
}