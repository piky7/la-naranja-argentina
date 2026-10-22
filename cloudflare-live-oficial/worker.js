
const BASE = "https://www.laliganacional.com.ar";
const ZONA = "America/Argentina/Buenos_Aires";

const EQUIPOS = {
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

function fechaHoraArgentina(fecha) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);

  const dato = (tipo) =>
    partes.find((p) => p.type === tipo)?.value;

  return {
    fecha: `${dato("year")}-${dato("month")}-${dato("day")}`,
    hora: `${dato("hour")}:${dato("minute")}`,
  };
}

async function descargar(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    signal: AbortSignal.timeout(15000),
  });

  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}: ${url}`);
  }

  return respuesta.text();
}

async function obtenerEventos() {
  const url =
    "https://raw.githubusercontent.com/" +
    "piky7/la-naranja-argentina/main/lnb-events.json";

  const datos = JSON.parse(await descargar(url));

  if (!Array.isArray(datos.matches)) {
    throw new Error("lnb-events.json no contiene matches");
  }

  return datos.matches;
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

async function obtenerFixture(fecha) {
  const url = new URL("/laliga/fixture", BASE);

  url.searchParams.set("handler", "ProximosPartidos");
  url.searchParams.set("fechaInicio", fecha);
  url.searchParams.set("fechaFin", fecha);

  const html = await descargar(url);

  const filas =
    html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];

  const partidos = [];

  for (const fila of filas) {
    const enlace = fila.match(
      /href="(\/laliga\/partido\/[^"]+)"/i
    )?.[1];

    if (!enlace) continue;

    const fechaPartido = obtenerFechaFixture(fila);

    if (!fechaPartido || fechaPartido.fecha !== fecha) {
      continue;
    }

    const slug = enlace.split("/").pop();
    const separador = slug.indexOf("-vs-");

    if (separador === -1) continue;

    const localSlug = slug.slice(0, separador);
    const visitanteSlug = slug.slice(separador + 4);

    partidos.push({
      ...fechaPartido,
      localLNA: EQUIPOS[localSlug] || null,
      visitanteLNA: EQUIPOS[visitanteSlug] || null,
      url: BASE + enlace,
    });
  }

  return partidos;
}

function interpretarMarcador(html) {
  const estado =
    html.match(/data-estado="([^"]*)"/)?.[1] || null;

  const finalizada =
    html.match(/data-finalizada="([^"]*)"/)?.[1] === "true";

  const puntos = [
    ...html.matchAll(
      /class="marcador-box[^"]*">\s*(\d+)\s*</g
    ),
  ].map((m) => Number(m[1]));

  let status = "unknown";

  if (finalizada || estado === "FINALIZADO") {
    status = "finished";
  } else if (estado === "COMENZADO") {
    status = "live";
  } else if (!estado && puntos.length === 0) {
    status = "scheduled";
  }

  return {
    status,
    homeScore: puntos.length === 2 ? puntos[0] : null,
    awayScore: puntos.length === 2 ? puntos[1] : null,
  };
}

function obtenerPeriodo(html, status) {
  const vacio = {
    quarter: null,
    minutesRemaining: null,
    isHalftime: false,
    lastActionTime: null,
  };

  if (status !== "live") return vacio;

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

  return {
    quarter:
      ultimoCambio?.periodo ||
      (ultimaAccion ? Number(ultimaAccion[1]) : null),
    minutesRemaining: null,
    isHalftime:
      ultimoCambio?.tipo === "FINAL" &&
      ultimoCambio.posicion <
        (ultimaAccion?.index ?? Infinity),
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

  const url = new URL(
    `/laliga/partido/Marcador/${idEnc}`,
    BASE
  );

  url.searchParams.set("handler", "Recargar");
  url.searchParams.set("key", "");

  const marcadorHTML = await descargar(url, {
    headers: {
      Referer: partido.url,
      Accept: "*/*",
    },
  });

  const marcador = interpretarMarcador(marcadorHTML);
  const periodo = obtenerPeriodo(html, marcador.status);

  return { ...marcador, ...periodo };
}

async function generarLive(fecha) {
  const [eventos, oficiales] = await Promise.all([
    obtenerEventos(),
    obtenerFixture(fecha),
  ]);

  const resultados = [];

  for (const oficial of oficiales) {
    if (!oficial.localLNA || !oficial.visitanteLNA) {
      continue;
    }

    const coincidencias = eventos.filter((evento) => {
      const fechaEvento = fechaHoraArgentina(
        new Date(evento.timestamp * 1000)
      );

      return (
        evento.homeTeam === oficial.localLNA &&
        evento.awayTeam === oficial.visitanteLNA &&
        fechaEvento.fecha === oficial.fecha &&
        fechaEvento.hora === oficial.hora
      );
    });

    if (coincidencias.length !== 1) {
      console.warn(
        "Correspondencia insegura:",
        oficial.localLNA,
        oficial.visitanteLNA,
        coincidencias.length
      );
      continue;
    }

    const evento = coincidencias[0];

    try {
      const marcador = await obtenerMarcador(oficial);

      if (marcador.status === "unknown") {
        console.warn("Estado desconocido:", evento.eventId);
        continue;
      }

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
        "Error consultando:",
        evento.eventId,
        error.message
      );
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    date: fecha,
    liveMatches: resultados,
  };
}


const CLAVE_KV = "live-matches";


async function actualizarMarcadores(env) {
  const fecha = fechaHoraArgentina(new Date()).fecha;

  const datos = await generarLive(fecha);

  if (!Array.isArray(datos.liveMatches)) {
    throw new Error("Respuesta inválida del extractor");
  }

  const anteriores = await env.LNA_LIVE_OFICIAL.get(
    CLAVE_KV,
    "json"
  );

  // Si no hay partidos, no reemplazar los datos anteriores.
  if (datos.liveMatches.length === 0) {
    console.log("Sin partidos para actualizar:", fecha);
    return;
  }

  // Conservar datos válidos cuando falle una consulta individual.
  const anterioresPorId = new Map(
    (anteriores?.date === fecha
      ? anteriores.liveMatches || []
      : []
    ).map((partido) => [partido.eventId, partido])
  );

 
const ahora = Date.now();

const nuevosPorId = new Map(
  datos.liveMatches.map((partido) => [
    partido.eventId,
    {
      ...partido,
      lastSuccessfulUpdate: new Date(ahora).toISOString(),
      isStale: false,
    },
  ])
);

  for (const [eventId, anterior] of anterioresPorId) {
    const nuevo = nuevosPorId.get(eventId);

    // No perder un partido por un fallo temporal.
   
if (!nuevo) {
  const ultimaActualizacion = Date.parse(
    anterior.lastSuccessfulUpdate || anteriores.updatedAt || ""
  );

  const desactualizado =
    !Number.isFinite(ultimaActualizacion) ||
    ahora - ultimaActualizacion > 3 * 60 * 1000;

  nuevosPorId.set(eventId, {
    ...anterior,
    isStale: desactualizado,
  });

  continue;
}


    // Evitar retroceder de finalizado a en vivo.
    if (
      anterior.status === "finished" &&
      nuevo.status !== "finished"
    ) {
      nuevosPorId.set(eventId, anterior);
      continue;
    }

    // Evitar reemplazar un marcador válido por uno sin puntos.
    if (
      anterior.homeScore !== null &&
      anterior.awayScore !== null &&
      (nuevo.homeScore === null ||
        nuevo.awayScore === null)
    ) {
      nuevosPorId.set(eventId, anterior);
    }
  }

  const resultado = {
    ...datos,
    liveMatches: [...nuevosPorId.values()],
  };

  await env.LNA_LIVE_OFICIAL.put(
    CLAVE_KV,
    JSON.stringify(resultado)
  );

  console.log(
    "Marcadores oficiales guardados:",
    resultado.liveMatches.length
  );

  return resultado;
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/live") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const guardado = await env.LNA_LIVE_OFICIAL.get(
        CLAVE_KV,
        "json"
      );

      const hoy = fechaHoraArgentina(new Date()).fecha;

      if (!guardado || guardado.date !== hoy) {
        return Response.json({
          updatedAt: null,
          date: hoy,
          liveMatches: [],
          message: "Todavía no hay marcadores oficiales actualizados",
        });
      }

     
const ahora = Date.now();
const LIMITE_ANTIGUEDAD = 3 * 60 * 1000;

const datosActualizados = {
  ...guardado,
  liveMatches: guardado.liveMatches.map((partido) => {
    const ultimaActualizacion = Date.parse(
      partido.lastSuccessfulUpdate || guardado.updatedAt || ""
    );

    const desactualizado =
      !Number.isFinite(ultimaActualizacion) ||
      ahora - ultimaActualizacion > LIMITE_ANTIGUEDAD;

    return {
      ...partido,
      isStale: desactualizado,
    };
  }),
};

return Response.json(datosActualizados, {
  headers: {
    "Cache-Control": "no-store",
  },
});

    } catch (error) {
      console.error("Error leyendo KV:", error.message);

      return Response.json(
        { error: "No se pudieron leer los marcadores" },
        { status: 502 }
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      actualizarMarcadores(env).catch((error) => {
        console.error(
          "Error actualizando LIVE oficial:",
          error.message
        );
      })
    );
  },
};
