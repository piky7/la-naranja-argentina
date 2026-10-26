const { extractTeamStats } = require("./scripts/official-team-stats.cjs");
const { parseOfficialFinal } = require("./scripts/parse-official-final.cjs");

const fs = require("node:fs");
const cheerio = require("cheerio");

const URL_PARTIDO =
  process.argv[2] ||
  "https://www.laliganacional.com.ar/laliga/partido/v2mutwzkFpVB_zfttBUINRQ0TlDYJTLYTqAu6sF8Pq3SSU5pCs1H6x_g==/platense-vs-obera";

const OUTPUT = process.argv[3] || "liga-normalized.json";

function obtenerJugador($, fila) {
  const onclick = $(fila).attr("onclick") || "";

  // Leemos el objeto JSON sin ejecutar el onclick.
  const inicio = onclick.indexOf("{");
  if (inicio === -1) return null;

  let profundidad = 0;
  let fin = -1;
  let dentroDeCadena = false;
  let escapado = false;

  for (let i = inicio; i < onclick.length; i++) {
    const caracter = onclick[i];

    if (dentroDeCadena) {
      if (escapado) escapado = false;
      else if (caracter === "\\") escapado = true;
      else if (caracter === '"') dentroDeCadena = false;
    } else {
      if (caracter === '"') dentroDeCadena = true;
      else if (caracter === "{") profundidad++;
      else if (caracter === "}") {
        profundidad--;
        if (profundidad === 0) {
          fin = i + 1;
          break;
        }
      }
    }
  }

  if (fin === -1) return null;

  const datos = JSON.parse(onclick.slice(inicio, fin));

  return {
    officialPlayerId: datos.IdJugador,
    officialTeamId: datos.IdEquipo,
    name: datos.NombreCompleto || datos.Nombre,
    number: datos.Dorsal,
    points: datos.Puntos,
    rebounds: datos.RebotesTotales,
    assists: datos.Asistencias,
    minutes: datos.TiempoJuego,
    valuation: datos.Valoracion,
    starter: datos.CincoInicial,
    steals: datos.Recuperaciones,
    turnovers: datos.Perdidas,
    offensiveRebounds: datos.ReboteOfensivo,
    defensiveRebounds: datos.ReboteDefensivo,
    twoPointers: datos.TirosDos,
    threePointers: datos.TirosTres,
    freeThrows: datos.TirosLibres,
    plusMinus: datos.MasMenos,
  };
}

async function comprobarFinalMarcadorOficial(html, urlPartido) {
  const idEnc = html.match(/var\s+idEnc\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!idEnc) {
    console.log("Diagnóstico final: no se encontró idEnc para consultar el marcador oficial.");
    return null;
  }
  try {
    const url = new URL("/laliga/partido/Marcador/" + encodeURIComponent(idEnc), urlPartido);
    url.searchParams.set("handler", "Recargar");
    url.searchParams.set("key", "");
    const respuesta = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*", Referer: urlPartido },
    });
    if (!respuesta.ok) {
      console.log("Diagnóstico final: marcador oficial HTTP " + respuesta.status);
      return null;
    }
    const marcador = await respuesta.text();
    const estado = marcador.match(/data-estado="([^"]*)"/)?.[1] || null;
    const finalizada = marcador.match(/data-finalizada="([^"]*)"/)?.[1] === "true";
    const puntos = [...marcador.matchAll(/class="marcador-box[^"]*">\s*(\d+)\s*</g)]
      .map(m => Number(m[1]));
    console.log("Diagnóstico marcador oficial:", JSON.stringify({ estado, finalizada, puntos }));
    if (!(finalizada || estado === "FINALIZADO") || puntos.length !== 2) return null;
    return { homeScore: puntos[0], awayScore: puntos[1] };
  } catch (error) {
    console.log("Diagnóstico final: marcador oficial no disponible:", error.message);
    return null;
  }
}

async function main() {
  console.log("Descargando partido oficial...");

  const respuesta = await fetch(URL_PARTIDO, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html",
    },
  });

  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}`);
  }

  const html = await respuesta.text();
  const $ = cheerio.load(html);
  const equipos = [];

  $(".tabla-estadisticas").each((_, tabla) => {
    const contenedor = $(tabla)
  .closest(".table-responsive");

const encabezado = contenedor
  .prevAll(".nombre-equipo")
  .first();
    const imagen = encabezado.find("img").first();

    const nombre = encabezado.find("strong").first().text().trim();
    const escudo = imagen.attr("src") || "";
    const ids = escudo.match(/\/escudos\/(\d+)\/(\d+)/);

    if (!nombre || !ids) {
      throw new Error("No se pudo identificar el equipo de una tabla.");
    }

    const jugadores = [];

    $(tabla).find("tbody tr").each((_, fila) => {
      const jugador = obtenerJugador($, fila);
      if (jugador) jugadores.push(jugador);
    });

    equipos.push({
      name: nombre,
      officialClubId: Number(ids[1]),
      officialTeamId: Number(ids[2]),
      players: jugadores,
      totalPlayerPoints: jugadores.reduce(
        (suma, jugador) => suma + jugador.points,
        0
      ),
    });
  });

  if (equipos.length !== 2) {
    throw new Error(
      `Se esperaban 2 equipos y se encontraron ${equipos.length}.`
    );
  }

  for (const equipo of equipos) {
    if (!equipo.players.length) {
      throw new Error(`No se encontraron jugadores de ${equipo.name}`);
    }
  }

  extractTeamStats($, equipos);

  const resultado = {
    source: "Liga Nacional",
    ...parseOfficialFinal($, URL_PARTIDO),
    matchUrl: URL_PARTIDO,
    teams: equipos,
  };

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(resultado, null, 2),
    "utf8"
  );

  console.log("Extracción completada:");
  for (const equipo of equipos) {
    console.log(
      `${equipo.name}: ${equipo.players.length} jugadores, ` +
      `${equipo.totalPlayerPoints} puntos`
    );
  }
  console.log(`Archivo generado: ${OUTPUT}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
