
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

async function obtenerConCache(
  env,
  clave,
  duracionSegundos,
  obtenerDatos
) {
  const ahora = Date.now();

  const guardado = await env.LNA_LIVE_OFICIAL.get(
    clave,
    "json"
  );

  if (
    guardado &&
    Array.isArray(guardado.datos) &&
    Number.isFinite(guardado.guardadoEn) &&
    ahora - guardado.guardadoEn < duracionSegundos * 1000
  ) {
    console.log("Caché utilizada:", clave);
    return guardado.datos;
  }

  const datos = await obtenerDatos();

  // No reemplazar una caché válida con datos incorrectos.
  if (!Array.isArray(datos)) {
    throw new Error("Datos inválidos para caché: " + clave);
  }

  await env.LNA_LIVE_OFICIAL.put(
    clave,
    JSON.stringify({
      guardadoEn: ahora,
      datos,
    })
  );

  console.log("Caché actualizada:", clave);

  return datos;
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
  const cuartoAccion = ultimaAccion ? Number(ultimaAccion[1]) : null;
  const cuartoCambio = ultimoCambio?.periodo || null;
  // Un evento viejo de FINAL-PERIODO no puede devolver el partido
  // a entretiempo cuando ya existen acciones de un cuarto posterior.
  const quarter = Math.max(cuartoAccion || 0, cuartoCambio || 0) || null;
  const isHalftime =
    ultimoCambio?.tipo === "FINAL" &&
    cuartoCambio === 2 &&
    (cuartoAccion == null || cuartoAccion <= 2) &&
    ultimoCambio.posicion < (ultimaAccion?.index ?? Infinity);

  return {
    quarter,
    minutesRemaining: null,
    isHalftime,
    lastActionTime: ultimaAccion?.[2] || null,
  };
}


async function obtenerMarcador(partido) {
  console.log(
    "Consultando marcador oficial:",
    partido.localLNA,
    partido.visitanteLNA,
    partido.url
  );

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


async function obtenerMarcadorConRecuperacion(
  partido,
  fecha,
  env
) {
  try {
   return await obtenerMarcador(partido);
  } catch (error) {
    console.warn(
      "Falló URL oficial, buscando nuevamente:",
      partido.localLNA,
      partido.visitanteLNA,
      error.message
    );

    // Descargar un fixture nuevo, sin utilizar la caché.
    const fixtureNuevo = await obtenerFixture(fecha);

    // Buscar exactamente el mismo encuentro.
    const coincidencias = fixtureNuevo.filter(
      (candidato) =>
        candidato.localLNA === partido.localLNA &&
        candidato.visitanteLNA === partido.visitanteLNA &&
        candidato.fecha === partido.fecha &&
        candidato.hora === partido.hora
    );

    if (coincidencias.length !== 1) {
      throw new Error(
        "No se pudo recuperar una URL oficial única"
      );
    }

    const partidoActualizado = coincidencias[0];

    // Reintentar una sola vez con la URL nueva.
    const marcador = await obtenerMarcador(partidoActualizado);

    // Actualizar el fixture almacenado solo después
    // de comprobar que la URL nueva funciona.
    await env.LNA_LIVE_OFICIAL.put(
      `fixture-oficial:${fecha}`,
      JSON.stringify({
        guardadoEn: Date.now(),
        datos: fixtureNuevo,
      })
    );

    console.log(
      "URL oficial recuperada:",
      partido.localLNA,
      partido.visitanteLNA
    );

    return marcador;
  }
}


async function generarLive(fecha, anteriores = null, env) {
  // Primero consultamos únicamente los eventos, usando su caché de 30 minutos.
  // Así podemos evitar descargar el fixture oficial cuando no hay partidos
  // dentro de la ventana de seguimiento.
  const eventos = await obtenerConCache(
    env,
    "eventos-lnb",
    1800,
    () => obtenerEventos()
  );

  const ahora = Date.now();
  const anterioresDelDia =
    anteriores?.date === fecha
      ? anteriores.liveMatches || []
      : [];

  const partidosEnSeguimiento = new Set(
    anterioresDelDia
      .filter((partido) =>
        partido.status === "live" || partido.isLive === true
      )
      .map((partido) => String(partido.eventId))
  );

  const margenAntes = 30 * 60 * 1000;
  const margenDespues = 240 * 60 * 1000;

  const hayCandidatos = eventos.some((evento) => {
    const timestamp = Number(evento.timestamp) * 1000;

    if (
      !evento.eventId ||
      !Number.isFinite(timestamp) ||
      timestamp <= 0
    ) {
      return false;
    }

    // Un partido ya marcado como LIVE debe seguirse incluso si cruza
    // la medianoche argentina y su fecha de inicio ya es la anterior.
    if (partidosEnSeguimiento.has(String(evento.eventId))) {
      return true;
    }

    // Para nuevos candidatos, solo consideramos partidos de la fecha actual.
    if (fechaHoraArgentina(new Date(timestamp)).fecha !== fecha) {
      return false;
    }

    const tiempoDesdeInicio = ahora - timestamp;
    return (
      tiempoDesdeInicio >= -margenAntes &&
      tiempoDesdeInicio <= margenDespues
    );
  });

  if (!hayCandidatos) {
    console.log(
      "Sin partidos en ventana LIVE; se omite la consulta del fixture oficial:",
      fecha
    );

    return {
      updatedAt: new Date().toISOString(),
      date: fecha,
      liveMatches: anterioresDelDia,
    };
  }

  const oficiales = await obtenerConCache(
    env,
    `fixture-oficial:${fecha}`,
    600,
    () => obtenerFixture(fecha)
  );

  const anterioresPorId = new Map(
    (anteriores?.date === fecha
      ? anteriores.liveMatches || []
      : []
    ).map((partido) => [partido.eventId, partido])
  );

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
    const anterior = anterioresPorId.get(evento.eventId);

    // Un partido finalizado ya no necesita consultas.

if (anterior?.status === "finished") {
  console.log(
    "Marcador finalizado reutilizado desde KV:",
    evento.eventId,
    anterior.homeScore,
    anterior.awayScore
  );

  resultados.push(anterior);
  continue;
}


    const inicio = Number(evento.timestamp) * 1000;

    // Seguir partidos desde 30 minutos antes hasta 4 horas después
    // del inicio. Un partido que ya estaba en vivo continúa en seguimiento.
    if (
      !anterior?.isLive &&
      (
        ahora < inicio - 30 * 60 * 1000 ||
        ahora > inicio + 240 * 60 * 1000
      )
    ) {
      if (anterior) {
        resultados.push(anterior);
      }
      continue;
    }

    try {
      const marcador = await obtenerMarcadorConRecuperacion(
  oficial,
  fecha,
  env
);





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

  // Leer primero los marcadores guardados.
  const anteriores = await env.LNA_LIVE_OFICIAL.get(
    CLAVE_KV,
    "json"
  );

  // Pasarlos al extractor para evitar consultas innecesarias.
  const datos = await generarLive(fecha, anteriores, env);


  if (!Array.isArray(datos.liveMatches)) {
    throw new Error("Respuesta inválida del extractor");
  }


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
  datos.liveMatches.map((partido) => {
    const anterior = anterioresPorId.get(partido.eventId);

    // Si el extractor reutilizó el objeto anterior,
    // no hubo una nueva consulta al sitio oficial.
    const reutilizado = partido === anterior;

    return [
      partido.eventId,
      reutilizado
        ? { ...anterior }
        : {
            ...partido,
            lastSuccessfulUpdate: new Date(ahora).toISOString(),
            isStale: false,
          },
    ];
  })
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
  isStale:
    anterior.status === "finished"
      ? false
      : desactualizado,
});

  continue;
}


    // No retroceder de cuarto por lecturas desactualizadas del sitio oficial.
    if (
      anterior.status === "live" &&
      nuevo.status === "live" &&
      Number(anterior.quarter) > Number(nuevo.quarter)
    ) {
      nuevo.quarter = anterior.quarter;
      nuevo.isHalftime = false;
    }
    if (
      nuevo.status === "live" &&
      Number(nuevo.quarter) >= 3
    ) {
      nuevo.isHalftime = false;
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

    // Evitar reemplazar un marcador válido por datos incompletos
    // o por un 0-0 inesperado.
    const marcadorAnteriorValido =
      Number.isFinite(anterior.homeScore) &&
      Number.isFinite(anterior.awayScore);

    const marcadorNuevoIncompleto =
      !Number.isFinite(nuevo.homeScore) ||
      !Number.isFinite(nuevo.awayScore);

    const ceroCeroInesperado =
      marcadorAnteriorValido &&
      anterior.homeScore + anterior.awayScore > 0 &&
      nuevo.homeScore === 0 &&
      nuevo.awayScore === 0;

    if (
      marcadorAnteriorValido &&
      (marcadorNuevoIncompleto || ceroCeroInesperado)
    ) {
      console.warn(
        "Marcador sospechoso, conservando anterior:",
        eventId
      );

      nuevosPorId.set(eventId, {
        ...anterior,
        isStale: anterior.status === "finished"
          ? false
          : true,
      });
    }

  }

  const resultado = {
    ...datos,
    liveMatches: [...nuevosPorId.values()],
  };

  // Comparar los datos de los partidos sin incluir updatedAt.
  const partidosAnteriores =
    anteriores?.date === fecha
      ? anteriores.liveMatches || []
      : [];

  const partidosNuevos = resultado.liveMatches;

  const sinCambios =
    JSON.stringify(partidosAnteriores) ===
    JSON.stringify(partidosNuevos);

  if (sinCambios) {
    console.log(
      "Sin cambios en marcadores: escritura KV evitada"
    );
    return anteriores;
  }

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


const ORIGENES_PERMITIDOS = [
  "https://lanaranjaargentina.com.ar",
  "http://localhost:5173",
  "http://localhost:5174",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

function obtenerCorsHeaders(request) {
  const origen = request.headers.get("Origin");

  return {
    ...CORS_HEADERS,
    ...(ORIGENES_PERMITIDOS.includes(origen)
      ? { "Access-Control-Allow-Origin": origen }
      : {}),
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);


if (url.pathname !== "/api/live") {
  return new Response("Not found", {
    status: 404,
    headers: obtenerCorsHeaders(request),
  });
}

if (request.method !== "GET") {
  return new Response("Method not allowed", {
    status: 405,
    headers: obtenerCorsHeaders(request),
  });
}


    try {
      const guardado = await env.LNA_LIVE_OFICIAL.get(
        CLAVE_KV,
        "json"
      );

     // PRUEBA LOCAL: usar la fecha de los marcadores guardados.
// RESTAURAR ANTES DEL DESPLIEGUE.
const hoy = fechaHoraArgentina(new Date()).fecha;


if (!guardado || guardado.date !== hoy) {
  return Response.json(
    {
      updatedAt: null,
      date: hoy,
      liveMatches: [],
      message: "Todavía no hay marcadores oficiales actualizados",
    },
    {
      headers: {
        ...obtenerCorsHeaders(request),
"Cache-Control": "no-store",
      },
    }
  );
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
  partido.status !== "finished" &&
  (
    partido.isStale === true ||
    !Number.isFinite(ultimaActualizacion) ||
    ahora - ultimaActualizacion > LIMITE_ANTIGUEDAD
  );



    return {
      ...partido,
      isStale: desactualizado,
    };
  }),
};


return Response.json(datosActualizados, {
  headers: {
    ...obtenerCorsHeaders(request),
"Cache-Control": "no-store",
  },
});


    } catch (error) {
      console.error("Error leyendo KV:", error.message);


return Response.json(
  { error: "No se pudieron leer los marcadores" },
  {
    status: 502,
    headers: {
     ...obtenerCorsHeaders(request),
"Cache-Control": "no-store",
    },
  }
);

    }
  },

 async scheduled(event, env, ctx) {
  ctx.waitUntil(
    (async () => {
      const inicio = Date.now();

      try {
        await actualizarMarcadores(env);
      } catch (error) {
        console.error(
          "Error actualizando LIVE oficial:",
          error.message
        );
      } finally {
        console.log(
          "Duración actualización LIVE oficial:",
          ((Date.now() - inicio) / 1000).toFixed(2),
          "segundos"
        );
      }
      })()
  );
},
};