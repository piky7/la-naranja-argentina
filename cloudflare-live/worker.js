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
   *
   * Probamos distintos campos que puede utilizar
   * Flashscore según el feed.
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
   * Queremos mostrar solamente los minutos,
   * sin segundos.
   *
   * Ejemplo:
   * 05:42 → 5
   * 03:18 → 3
   * 00:47 → 0
   */
  let minutesRemaining = null;

  if (clock) {
    const match = String(clock).match(
      /^(\d{1,2})(?::\d{2})?/
    );

    if (match) {
      minutesRemaining = Number(match[1]);
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
  };
}

function detectStatus(text, timestamp) {
  const now = Math.floor(Date.now() / 1000);

  // Todavía no comenzó
  if (timestamp && now < timestamp) {
    return "scheduled";
  }

  const fields = parseFeedFields(text);

  const statusValues = fields.DI || [];

  const statusCode =
    statusValues.length
      ? statusValues[statusValues.length - 1]
      : null;

  // Flashscore indica partido terminado
  if (statusCode === "-1") {
    return "finished";
  }

  const hasHomeScore =
    /DE÷-?\d+¬/.test(text);

  const hasAwayScore =
    /DF÷-?\d+¬/.test(text);

  // Hay marcador → consideramos que está LIVE
  if (hasHomeScore && hasAwayScore) {
    return "live";
  }

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

async function getLiveMatches() {
  const eventsUrl =
    "https://raw.githubusercontent.com/piky7/la-naranja-argentina/main/lnb-events.json";

  const response = await fetch(eventsUrl, {
    headers: {
      "User-Agent": "LNA-Live-Worker",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener lnb-events.json: ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.matches)) {
    throw new Error(
      "lnb-events.json no contiene la lista de partidos."
    );
  }

  const today = getTodayArgentina();

  const now = Math.floor(Date.now() / 1000);

  /*
   * Ventana de consulta:
   *
   * - Desde 10 minutos antes del comienzo.
   * - Hasta 4 horas después del comienzo.
   *
   * El Cron sigue ejecutándose cada minuto,
   * pero fuera de esta ventana NO consultamos Flashscore.
   */
  const todayMatches = data.matches.filter(
    (match) => {
      if (!match.timestamp) {
        return false;
      }

      if (
        getArgentinaDate(match.timestamp) !== today
      ) {
        return false;
      }

      const matchTimestamp =
        Number(match.timestamp);

      const minutesUntilStart =
        (matchTimestamp - now) / 60;

      const minutesSinceStart =
        (now - matchTimestamp) / 60;

      return (
        minutesUntilStart <= 10 &&
        minutesSinceStart <= 240
      );
    }
  );

  console.log(
    `Partidos dentro de la ventana de consulta: ${todayMatches.length}`
  );

  const results = [];

  for (const match of todayMatches) {
    try {
      const feedUrl =
        `https://global.flashscore.ninja/204/x/feed/dc_1_${match.eventId}`;

      const feed =
        await getFeed(feedUrl);

      const status =
        detectStatus(
          feed,
          Number(match.timestamp)
        );

      console.log(
        `${match.homeName} - ${match.awayName}: ${status}`
      );

      /*
       * Si terminó o todavía no empezó,
       * no lo mostramos como LIVE.
       */
      if (status !== "live") {
        continue;
      }

      const liveInfo =
        parseLiveGameInfo(feed);

      results.push({
        eventId: match.eventId,

        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,

        homeName: match.homeName,
        awayName: match.awayName,

        homeScore: liveInfo.homeScore,
        awayScore: liveInfo.awayScore,

        quarter: liveInfo.quarter,
        minutesRemaining:
          liveInfo.minutesRemaining,

        timestamp: match.timestamp,

        status: "live",
        isLive: true,
      });

    } catch (error) {
      console.log(
        `Error en ${match.homeName} - ${match.awayName}: ${error.message}`
      );
    }
  }

  return results;
}

async function updateLive(env) {
  const today =
    getTodayArgentina();

  console.log(
    `Actualización LIVE: ${today}`
  );

  const liveMatches =
    await getLiveMatches();

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
    `Partidos LIVE guardados: ${liveMatches.length}`
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