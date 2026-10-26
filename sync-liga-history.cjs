
const { isConfirmedFinal } = require("./scripts/official-final.cjs");
const { isCandidate } = require("./scripts/official-poll-window.cjs");

const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const INPUT = "liga-events.json";
const OUTPUT = "liga-history.json";
const TEMP = "liga-match-temp.json";

const ESPERA_MS = 1500;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function leerJSON(ruta) {
  return JSON.parse(fs.readFileSync(ruta, "utf8"));
}

function puntosEquipo(equipo) {
  if (!Array.isArray(equipo?.players)) {
    return NaN;
  }

  return equipo.players.reduce(
    (total, jugador) => total + jugador.points,
    0
  );
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`No existe ${INPUT}`);
  }

  const fixture = leerJSON(INPUT);
  const partidos = fixture.matches || [];
  const now = new Date();
  const recent = process.env.OFFICIAL_SYNC_MODE === "recent";

  const historial = fs.existsSync(OUTPUT)
    ? leerJSON(OUTPUT)
    : { source: "Liga Nacional", matches: [] };

  const urlsProcesadas = new Set(
    historial.matches.map((p) => p.officialUrl)
  );

  let agregados = 0;
  let omitidos = 0;

  console.log(`Partidos del fixture: ${partidos.length}`);

  for (const partido of partidos) {
    if (urlsProcesadas.has(partido.officialUrl)) {
      console.log(
        `Ya procesado: ${partido.home.name} - ${partido.away.name}`
      );
      omitidos++;
      continue;
    }

    if (!isCandidate(partido, now, recent)) {
      console.log(
        `Fuera de la ventana de consulta: ${partido.date}`
      );
      omitidos++;
      continue;
    }

    console.log(
      `Procesando: ${partido.home.name} vs ${partido.away.name}`
    );

    // Eliminamos cualquier archivo temporal anterior.
    if (fs.existsSync(TEMP)) {
      fs.unlinkSync(TEMP);
    }

    const ejecucion = spawnSync(
      process.execPath,
      [
        "extractor-liga.cjs",
        partido.officialUrl,
        TEMP,
      ],
      {
        encoding: "utf8",
        timeout: 30000,
      }
    );

    if (ejecucion.error || ejecucion.status !== 0) {
      console.error(
        `Error de extracción: ${
          ejecucion.error?.message ||
          ejecucion.stderr ||
          ejecucion.stdout ||
          "Error desconocido"
        }`
      );
      omitidos++;
      continue;
    }

    if (!fs.existsSync(TEMP)) {
      console.log("No se generó el archivo temporal.");
      omitidos++;
      continue;
    }

    let datos;

    try {
      datos = leerJSON(TEMP);
    } catch (error) {
      console.log(`JSON extraído inválido: ${error.message}`);
      omitidos++;
      continue;
    }

    // Solo aceptamos finales confirmados oficialmente.
    if (
      !isConfirmedFinal({
        ...datos,
        officialUrl: partido.officialUrl,
      })
    ) {
      console.log("Partido sin finalización oficial confirmada.");
      omitidos++;
      continue;
    }

    const homeScore = datos.homeScore;
    const awayScore = datos.awayScore;

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0 ||
      (homeScore === 0 && awayScore === 0)
    ) {
      console.log("Marcador oficial inválido.");
      omitidos++;
      continue;
    }

    if (!Array.isArray(datos.teams)) {
      console.log("No se encontraron equipos oficiales.");
      omitidos++;
      continue;
    }

    const local = datos.teams.find(
      (equipo) =>
        equipo.officialTeamId === partido.home.officialTeamId
    );

    const visitante = datos.teams.find(
      (equipo) =>
        equipo.officialTeamId === partido.away.officialTeamId
    );

    if (
      !local ||
      !visitante ||
      local === visitante
    ) {
      console.log("No coinciden los equipos oficiales.");
      omitidos++;
      continue;
    }

    // Las estadísticas deben justificar el marcador final.
    if (
      puntosEquipo(local) !== homeScore ||
      puntosEquipo(visitante) !== awayScore
    ) {
      console.log(
        "Los puntos de los jugadores no coinciden con el resultado oficial."
      );
      omitidos++;
      continue;
    }

    // El fixture puede tener un marcador provisional.
    if (
      partido.homeScore !== homeScore ||
      partido.awayScore !== awayScore
    ) {
      console.log(
        `Marcador del fixture desactualizado: ` +
        `${partido.homeScore}-${partido.awayScore} -> ` +
        `${homeScore}-${awayScore}`
      );
    }

    const registro = {
      status: datos.status,
      finalEvidence: datos.finalEvidence,
      date: partido.date,
      time: partido.time,
      officialUrl: partido.officialUrl,
      homeScore,
      awayScore,
      ...(Array.isArray(datos.quarterScores) ? { quarterScores: datos.quarterScores } : {}),
      teams: [local, visitante],
    };

    historial.matches.push(registro);
    urlsProcesadas.add(partido.officialUrl);
    agregados++;

    fs.writeFileSync(
      OUTPUT,
      JSON.stringify(historial, null, 2),
      "utf8"
    );

    console.log(
      `Partido validado y guardado: ${homeScore}-${awayScore}`
    );

    await esperar(ESPERA_MS);
  }

  if (fs.existsSync(TEMP)) {
    fs.unlinkSync(TEMP);
  }

  console.log("\nProceso terminado.");
  console.log(`Partidos agregados: ${agregados}`);
  console.log(`Partidos omitidos: ${omitidos}`);
  console.log(`Total en historial: ${historial.matches.length}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
