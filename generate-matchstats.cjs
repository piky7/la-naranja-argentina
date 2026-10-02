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

  /*
    --------------------------------------------------
    IDENTIFICAR LOS TEAM ID REALES DE LNA
    --------------------------------------------------

    El normalizador guarda los jugadores con:

    player.teamId

    Ejemplo:

    san-martin
    instituto

    Mientras que Flashscore puede devolver:

    San Martín
    Instituto de Córdoba

    Por eso NO debemos comparar directamente
    player.teamId con match.awayTeam.
  */

  function getTeamIdForMatchTeam(
    matchTeam,
    players,
    expectedTeamPosition
  ) {
    /*
      1. Primero intentamos encontrar jugadores
         cuyo teamId coincida directamente.
    */

    const directPlayers =
      players.filter(
        (player) =>
          player.teamId === matchTeam
      );

    if (
      directPlayers.length > 0
    ) {
      return matchTeam;
    }

    /*
      2. Si no coincide directamente,
         buscamos los teamId disponibles.

         Esto permite detectar:

         "Instituto de Córdoba"
         →
         "instituto"
    */

    const teamCounts = {};

    players.forEach(
      (player) => {
        if (!player.teamId) {
          return;
        }

        teamCounts[player.teamId] =
          (teamCounts[player.teamId] || 0) + 1;
      }
    );

    const availableTeams =
      Object.entries(teamCounts)
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .map(
          ([teamId]) =>
            teamId
        );

    /*
      Si solamente hay un equipo disponible,
      lo usamos como respaldo.
    */

    if (
      availableTeams.length === 1
    ) {
      return availableTeams[0];
    }

    /*
      Si hay varios equipos, usamos
      la posición esperada.

      El primer teamId corresponde al local
      y el segundo al visitante.
    */

    if (
      expectedTeamPosition <
      availableTeams.length
    ) {
      return availableTeams[
        expectedTeamPosition
      ];
    }

    return null;
  }

  const homeTeamId =
    getTeamIdForMatchTeam(
      match.homeTeam,
      match.players,
      0
    );

  const awayTeamId =
    getTeamIdForMatchTeam(
      match.awayTeam,
      match.players,
      1
    );

  if (!homeTeamId) {
    throw new Error(
      `No se pudo identificar el teamId LNA del local: ${match.homeTeam}`
    );
  }

  if (!awayTeamId) {
    throw new Error(
      `No se pudo identificar el teamId LNA del visitante: ${match.awayTeam}`
    );
  }

  /*
    --------------------------------------------------
    FILTRAR JUGADORES
    --------------------------------------------------
  */

  const homePlayers =
    match.players.filter(
      (player) =>
        player.teamId === homeTeamId
    );

  const awayPlayers =
    match.players.filter(
      (player) =>
        player.teamId === awayTeamId
    );

  /*
    --------------------------------------------------
    FORMATEAR JUGADORES
    --------------------------------------------------
  */

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

  /*
    --------------------------------------------------
    MATCH ID
    --------------------------------------------------

    Usamos los IDs LNA reales.

    Ejemplo:

    san-martin-instituto
  */

  const matchId =
    `${homeTeamId}-${awayTeamId}`;

  const block = `  "${matchId}": {
    "${homeTeamId}": [
${formatPlayers(homePlayers)}
    ],

    "${awayTeamId}": [
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
    `Equipo local LNA: ${homeTeamId}`
  );

  console.log(
    `Equipo visitante LNA: ${awayTeamId}`
  );

  console.log("");

  console.log(
    `Jugadores ${homeTeamId}: ${homePlayers.length}`
  );

  console.log(
    `Jugadores ${awayTeamId}: ${awayPlayers.length}`
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