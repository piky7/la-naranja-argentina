const EVENTS_URL =
  "https://global.flashscore.ninja/204/x/feed/df_sport_basketball_6";

const HEADERS = {
  "x-fsign": "SW9D1eZo",
  Referer: "https://www.flashscore.com.ar/",
  Origin: "https://www.flashscore.com.ar/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

/*
 * El cron sigue ejecutándose cada minuto.
 *
 * Sin embargo, si solamente cambia el reloj del partido,
 * KV se actualiza como máximo una vez cada 2 minutos.
 *
 * Los cambios importantes (marcador, cuarto, aparición,
 * finalización, etc.) se guardan inmediatamente.
 */
const CLOCK_WRITE_INTERVAL_MS =
  2 * 60 * 1000;

  
const PUBLISHED_MATCHES_URL =
  "https://lanaranjaargentina.lnab.workers.dev/published-matches.json";

async function getPublishedMatches() {
  try {
    const response = await fetch(PUBLISHED_MATCHES_URL, {
      headers: {
        Accept: "application/json",
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    if (!response.ok) {
      console.log(
        `No se pudo comprobar la publicación: HTTP ${response.status}`
      );
      return null;
    }

    const data = await response.json();

    if (!data || typeof data.matches !== "object") {
      return null;
    }

    return data.matches;
  } catch (error) {
    console.log(
      "Error consultando partidos publicados:",
      error.message
    );
    return null;
  }
}


function isMatchPublished(match, publishedMatches) {
  if (
    !publishedMatches ||
    !match ||
    match.status !== "finished"
  ) {
    return false;
  }

  const timestamp = Number(match.timestamp);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }

  const date = getArgentinaDate(timestamp);

  const key =
    `${date}-${match.homeTeam}-${match.awayTeam}`;

  const published = publishedMatches[key];

  return (
    published?.status === "published" &&
    published.hasStats === true &&
    published.homeTeam === match.homeTeam &&
    published.awayTeam === match.awayTeam &&
    Number(published.homeScore) ===
      Number(match.homeScore) &&
    Number(published.awayScore) ===
      Number(match.awayScore) &&
    match.homeScore != null &&
    match.awayScore != null
  );
}



function getArgentinaDate(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function getTodayArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseFeedFields(text) {
  const fields = {};
  const parts = text.split("¬");

  for (const part of parts) {
    const separator = part.indexOf("÷");

    if (separator === -1) continue;

    const key = part
      .slice(0, separator)
      .replace(/^~/, "");

    const value = part.slice(separator + 1);

    if (!key) continue;

    if (!fields[key]) {
      fields[key] = [];
    }

    fields[key].push(value);
  }

  return fields;
}

function parseEvents(text) {
  const events = [];

  const blocks = text.split("¬~");

  for (const block of blocks) {
    const fields = parseFeedFields(block);

    const eventId =
      fields.EI?.[0] ||
      fields.KO?.[0] ||
      fields.ID?.[0];

    if (!eventId) continue;

    const timestamp =
      Number(fields.AD?.[0]) ||
      Number(fields.DA?.[0]) ||
      Number(fields.AB?.[0]);

    if (!timestamp) continue;

    events.push({
      eventId,
      timestamp,
      raw: block,
    });
  }

  return events;
}

function parseLiveGameInfo(text) {
  const fields = parseFeedFields(text);

  /*
   * Marcador
   */
  const homeValues = fields.DE || [];
  const awayValues = fields.DF || [];

  const homeScore = homeValues.length
    ? Number(homeValues[homeValues.length - 1])
    : null;

  const awayScore = awayValues.length
    ? Number(awayValues[awayValues.length - 1])
    : null;

  /*
   * Período / cuarto.
   */
  const period =
    fields.QT?.[fields.QT.length - 1] ||
    fields.PS?.[fields.PS.length - 1] ||
    fields.PE?.[fields.PE.length - 1] ||
    null;

  /*
   * Reloj del partido.
   */
  const clock =
    fields.TM?.[fields.TM.length - 1] ||
    fields.TS?.[fields.TS.length - 1] ||
    fields.CL?.[fields.CL.length - 1] ||
    null;

  let quarter = null;

  if (period) {
    const numericPeriod = Number(period);

    if (
      Number.isFinite(numericPeriod) &&
      numericPeriod >= 1 &&
      numericPeriod <= 4
    ) {
      quarter = numericPeriod;
    }
  }

  /*
   * Detectamos el entretiempo.
   *
   * Flashscore puede dejar el cuarto en 2
   * pero dejar de enviar un reloj de juego.
   *
   * Si estamos en el segundo cuarto y no existe
   * reloj disponible, lo tratamos como entretiempo.
   */
  const isHalftime =
    quarter === 2 &&
    !clock;

  /*
   * Mostramos solamente los minutos.
   *
   * 05:42 → 5
   * 03:18 → 3
   * 00:47 → 0
   */
  let minutesRemaining = null;

  if (clock) {
    const clockMatch = String(clock).match(
      /^(\d{1,2})(?::\d{2})?/
    );

    if (clockMatch) {
      minutesRemaining = Number(clockMatch[1]);
    }
  }

  return {
    homeScore: Number.isFinite(homeScore)
      ? homeScore
      : null,

    awayScore: Number.isFinite(awayScore)
      ? awayScore
      : null,

    quarter,

    minutesRemaining,

    isHalftime,
  };
}

function detectStatus(text, timestamp) {
  const now = Math.floor(Date.now() / 1000);

  /*
   * Todavía no comenzó.
   */
  if (timestamp && now < timestamp) {
    return "scheduled";
  }

  const fields = parseFeedFields(text);

  /*
   * Código de estado de Flashscore.
   */
  const statusValues = fields.DI || [];

  const statusCode =
    statusValues.length
      ? statusValues[statusValues.length - 1]
      : null;

  /*
   * Flashscore indica partido terminado.
   */
  if (statusCode === "-1") {
    return "finished";
  }

  /*
   * Marcador obtenido desde los campos
   * parseados del feed.
   */
  const homeValues = fields.DE || [];
  const awayValues = fields.DF || [];

  const homeScore =
    homeValues.length
      ? Number(homeValues[homeValues.length - 1])
      : null;

  const awayScore =
    awayValues.length
      ? Number(awayValues[awayValues.length - 1])
      : null;

  const hasHomeScore =
    Number.isFinite(homeScore);

  const hasAwayScore =
    Number.isFinite(awayScore);

  /*
   * Si ambos equipos tienen marcador,
   * consideramos que el partido está LIVE.
   *
   * Esto también permite que el partido
   * siga siendo LIVE durante el entretiempo,
   * cuando Flashscore puede dejar de enviar
   * temporalmente el reloj.
   */
  if (hasHomeScore && hasAwayScore) {
    return "live";
  }

  /*
   * Si ya comenzó pero Flashscore no entregó
   * momentáneamente toda la información.
   */
  return "unknown";
}

async function getFeed(url) {
  const response = await fetch(url, {
    headers: HEADERS,
  });

  if (!response.ok) {
    throw new Error(
      `Flashscore respondió con ${response.status}`
    );
  }

  return await response.text();
}


async function getLiveMatches(previousLiveMatches = []) {
  const eventsUrl =
    "https://raw.githubusercontent.com/piky7/la-naranja-argentina/main/lnb-events.json";

  const response = await fetch(eventsUrl, {
    headers: {
      "User-Agent": "LNA-Live-Worker",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Error cargando eventos: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.matches)) {
    throw new Error("Formato inválido de lnb-events.json");
  }

  const today = getTodayArgentina();
  const now = Math.floor(Date.now() / 1000);

  // Si falla la comprobación de publicación,
  // conservamos los partidos en lugar de eliminarlos.
  const publishedMatches = await getPublishedMatches();

  const results = [];
  const processedEventIds = new Set();

  const candidates = new Map();

  // Partidos del día que pueden estar en juego.
  for (const match of data.matches) {
    const timestamp = Number(match.timestamp);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      continue;
    }

    if (
      getArgentinaDate(timestamp) === today &&
      (timestamp - now) / 60 <= 10 &&
      (now - timestamp) / 60 <= 240
    ) {
      candidates.set(String(match.eventId), match);
    }
  }

  // Los partidos que ya estaban en el LIVE no deben
  // desaparecer simplemente por pasar las 4 horas.
  for (const previous of previousLiveMatches) {
    const id = String(previous.eventId);

    if (!candidates.has(id)) {
      candidates.set(id, previous);
    }
  }

  for (const match of candidates.values()) {
    const eventId = String(match.eventId);

    if (processedEventIds.has(eventId)) {
      continue;
    }

    processedEventIds.add(eventId);

    const previous = previousLiveMatches.find(
      (item) => String(item.eventId) === eventId
    );

    // Solo se retira cuando el resultado y las
    // estadísticas figuran en la web publicada.
    

    try {
      const feed = await getFeed(
        `https://global.flashscore.ninja/204/x/feed/dc_1_${eventId}`
      );

      const status = detectStatus(
        feed,
        Number(match.timestamp)
      );

      if (status === "scheduled") {
        if (previous) {
          results.push(previous);
        }
        continue;
      }

      if (status === "unknown") {
        if (previous) {
          results.push(previous);
        }
        continue;
      }

      const liveInfo = parseLiveGameInfo(feed);

      const isFinished =
        status === "finished" ||
        previous?.status === "finished";

      // Si ya estaba finalizado, no retrocedemos
      // a EN VIVO por una respuesta inconsistente.
      const finalStatus = isFinished
        ? "finished"
        : "live";

      const homeScore =
        liveInfo.homeScore ?? previous?.homeScore ?? null;

      const awayScore =
        liveInfo.awayScore ?? previous?.awayScore ?? null;

      // No publicamos un marcador vacío.
      if (homeScore === null || awayScore === null) {
        if (previous) {
          results.push(previous);
        }
        continue;
      }

      
const updatedMatch = {
  eventId: match.eventId,
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  homeName: match.homeName,
  awayName: match.awayName,
  homeScore,
  awayScore,
  quarter: isFinished ? null : liveInfo.quarter,
  minutesRemaining: isFinished
    ? null
    : liveInfo.minutesRemaining,
  isHalftime: isFinished
    ? false
    : liveInfo.isHalftime,
  timestamp: match.timestamp,
  status: finalStatus,
  isLive: !isFinished,
};

// Comprobamos la publicación únicamente después
// de conocer el estado y marcador más recientes.
if (isMatchPublished(updatedMatch, publishedMatches)) {
  console.log(
    `Partido finalizado y publicado: ${eventId}`
  );
  continue;
}

// Mientras no esté publicado, permanece en LIVE.
results.push(updatedMatch);

    } catch (error) {
      console.log(
        `Error consultando partido ${eventId}:`,
        error.message
      );

      // Si Flashscore falla, conservamos
      // el último estado conocido.
      if (previous) {
        results.push(previous);
      }
    }
  }

  return results;
}


/*
 * Compara solamente el estado importante
 * del partido.
 *
 * minutesRemaining queda fuera deliberadamente.
 *
 * isHalftime sí forma parte del estado importante.
 *
 * De esta forma:
 *
 * 45 - 44 / Q2 / 5 min
 * 45 - 44 / Q2 / 4 min
 *
 * se consideran el mismo estado importante.
 *
 * Pero:
 *
 * 45 - 44 / Q2 / ENTRETIEMPO
 *
 * es un cambio importante.
 */
function liveMatchStatesAreEqual(
  first,
  second
) {
  if (!Array.isArray(first)) {
    return false;
  }

  if (!Array.isArray(second)) {
    return false;
  }

  if (first.length !== second.length) {
    return false;
  }

  const normalize = (matches) =>
    [...matches]
      .map((match) => ({
        eventId: match.eventId,

        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,

        homeName: match.homeName,
        awayName: match.awayName,

        homeScore: match.homeScore,
        awayScore: match.awayScore,

        quarter: match.quarter,

        isHalftime:
          match.isHalftime || false,

        timestamp: match.timestamp,

        status: match.status,
        isLive: match.isLive,
      }))
      .sort((a, b) =>
        String(a.eventId).localeCompare(
          String(b.eventId)
        )
      );

  return (
    JSON.stringify(normalize(first)) ===
    JSON.stringify(normalize(second))
  );
}

/*
 * Detecta si solamente cambió el reloj.
 */
function liveMatchClocksAreDifferent(
  first,
  second
) {
  if (!Array.isArray(first)) {
    return true;
  }

  if (!Array.isArray(second)) {
    return true;
  }

  if (first.length !== second.length) {
    return true;
  }

  const firstMap = new Map(
    first.map((match) => [
      String(match.eventId),
      match.minutesRemaining,
    ])
  );

  for (const match of second) {
    const previousClock =
      firstMap.get(
        String(match.eventId)
      );

    if (
      previousClock !==
      match.minutesRemaining
    ) {
      return true;
    }
  }

  return false;
}

async function updateLive(env) {
  const today =
    getTodayArgentina();

  console.log(
    `Actualización LIVE: ${today}`
  );

  /*
   * Primero leemos lo que ya tenemos guardado.
   */
  let previousData = null;

  try {
    const storedData =
      await env.LNA_LIVE.get(
        "live-matches"
      );

    if (storedData) {
      previousData =
        JSON.parse(storedData);
    }
  } catch (error) {
    console.log(
      `Error leyendo LIVE anterior: ${error.message}`
    );
  }

  const previousLiveMatches =
  Array.isArray(previousData?.liveMatches)
    ? previousData.liveMatches
    : [];

  let liveMatches;

  try {
    liveMatches =
      await getLiveMatches(
        previousLiveMatches
      );
  } catch (error) {
    /*
     * Si falla completamente la consulta,
     * NO sobrescribimos KV con [].
     */
    console.log(
      `Error actualizando LIVE: ${error.message}`
    );

    console.log(
      "Se conserva el LIVE anterior."
    );

    return;
  }

  /*
   * PRIMER CASO:
   *
   * No existe información anterior.
   *
   * Hay que guardar el estado inicial.
   */
  if (
    !previousData ||
    previousData.date !== today
  ) {
    const output = {
      updatedAt:
        new Date().toISOString(),

      date: today,

      liveMatches,
    };

    await env.LNA_LIVE.put(
      "live-matches",
      JSON.stringify(output)
    );

    console.log(
      `Primera actualización LIVE guardada. Partidos LIVE: ${liveMatches.length}`
    );

    return;
  }

  /*
   * SEGUNDO CASO:
   *
   * Cambió algo importante:
   *
   * - apareció un partido
   * - desapareció un partido
   * - cambió el marcador
   * - cambió el cuarto
   * - comenzó o terminó el entretiempo
   * - terminó un partido
   *
   * En estos casos escribimos inmediatamente.
   */
  const importantStateChanged =
    !liveMatchStatesAreEqual(
      previousLiveMatches,
      liveMatches
    );

  if (importantStateChanged) {
    const output = {
      updatedAt:
        new Date().toISOString(),

      date: today,

      liveMatches,
    };

    await env.LNA_LIVE.put(
      "live-matches",
      JSON.stringify(output)
    );

    console.log(
      `Cambio importante LIVE. KV actualizado. Partidos LIVE: ${liveMatches.length}`
    );

    return;
  }

  /*
   * TERCER CASO:
   *
   * El marcador y el estado son iguales,
   * pero cambió únicamente el reloj.
   */
  const clockChanged =
    liveMatchClocksAreDifferent(
      previousLiveMatches,
      liveMatches
    );

  /*
   * Si tampoco cambió el reloj,
   * no hacemos absolutamente nada.
   */
  if (!clockChanged) {
    console.log(
      `Sin cambios LIVE. No se escribe en KV. Partidos LIVE: ${liveMatches.length}`
    );

    return;
  }

  /*
   * El reloj cambió.
   *
   * Comprobamos cuándo fue la última escritura.
   */
  const lastWriteTime =
    previousData.updatedAt
      ? new Date(
          previousData.updatedAt
        ).getTime()
      : 0;

  const now =
    Date.now();

  const timeSinceLastWrite =
    now - lastWriteTime;

  /*
   * Si todavía no pasaron 2 minutos,
   * NO escribimos solamente por el reloj.
   */
  if (
    timeSinceLastWrite <
    CLOCK_WRITE_INTERVAL_MS
  ) {
    console.log(
      `Solo cambió el reloj. No se escribe todavía. Próxima actualización de reloj en ${Math.max(
        0,
        Math.ceil(
          (
            CLOCK_WRITE_INTERVAL_MS -
            timeSinceLastWrite
          ) / 1000
        )
      )} segundos.`
    );

    return;
  }

  /*
   * Ya pasaron 2 minutos.
   *
   * Guardamos el nuevo reloj.
   */
  const output = {
    updatedAt:
      new Date().toISOString(),

    date: today,

    liveMatches,
  };

  await env.LNA_LIVE.put(
    "live-matches",
    JSON.stringify(output)
  );

  console.log(
    `Actualización periódica del reloj. KV actualizado. Partidos LIVE: ${liveMatches.length}`
  );
}

export default {
  async scheduled(event, env) {
    await updateLive(env);
  },

  async fetch(request, env) {
    const url =
      new URL(request.url);

    /*
     * API pública que consume la web LNA.
     */
    if (
      url.pathname === "/api/live"
    ) {
      const data =
        await env.LNA_LIVE.get(
          "live-matches"
        );

      return new Response(
        data ||
          JSON.stringify({
            updatedAt: null,

            date:
              getTodayArgentina(),

            liveMatches: [],
          }),
        {
          headers: {
            "Content-Type":
              "application/json",

            "Access-Control-Allow-Origin":
              "*",

            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * Ruta principal del Worker.
     */
    return new Response(
      "LNA Live Worker funcionando",
      {
        status: 200,
      }
    );
  },
};