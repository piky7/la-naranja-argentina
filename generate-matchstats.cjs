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
  */

  function getTeamIdForMatchTeam(
    matchTeam,
    players,
    expectedTeamPosition
  ) {
    /*
      1. Coincidencia directa.
    */

    const directPlayers =
      players.filter(
        (player) =>
          player.teamId === matchTeam
      );

    if (directPlayers.length > 0) {
      return matchTeam;
    }

    /*
      2. Buscar todos los teamId disponibles.
    */

    const teamCounts = {};

    players.forEach((player) => {
      if (!player.teamId) {
        return;
      }

      teamCounts[player.teamId] =
        (teamCounts[player.teamId] || 0) + 1;
    });

    const availableTeams =
      Object.entries(teamCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([teamId]) => teamId);

    /*
      Si solamente hay un equipo disponible,
      no podemos identificar automáticamente
      al visitante por teamId.

      En ese caso devolvemos el único equipo
      solamente para el local.
    */

    if (availableTeams.length === 1) {
      if (expectedTeamPosition === 0) {
        return availableTeams[0];
      }

      return null;
    }

    /*
      Si hay dos o más equipos disponibles,
      usamos su posición.
    */

    if (
      expectedTeamPosition >= 0 &&
      expectedTeamPosition < availableTeams.length
    ) {
      return availableTeams[expectedTeamPosition];
    }

    return null;
  }

  let homeTeamId =
    getTeamIdForMatchTeam(
      match.homeTeam,
      match.players,
      0
    );

  let awayTeamId =
    getTeamIdForMatchTeam(
      match.awayTeam,
      match.players,
      1
    );

  /*
    --------------------------------------------------
    EVITAR DOS EQUIPOS IGUALES
    --------------------------------------------------
  */

  if (
    homeTeamId &&
    awayTeamId &&
    homeTeamId === awayTeamId
  ) {
    console.log("");
    console.log(
      "⚠️ Flashscore devolvió el mismo teamId para local y visitante."
    );

    console.log(
      `   TeamId recibido: ${homeTeamId}`
    );

    console.log(
      "   Se intentará reconstruir la división de jugadores."
    );

    /*
      Cuando todos los jugadores tienen el mismo
      teamId, no podemos confiar en player.teamId.

      Usamos la cantidad de jugadores y los
      separamos en dos grupos.

      Esto es un respaldo para casos como:

      Gimnasia vs La Unión
    */

    const uniqueTeamIds =
      [...new Set(
        match.players
          .map((player) => player.teamId)
          .filter(Boolean)
      )];

    if (uniqueTeamIds.length === 1) {
      /*
        No conocemos el ID visitante desde Flashscore.

        En este caso NO generamos un matchstats
        incorrecto.

        Es preferible detener el proceso antes que
        crear:

        gimnasia-gimnasia
      */

      throw new Error(
        `Flashscore asignó el mismo teamId (${homeTeamId}) a todos los jugadores de ${match.homeTeam} vs ${match.awayTeam}. No se puede identificar de forma segura al visitante.`
      );
    }
  }

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
    VERIFICACIÓN FINAL
    --------------------------------------------------
  */

  if (homeTeamId === awayTeamId) {
    throw new Error(
      `Error de seguridad: local y visitante tienen el mismo teamId (${homeTeamId}).`
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
    VERIFICAR QUE AMBOS EQUIPOS TENGAN JUGADORES
    --------------------------------------------------
  */

  if (homePlayers.length === 0) {
    throw new Error(
      `No se encontraron jugadores para el local ${homeTeamId}.`
    );
  }

  if (awayPlayers.length === 0) {
    throw new Error(
      `No se encontraron jugadores para el visitante ${awayTeamId}.`
    );
  }

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
    gimnasia-la-union
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
  console.error("");

  process.exit(1);
}