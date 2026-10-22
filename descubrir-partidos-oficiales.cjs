
const fs = require("node:fs");

const BASE_URL = "https://www.laliganacional.com.ar";
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const FECHA_INICIO = "2026-10-21";
const FECHA_FIN = "2026-10-28";

const equiposLNA = {
  "argentino-j": "argentino",
  "atenas-c": "atenas",
  "boca": "boca",
  "ferro": "ferro",
  "gimnasia-cr": "gimnasia",
  "independiente-o": "independiente-oliva",
  "instituto": "instituto",
  "lanus": "lanus",
  "la-union": "la-union",
  "obera": "obera",
  "olimpico": "olimpico",
  "penarol-mdp": "penarol",
  "platense": "platense",
  "quimsa": "quimsa",
  "racing-ch": "racing-chivilcoy",
  "regatas-c": "regatas",
  "san-lorenzo": "san-lorenzo",
  "san-martin-c": "san-martin",
};

function fechaArgentina(timestamp) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp * 1000));

  const dato = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value;

  return {
    fecha: `${dato("year")}-${dato("month")}-${dato("day")}`,
    hora: `${dato("hour")}:${dato("minute")}`,
  };
}

function limpiarHTML(texto) {
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, codigo) =>
      String.fromCodePoint(parseInt(codigo, 16))
    )
    .replace(/&#(\d+);/g, (_, codigo) =>
      String.fromCodePoint(Number(codigo))
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function convertirFecha(fechaOriginal) {
  const coincidencia = fechaOriginal.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/
  );

  if (!coincidencia) return null;

  const [, dia, mes, anio, hora, minuto] = coincidencia;

  return {
    fecha: `${anio}-${mes}-${dia}`,
    hora: `${hora}:${minuto}`,
  };
}

function extraerPartidos(html) {
  const filas = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const partidos = [];

  for (const fila of filas) {
    const enlace = fila.match(
      /href="(\/laliga\/partido\/[^"]+)"/i
    );

    if (!enlace) continue;

    const url = enlace[1];

    const nombres = [
      ...fila.matchAll(
        /<strong[^>]*class="nombre-equipo"[^>]*>([\s\S]*?)<\/strong>/gi
      ),
    ].map((m) => limpiarHTML(m[1]));

    const fechaTexto = fila.match(
      /<td[^>]*class="[^"]*fecha-campo[^"]*"[^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i
    );

    const fecha = fechaTexto
      ? convertirFecha(limpiarHTML(fechaTexto[1]))
      : null;

    const slug = url.split("/").pop();
    const separador = slug.indexOf("-vs-");

    if (separador === -1 || !fecha) continue;

    const localSlug = slug.slice(0, separador);
    const visitanteSlug = slug.slice(separador + 4);

    partidos.push({
      local: nombres[0] || localSlug,
      visitante: nombres[1] || visitanteSlug,
      localSlug,
      visitanteSlug,
      localLNA: equiposLNA[localSlug] || null,
      visitanteLNA: equiposLNA[visitanteSlug] || null,
      fecha: fecha.fecha,
      hora: fecha.hora,
      url: BASE_URL + url,
    });
  }

  return partidos;
}

async function main() {
  const eventos = JSON.parse(
    fs.readFileSync("lnb-events.json", "utf8")
  ).matches;

  const url = new URL("/laliga/fixture", BASE_URL);

  url.searchParams.set("handler", "ProximosPartidos");
  url.searchParams.set("fechaInicio", FECHA_INICIO);
  url.searchParams.set("fechaFin", FECHA_FIN);

  console.log("Consultando fixture oficial...");
  console.log("Desde:", FECHA_INICIO);
  console.log("Hasta:", FECHA_FIN);

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  const html = await respuesta.text();
  const oficiales = extraerPartidos(html);

  let encontrados = 0;
  let sinCoincidencia = 0;
  let ambiguos = 0;

  console.log("\nPartidos oficiales:", oficiales.length);
  console.log("----------------------------------------");

  for (const oficial of oficiales) {
    const candidatos = eventos.filter((evento) => {
      const fechaLNA = fechaArgentina(evento.timestamp);

      return (
        evento.homeTeam === oficial.localLNA &&
        evento.awayTeam === oficial.visitanteLNA &&
        fechaLNA.fecha === oficial.fecha
      );
    });

    const coincidenciasExactas = candidatos.filter((evento) => {
      return fechaArgentina(evento.timestamp).hora === oficial.hora;
    });

    let estado;
    let partidoLNA = null;

    if (!oficial.localLNA || !oficial.visitanteLNA) {
      estado = "EQUIPO SIN MAPEAR";
      sinCoincidencia++;
    } else if (coincidenciasExactas.length === 1) {
      estado = "COINCIDENCIA EXACTA";
      partidoLNA = coincidenciasExactas[0];
      encontrados++;
    } else if (candidatos.length === 1) {
      estado = "REVISAR HORARIO";
      partidoLNA = candidatos[0];
      sinCoincidencia++;
    } else if (
      coincidenciasExactas.length > 1 ||
      candidatos.length > 1
    ) {
      estado = "AMBIGUO";
      ambiguos++;
    } else {
      estado = "SIN COINCIDENCIA";
      sinCoincidencia++;
    }

    console.log(
      `\n${oficial.local} vs ${oficial.visitante}`
    );
    console.log(`Fecha: ${oficial.fecha} ${oficial.hora}`);
    console.log(`Estado: ${estado}`);

    if (partidoLNA) {
      console.log(`Event ID LNA: ${partidoLNA.eventId}`);
    }

    console.log(`URL oficial: ${oficial.url}`);
  }

  console.log("\n========== RESUMEN ==========");
  console.log("Oficiales:", oficiales.length);
  console.log("Coincidencias exactas:", encontrados);
  console.log("Sin coincidencia / revisión:", sinCoincidencia);
  console.log("Ambiguos:", ambiguos);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
