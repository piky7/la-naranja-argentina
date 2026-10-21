
const fs = require("node:fs");
const cheerio = require("cheerio");

const BASE_URL = "https://www.laliganacional.com.ar";
const OUTPUT = "liga-events-preview.json";

// Primera prueba: cinco días de partidos históricos.
// Inicio de la temporada 2026/27.
const FECHA_INICIO = "2026-09-01";

// Consultar hasta 30 días después de la fecha actual.
const fechaFin = new Date();
fechaFin.setDate(fechaFin.getDate() + 30);

const FECHA_FIN = [
  fechaFin.getFullYear(),
  String(fechaFin.getMonth() + 1).padStart(2, "0"),
  String(fechaFin.getDate()).padStart(2, "0"),
].join("-");

function leerEquipo($, celda) {
  const enlace = $(celda).find("a.equipo").first();
  const href = enlace.attr("href") || "";

  const ids = href.match(
    /\/laliga\/equipo\/(\d+)\/(\d+)\//
  );

  const nombre = enlace
    .find(".nombre-equipo")
    .first()
    .text()
    .trim() || enlace.attr("title") || "";

  return {
    name: nombre.replace(/\s+/g, " ").trim(),
    officialClubId: ids ? Number(ids[1]) : null,
    officialTeamId: ids ? Number(ids[2]) : null,
  };
}

function leerPartido($, fila) {
  const celdas = $(fila).children("td");

  if (celdas.length < 8) return null;

  const local = leerEquipo($, celdas.eq(1));
  const visitante = leerEquipo($, celdas.eq(4));

  const marcadorLocal = celdas
    .eq(2)
    .find("strong")
    .first()
    .text()
    .trim();

  const marcadorVisitante = celdas
    .eq(3)
    .find("strong")
    .first()
    .text()
    .trim();

  const fechaTexto = celdas
    .eq(6)
    .find("strong")
    .first()
    .text()
    .trim();

  const fechaMatch = fechaTexto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/
  );

  const enlacePartido = celdas
    .eq(7)
    .find('a[href*="/laliga/partido/"]')
    .first()
    .attr("href");

  if (!local.officialTeamId ||
      !visitante.officialTeamId ||
      !fechaMatch ||
      !enlacePartido) {
    return null;
  }

  const fecha =
    `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}`;

  return {
    date: fecha,
    time: fechaMatch[4],
    home: local,
    away: visitante,
    homeScore: /^\d+$/.test(marcadorLocal)
      ? Number(marcadorLocal)
      : null,
    awayScore: /^\d+$/.test(marcadorVisitante)
      ? Number(marcadorVisitante)
      : null,
    // No inferimos "finished" solo a partir del marcador.
    status: "unverified",
    officialUrl: new URL(enlacePartido, BASE_URL).href,
  };
}

async function main() {
  const url = new URL("/laliga/fixture", BASE_URL);

  url.searchParams.set("handler", "ProximosPartidos");
  url.searchParams.set("fechaInicio", FECHA_INICIO);
  url.searchParams.set("fechaFin", FECHA_FIN);

  console.log("Consultando fixture oficial...");
  console.log(`${FECHA_INICIO} al ${FECHA_FIN}`);

  const respuesta = await fetch(url, {
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

  const partidos = [];
  const urlsVistas = new Set();
 

  $("table.tabla-calendarios tbody tr.fila-tabla-calendarios")
    .each((_, fila) => {
      const partido = leerPartido($, fila);

      if (!partido) return;
      if (urlsVistas.has(partido.officialUrl)) return;

      urlsVistas.add(partido.officialUrl);
      partidos.push(partido);
    });

  if (!partidos.length) {
    throw new Error(
      "No se encontraron partidos. Revisar la respuesta HTML."
    );
  }

  partidos.sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(
      `${b.date} ${b.time}`
    )
  );

  const resultado = {
    source: "Liga Nacional",
    dateFrom: FECHA_INICIO,
    dateTo: FECHA_FIN,
    matches: partidos,
  };

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(resultado, null, 2),
    "utf8"
  );

  console.log(`\nPartidos encontrados: ${partidos.length}\n`);

  for (const partido of partidos) {
    console.log(
      `${partido.date} ${partido.time} | ` +
      `${partido.home.name} ${partido.homeScore ?? "-"} - ` +
      `${partido.awayScore ?? "-"} ${partido.away.name}`
    );
  }

  console.log(`\nArchivo generado: ${OUTPUT}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
