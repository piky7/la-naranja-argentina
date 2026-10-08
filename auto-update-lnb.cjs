
const fs = require("fs");
const { execFileSync } = require("child_process");

const eventsFile = "lnb-events.json";

function runScript(script, args = []) {
  console.log("");
  console.log("========================================");
  console.log(`EJECUTANDO: ${script}`);
  console.log("========================================");

  execFileSync(process.execPath, [script, ...args], {
    stdio: "inherit",
  });
}

function loadFinishedMatches() {
  if (!fs.existsSync(eventsFile)) {
    throw new Error(`No existe ${eventsFile}`);
  }

  const data = JSON.parse(
    fs.readFileSync(eventsFile, "utf8")
  );

  if (!Array.isArray(data.finished)) {
    throw new Error(
      "lnb-events.json no contiene partidos terminados."
    );
  }

  const seen = new Set();

  return data.finished.filter((match) => {
    if (!match.eventId) return false;
    if (seen.has(match.eventId)) return false;

    seen.add(match.eventId);
    return true;
  });
}

function getMatchKey(match) {
  return `${match.homeTeam}-${match.awayTeam}`;
}

function validateGeneratedStats(match) {
  const file = "matchstats-generated.js";

  if (!fs.existsSync(file)) {
    throw new Error(
      "No se generó matchstats-generated.js"
    );
  }

  const content = fs.readFileSync(file, "utf8");
  const expectedKey = getMatchKey(match);

  if (!match.homeTeam || !match.awayTeam) {
    throw new Error(
      "El partido no tiene identificadores de equipos."
    );
  }

  if (
    !content.includes(
      `"${expectedKey}"`
    )
  ) {
    throw new Error(
      `Las estadísticas generadas no corresponden a ${expectedKey}`
    );
  }

  console.log(
    `Estadísticas verificadas: ${expectedKey}`
  );
}

function processMatch(match, index, total) {
  console.log("");
  console.log("########################################");
  console.log(`PARTIDO ${index + 1} DE ${total}`);
  console.log("########################################");

  console.log(
    `${match.homeName} ${match.homeScore}-${match.awayScore} ${match.awayName}`
  );

  console.log(`Event ID: ${match.eventId}`);

  // Eliminar archivos temporales del partido anterior.
  // Así evitamos incorporar datos antiguos si falla
  // alguna etapa de generación.
  for (const file of [
    "flashscore-raw.json",
    "flashscore-normalized.json",
    "matchstats-generated.js",
  ]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  runScript("auto-flashscore.cjs", [
    match.eventId,
  ]);

  runScript("normalizer-flashscore.cjs");

  runScript("generate-matchstats.cjs");

  validateGeneratedStats(match);

  runScript("update-matchstats.cjs");

  console.log("");
  console.log(
    `PARTIDO PROCESADO: ${getMatchKey(match)}`
  );
}

function main() {
  console.log("");
  console.log("========================================");
  console.log("ACTUALIZACIÓN AUTOMÁTICA LNB");
  console.log("========================================");

  // Actualización general de resultados y fixture.
  runScript("discover-mids.cjs");
  runScript("sync-fixture.cjs");
  runScript("update-match-results.cjs");
  runScript("update-broadcasts.cjs");

  const matches = loadFinishedMatches();

  console.log("");
  console.log(
    `Partidos terminados detectados: ${matches.length}`
  );

  const successful = [];
  const failed = [];

  for (const [index, match] of matches.entries()) {
    try {
      processMatch(match, index, matches.length);

      successful.push({
        eventId: match.eventId,
        key: getMatchKey(match),
      });
    } catch (error) {
      const failure = {
        eventId: match.eventId,
        key: getMatchKey(match),
        error: error.message,
      };

      failed.push(failure);

      console.error("");
      console.error(
        `ERROR PROCESANDO ${failure.key}`
      );
      console.error(error.message);
      console.error(
        "Se continúa con el siguiente partido."
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log("RESUMEN DE ACTUALIZACIÓN");
  console.log("========================================");

  console.log(
    `Partidos detectados: ${matches.length}`
  );

  console.log(
    `Procesados correctamente: ${successful.length}`
  );

  console.log(
    `Partidos con errores: ${failed.length}`
  );

  if (failed.length > 0) {
    console.log("");
    console.log("PARTIDOS PENDIENTES:");

    for (const item of failed) {
      console.log(
        `- ${item.key} (${item.eventId}): ${item.error}`
      );
    }

    // Mantener el error visible en GitHub Actions,
    // pero solo después de procesar los demás.
    process.exitCode = 1;
  }

  console.log("");
  console.log("ACTUALIZACIÓN FINALIZADA");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("ACTUALIZACIÓN GENERAL INTERRUMPIDA");
  console.error(error.message);

  process.exitCode = 1;
}
