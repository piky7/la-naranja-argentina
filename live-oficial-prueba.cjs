
const fs = require("node:fs");

const BASE = "https://www.laliganacional.com.ar";
const FECHA = "2026-10-21";
const TIMEZONE = "America/Argentina/Buenos_Aires";

const equipos = {
  "argentino-j": "argentino",
  "atenas-c": "atenas",
  boca: "boca",
  ferro: "ferro",
  "gimnasia-cr": "gimnasia",
  "independiente-o": "independiente-oliva",
  instituto: "instituto",
  lanus: "lanus",
  "la-union": "la-union",
  obera: "obera",
  olimpico: "olimpico",
  "penarol-mdp": "penarol",
  platense: "platense",
  quimsa: "quimsa",
  "racing-ch": "racing-chivilcoy",
  "regatas-c": "regatas",
  "san-lorenzo": "san-lorenzo",
  "san-martin-c": "san-martin",
};

function fechaHoraArgentina(timestamp) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp * 1000));

  const dato = (tipo) =>
    partes.find((p) => p.type === tipo)?.value;

  return {
    fecha: `${dato("year")}-${dato("month")}-${dato("day")}`,
    hora: `${dato("hour")}:${dato("minute")}`,
  };
}

function obtenerFechaFixture(fila) {
  const texto = fila.match(
    /class="[^"]*fecha-campo[^"]*"[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/i
  )?.[1];

  const fecha = texto?.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/
  );

  if (!fecha) return null;

  return {
    fecha: `${fecha[3]}-${fecha[2]}-${fecha[1]}`,
    hora: `${fecha[4]}:${fecha[5]}`,
  };
}

async function descargar(url, opciones = {}) {
  const respuesta = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    ...opciones,
  });

  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}: ${url}`);
  }

  return respuesta.text();
}

async function obtenerFixture() {
  const url = new URL("/laliga/fixture", BASE);

  url.searchParams.set("handler", "ProximosPartidos");
  url.searchParams.set("fechaInicio", FECHA);
  url.searchParams.set("fechaFin", FECHA);

  const html = await descargar(url);

  const filas =
    html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];

  const partidos = [];

  for (const fila of filas) {
    const enlace = fila.match(
      /href="(\/laliga\/partido\/[^"]+)"/i
    )?.[1];

    if (!enlace) continue;

    const fecha = obtenerFechaFixture(fila);
    if (!fecha || fecha.fecha !== FECHA) continue;

    const slug = enlace.split("/").pop();
    const separador = slug.indexOf("-vs-");

    if (separador === -1) continue;

    const localSlug = slug.slice(0, separador);
    const visitanteSlug = slug.slice(separador + 4);

    partidos.push({
      ...fecha,
      localSlug,
      visitanteSlug,
      localLNA: equipos[localSlug] || null,
      visitanteLNA: equipos[visitanteSlug] || null,
      url: BASE + enlace,
    });
  }

  return partidos;
}

function interpretarMarcador(html) {
  const estadoOficial =
    html.match(/data-estado="([^"]*)"/)?.[1] || null;

  const finalizada =
    html.match(/data-finalizada="([^"]*)"/)?.[1] === "true";

  const puntos = [
    ...html.matchAll(
      /class="marcador-box[^"]*">\s*(\d+)\s*</g
    ),
  ].map((m) => Number(m[1]));

  let status = "unknown";

  if (finalizada || estadoOficial === "FINALIZADO") {
    status = "finished";
  } else if (estadoOficial === "COMENZADO") {
    status = "live";
  } else if (!estadoOficial && puntos.length === 0) {
    status = "scheduled";
  }

  return {
    status,
    homeScore: puntos.length === 2 ? puntos[0] : null,
    awayScore: puntos.length === 2 ? puntos[1] : null,
    estadoOficial,
    finalizada,
  };
}

function obtenerInformacionPeriodo(html, status) {
  if (status !== "live") {
    return {
      quarter: null,
      minutesRemaining: null,
      isHalftime: false,
      lastActionTime: null,
    };
  }

  const cambios = [
    ...html.matchAll(
      /<li\b[^>]*class="[^"]*\b(INICIO|FINAL)-PERIODO\b[^"]*"[^>]*>/gi
    ),
  ].map((m) => {
    const fragmento = html.slice(m.index, m.index + 500);

    const numero = fragmento.match(
      /<strong[^>]*>[\s\S]*?(?:INICIO|FINAL)-PERIODO\s*<span>\s*(\d+)\s*<\/span>/i
    );

    return {
      tipo: m[1].toUpperCase(),
      periodo: numero ? Number(numero[1]) : null,
      posicion: m.index,
    };
  });

  const ultimaAccion = html.match(
    /Cuarto\s+(\d+)\s*-\s*(\d{2}:\d{2}:\d{2})/i
  );

  const ultimoCambio = cambios[0] || null;

  const isHalftime =
    ultimoCambio?.tipo === "FINAL" &&
    ultimoCambio.posicion < (ultimaAccion?.index ?? Infinity);

  const quarter =
    ultimoCambio?.periodo ||
    (ultimaAccion ? Number(ultimaAccion[1]) : null);

  return {
    quarter,
    minutesRemaining: null,
    isHalftime,
    lastActionTime: ultimaAccion?.[2] || null,
  };
}

async function obtenerMarcador(partido) {
  const html = await descargar(partido.url);

  const idEnc = html.match(
    /var\s+idEnc\s*=\s*['"]([^'"]+)['"]/
  )?.[1];

  if (!idEnc) {
    throw new Error("No se encontró idEnc");
  }

  const urlMarcador = new URL(
    `/laliga/partido/Marcador/${idEnc}`,
    BASE
  );

  urlMarcador.searchParams.set("handler", "Recargar");
  urlMarcador.searchParams.set("key", "");

  const htmlMarcador = await descargar(urlMarcador, {
    headers: {
      Referer: partido.url,
      Accept: "*/*",
    },
  });

  const marcador = interpretarMarcador(htmlMarcador);
  const periodo = obtenerInformacionPeriodo(
    html,
    marcador.status
  );

  return { ...marcador, ...periodo };
}

async function main() {
  const eventos = JSON.parse(
    fs.readFileSync("lnb-events.json", "utf8")
  ).matches;

  console.log("Consultando fixture oficial...");
  const oficiales = await obtenerFixture();

  console.log("Partidos encontrados:", oficiales.length);

  const resultados = [];

  for (const oficial of oficiales) {
    const coincidencias = eventos.filter((evento) => {
      const fecha = fechaHoraArgentina(evento.timestamp);

      return (
        oficial.localLNA !== null &&
        oficial.visitanteLNA !== null &&
        evento.homeTeam === oficial.localLNA &&
        evento.awayTeam === oficial.visitanteLNA &&
        fecha.fecha === oficial.fecha &&
        fecha.hora === oficial.hora
      );
    });

    if (coincidencias.length !== 1) {
      console.log(
        "Partido omitido por correspondencia insegura:",
        oficial.localSlug,
        oficial.visitanteSlug,
        coincidencias.length
      );
      continue;
    }

    const evento = coincidencias[0];

    try {
      const marcador = await obtenerMarcador(oficial);

      resultados.push({
        eventId: evento.eventId,
        homeTeam: evento.homeTeam,
        awayTeam: evento.awayTeam,
        homeName: evento.homeName,
        awayName: evento.awayName,
        homeScore: marcador.homeScore,
        awayScore: marcador.awayScore,
        quarter: marcador.quarter,
        minutesRemaining: marcador.minutesRemaining,
        isHalftime: marcador.isHalftime,
        lastActionTime: marcador.lastActionTime,
        timestamp: evento.timestamp,
        status: marcador.status,
        isLive: marcador.status === "live",
      });
    } catch (error) {
      console.error(
        `Error en ${evento.homeName} vs ${evento.awayName}:`,
        error.message
      );
    }
  }

  console.log("\n========== LIVE OFICIAL LNA ==========");

  console.log(
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        date: FECHA,
        liveMatches: resultados,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Error general:", error.message);
  process.exitCode = 1;
});
