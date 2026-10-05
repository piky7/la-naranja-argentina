const fs = require("fs");

const eventsFile = "lnb-events.json";
const outputFile = "live-matches.json";

const headers = {
  "x-fsign": "SW9D1eZo",

  Referer:
    "https://www.flashscore.com.ar/",

  Origin:
    "https://www.flashscore.com.ar/",

  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",

  Accept:
    "*/*",

  "Accept-Language":
    "es-AR,es;q=0.9,en;q=0.8",
};

async function getFeed(url) {
  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Flashscore respondió con ${response.status}`
    );
  }

  return await response.text();
}

function loadEvents() {
  if (!fs.existsSync(eventsFile)) {
    throw new Error(
      `No existe ${eventsFile}. Ejecutá primero discover-mids.cjs.`
    );
  }

  const data = JSON.parse(
    fs.readFileSync(eventsFile, "utf8")
  );

  if (!Array.isArray(data.matches)) {
    throw new Error(
      "lnb-events.json no contiene la lista de partidos."
    );
  }

  return data.matches;
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

function parseFeed(text) {
  const data = {};

  const fields = [
    "DA",
    "DZ",
    "DB",
    "DD",
    "AW",
    "DC",
    "DS",
    "DI",
    "DL",
    "DM",
    "DX",
  ];

  for (const field of fields) {
    const regex =
      new RegExp(`${field}÷([^¬~]*)`);

    const match =
      text.match(regex);

    if (match) {
      data[field] =
        match[1].trim();
    }
  }

  return data;
}

function parseScore(
  text,
  fallbackHome,
  fallbackAway
) {
  const homePatterns = [
    /AG÷(-?\d+)¬/,
    /AB÷(-?\d+)¬/,
  ];

  const awayPatterns = [
    /AH÷(-?\d+)¬/,
    /AC÷(-?\d+)¬/,
  ];

  let homeScore = null;
  let awayScore = null;

  for (const pattern of homePatterns) {
    const match =
      text.match(pattern);

    if (match) {
      homeScore =
        Number(match[1]);

      break;
    }
  }

  for (const pattern of awayPatterns) {
    const match =
      text.match(pattern);

    if (match) {
      awayScore =
        Number(match[1]);

      break;
    }
  }

  return {
    homeScore:
      homeScore !== null
        ? homeScore
        : fallbackHome ?? null,

    awayScore:
      awayScore !== null
        ? awayScore
        : fallbackAway ?? null,
  };
}

/*
 * Determina el estado real del partido
 * usando el horario + información del feed.
 *
 * NO usamos DI=-1 como "finalizado",
 * porque comprobamos que Flashscore
 * devuelve DI=-1 incluso para un partido
 * que todavía no comenzó.
 */
function detectStatus(
  match,
  feed
) {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  const eventTimestamp =
    Number(match.timestamp);

  /*
   * Si el partido todavía está en el futuro,
   * necesariamente está programado.
   */
  if (
    eventTimestamp &&
    now < eventTimestamp
  ) {
    return "scheduled";
  }

  /*
   * Si tenemos marcador explícito en el feed,
   * consideramos que hay actividad de partido.
   */
  const hasHomeScore =
    /AG÷-?\d+¬/.test(feed) ||
    /AB÷-?\d+¬/.test(feed);

  const hasAwayScore =
    /AH÷-?\d+¬/.test(feed) ||
    /AC÷-?\d+¬/.test(feed);

  if (
    hasHomeScore &&
    hasAwayScore
  ) {
    return "live";
  }

  /*
   * DS puede indicar información de estado
   * adicional del evento.
   *
   * No lo usamos todavía para declarar LIVE
   * por sí solo.
   */

  /*
   * Si el horario ya pasó pero no tenemos
   * datos de juego, dejamos el estado como
   * "unknown" en vez de inventar que terminó.
   */
  return "unknown";
}

async function checkMatch(match) {
  const matchUrl =
    `https://global.flashscore.ninja/204/x/feed/dc_1_${match.eventId}`;

  try {
    const text =
      await getFeed(matchUrl);

    console.log(
      `   Feed recibido: ${text.length} caracteres`
    );

    const feed =
      parseFeed(text);

    console.log(
      `   DI: ${feed.DI ?? "—"}`
    );

    console.log(
      `   DS: ${feed.DS ?? "—"}`
    );

    console.log(
      `   DD: ${feed.DD ?? "—"}`
    );

    console.log(
      `   DC: ${feed.DC ?? "—"}`
    );

    const score =
      parseScore(
        text,
        null,
        null
      );

    const status =
      detectStatus(
        match,
        text
      );

    /*
     * Si no hay marcador en el feed,
     * NO utilizamos el marcador viejo
     * para declarar que está jugando.
     */
    return {
      eventId:
        match.eventId,

      homeTeam:
        match.homeTeam,

      awayTeam:
        match.awayTeam,

      homeName:
        match.homeName,

      awayName:
        match.awayName,

      homeScore:
        score.homeScore,

      awayScore:
        score.awayScore,

      timestamp:
        match.timestamp,

      status,

      isLive:
        status === "live",

      feedStatus:
        feed.DI ?? null,

      feedScoreStatus:
        feed.DS ?? null,
    };
  } catch (error) {
    return {
      eventId:
        match.eventId,

      homeTeam:
        match.homeTeam,

      awayTeam:
        match.awayTeam,

      homeName:
        match.homeName,

      awayName:
        match.awayName,

      homeScore:
        null,

      awayScore:
        null,

      timestamp:
        match.timestamp,

      status:
        "error",

      isLive:
        false,

      error:
        error.message,
    };
  }
}

async function main() {
  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "DETECTOR LIVE LNB"
  );

  console.log(
    "========================================"
  );

  console.log("");

  const matches =
    loadEvents();

  const today =
    getTodayArgentina();

  console.log(
    `Fecha Argentina: ${today}`
  );

  console.log("");

  const todayMatches =
    matches.filter(
      (match) => {
        if (
          !match.timestamp
        ) {
          return false;
        }

        return (
          getArgentinaDate(
            match.timestamp
          ) === today
        );
      }
    );

  console.log(
    `Partidos de hoy: ${todayMatches.length}`
  );

  console.log("");

  const results = [];

  for (
    const match of todayMatches
  ) {
    console.log(
      `Revisando: ${match.homeName} - ${match.awayName}`
    );

    console.log(
      `   Event ID: ${match.eventId}`
    );

    const result =
      await checkMatch(
        match
      );

    results.push(
      result
    );

    if (
      result.status ===
      "scheduled"
    ) {
      console.log(
        "   🟡 Programado"
      );
    } else if (
      result.status ===
      "live"
    ) {
      console.log(
        "   🔴 EN VIVO"
      );

      console.log(
        `   Marcador: ${result.homeScore}-${result.awayScore}`
      );
    } else if (
      result.status ===
      "unknown"
    ) {
      console.log(
        "   ⚪ Estado todavía no identificado"
      );
    } else if (
      result.status ===
      "error"
    ) {
      console.log(
        `   ⚠️ Error: ${result.error}`
      );
    }

    console.log("");
  }

  const liveMatches =
    results.filter(
      (match) =>
        match.isLive
    );

  const output = {
    updatedAt:
      new Date().toISOString(),

    date:
      today,

    liveMatches,
  };

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      output,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    "========================================"
  );

  console.log(
    "RESULTADO LIVE"
  );

  console.log(
    "========================================"
  );

  console.log("");

  if (
    liveMatches.length === 0
  ) {
    console.log(
      "🟢 No hay partidos en vivo."
    );
  } else {
    console.log(
      `🔴 Partidos en vivo: ${liveMatches.length}`
    );

    console.log("");

    liveMatches.forEach(
      (match) => {
        console.log(
          `🔴 ${match.homeName} - ${match.awayName}`
        );

        console.log(
          `   Marcador: ${match.homeScore}-${match.awayScore}`
        );

        console.log(
          `   Event ID: ${match.eventId}`
        );

        console.log("");
      }
    );
  }

  console.log(
    "========================================"
  );

  console.log(
    `Archivo generado: ${outputFile}`
  );

  console.log(
    "========================================"
  );

  console.log("");
}

main().catch(
  (error) => {
    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "ERROR DETECTOR LIVE"
    );

    console.error(
      "========================================"
    );

    console.error("");

    console.error(
      error.message
    );

    console.error("");

    process.exit(1);
  }
);