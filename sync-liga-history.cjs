
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
      console.log(`Ya procesado: ${partido.home.name} - ${partido.away.name}`);
      omitidos++;
      continue;
    }

    // Primera prueba: solo fechas pasadas, nunca hoy ni futuras.
    const hoyArgentina = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (partido.date >= hoyArgentina) {
      console.log(`Fecha no histórica: ${partido.date}`);
      omitidos++;
      continue;
    }

    // No aceptamos marcadores vacíos ni 0-0.
    if (
      !Number.isInteger(partido.homeScore) ||
      !Number.isInteger(partido.awayScore) ||
      (partido.homeScore === 0 && partido.awayScore === 0)
    ) {
      console.log(`Marcador no válido: ${partido.officialUrl}`);
      omitidos++;
      continue;
    }

    console.log(
      `Procesando: ${partido.home.name} vs ${partido.away.name}`
    );

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

    if (ejecucion.status !== 0) {
      console.error(
        `Error de extracción: ${ejecucion.stderr || ejecucion.stdout}`
      );
      omitidos++;
      continue;
    }

    if (!fs.existsSync(TEMP)) {
      console.log("No se generó el archivo temporal.");
      omitidos++;
      continue;
    }

    const datos = leerJSON(TEMP);

    const local = datos.teams.find(
      (e) => e.officialTeamId === partido.home.officialTeamId
    );

    const visitante = datos.teams.find(
      (e) => e.officialTeamId === partido.away.officialTeamId
    );

    if (!local || !visitante) {
      console.log("No coinciden los equipos oficiales.");
      omitidos++;
      continue;
    }

    if (
      puntosEquipo(local) !== partido.homeScore ||
      puntosEquipo(visitante) !== partido.awayScore
    ) {
      console.log("Los puntos no coinciden con el resultado.");
      omitidos++;
      continue;
    }

    const registro = {
      date: partido.date,
      time: partido.time,
      officialUrl: partido.officialUrl,
      homeScore: partido.homeScore,
      awayScore: partido.awayScore,
      teams: [local, visitante],
    };

    historial.matches.push(registro);
    urlsProcesadas.add(partido.officialUrl);
    agregados++;

    // Guardamos después de cada partido validado.
    fs.writeFileSync(
      OUTPUT,
      JSON.stringify(historial, null, 2),
      "utf8"
    );

    console.log("Partido validado y guardado.");

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
