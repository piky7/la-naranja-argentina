const fs = require("fs");
const { execFileSync } = require("child_process");

const eventsFile = "lnb-events.json";

function runScript(script, args = []) {
  console.log("");
  console.log("========================================");
  console.log(`EJECUTANDO: ${script}`);
  console.log("========================================");
  console.log("");

  execFileSync(
    process.execPath,
    [script, ...args],
    {
      stdio: "inherit",
    }
  );
}

function loadFinishedMatches() {
  if (!fs.existsSync(eventsFile)) {
    throw new Error(
      `No existe ${eventsFile}. Ejecutá primero discover-mids.cjs.`
    );
  }

  const data = JSON.parse(
    fs.readFileSync(eventsFile, "utf8")
  );

  if (!Array.isArray(data.finished)) {
    throw new Error(
      "lnb-events.json no contiene la lista de partidos terminados."
    );
  }

  return data.finished;
}

function main() {
  console.log("");
  console.log("========================================");
  console.log("ACTUALIZACIÓN AUTOMÁTICA LNB");
  console.log("========================================");
  console.log("");

  // 1. Descubrir nuevamente los partidos
  runScript("discover-mids.cjs");

  // 2. Cargar partidos terminados
  const matches = loadFinishedMatches();

  console.log("");
  console.log("========================================");
  console.log("PARTIDOS TERMINADOS DETECTADOS");
  console.log("========================================");
  console.log("");

  if (matches.length === 0) {
    console.log("No hay partidos terminados para procesar.");
    console.log("");
    return;
  }

  matches.forEach((match, index) => {
    console.log(
      `${index + 1}. ${match.homeName} ${match.homeScore}-${match.awayScore} ${match.awayName}`
    );

    console.log(
      `   MID: ${match.eventId}`
    );

    console.log("");
  });

  // 3. Procesar cada partido
  for (const [index, match] of matches.entries()) {
    console.log("");
    console.log("########################################");
    console.log(
      `PARTIDO ${index + 1} DE ${matches.length}`
    );
    console.log("########################################");
    console.log("");

    console.log(
      `${match.homeName} ${match.homeScore}-${match.awayScore} ${match.awayName}`
    );

    console.log(
      `Event ID: ${match.eventId}`
    );

    console.log("");

    // ----------------------------------------
    // EXTRACTOR FLASHSCORE
    // ----------------------------------------

    runScript(
      "auto-flashscore.cjs",
      [match.eventId]
    );

    // ----------------------------------------
    // NORMALIZADOR
    // ----------------------------------------

    runScript(
      "normalizer-flashscore.cjs"
    );

    // ----------------------------------------
    // GENERADOR MATCHSTATS
    // ----------------------------------------

    runScript(
      "generate-matchstats.cjs"
    );

    // ----------------------------------------
    // ACTUALIZADOR MATCHSTATS
    // ----------------------------------------

    runScript(
      "update-matchstats.cjs"
    );

    console.log("");
    console.log("########################################");
    console.log(
      `PARTIDO ${match.homeName} - ${match.awayName} PROCESADO`
    );
    console.log("########################################");
    console.log("");
  }

  console.log("");
  console.log("========================================");
  console.log("ACTUALIZACIÓN AUTOMÁTICA COMPLETADA");
  console.log("========================================");
  console.log("");

  console.log(
    `Partidos terminados procesados: ${matches.length}`
  );

  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("========================================");
  console.error("ACTUALIZACIÓN INTERRUMPIDA");
  console.error("========================================");
  console.error("");

  console.error(
    error.message
  );

  console.error("");

  process.exit(1);
}