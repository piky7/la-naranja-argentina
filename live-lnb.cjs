const fs = require("fs");

const eventsFile = "lnb-events.json";
const outputFile = "src/data/live-matches.json";

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

const MAX_MATCH_DURATION = 4 * 60 * 60;

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
  const fields = {};

  const parts = text.split("¬");

  for (const part of parts) {
    const separator =
      part.indexOf("÷");

    if (separator === -1) {
      continue;
    }

    const key = part
      .slice(0, separator)
      .replace(/^~/, "");

    const value =
      part.slice(separator + 1);

    if (!key) {
      continue;
    }

    if (!fields[key]) {
      fields[key] = [];
    }

    fields[key].push(value);
  }

  const homeValues =
    fields.DE || [];

  const awayValues =
    fields.DF || [];

  const homeScore =
    homeValues.length
      ? Number(
          homeValues[
            homeValues.length - 1
          ]
        )
      : fallbackHome ?? null;

  const awayScore =
    awayValues.length
      ? Number(
          awayValues[
            awayValues.length - 1
          ]
        )
      : fallbackAway ?? null;

  return {
    homeScore:
      Number.isFinite(homeScore)
        ? homeScore
        : fallbackHome ?? null,

    awayScore:
      Number.isFinite(awayScore)
        ? awayScore
        : fallbackAway ?? null,
  };
}

/*
 * Determina el estado real del partido.
 */
function detectStatus(match, feed) {
  const now = Math.floor(Date.now() / 1000);
  const eventTimestamp = Number(match.timestamp);

  // Partido que todavía no comenzó.
  if (eventTimestamp && now < eventTimestamp) {
    return "scheduled";
  }

  // Estado de finalización confirmado por el feed.
  const finalizado = /(?:^|[¬~])DI÷-1(?:[¬~]|$)/.test(feed);

  if (finalizado) {
    return "finished";
  }

  // Marcadores disponibles.
  const hasHomeScore = /(?:^|[¬~])DE÷\d+(?:[¬~]|$)/.test(feed);
  const hasAwayScore = /(?:^|[¬~])DF÷\d+(?:[¬~]|$)/.test(feed);

  if (hasHomeScore && hasAwayScore) {
    return "live";
  }

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

function shouldCheckMatch(match) {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  const timestamp =
    Number(match.timestamp);

  if (!timestamp) {
    return false;
  }

  /*
   * No consultar partidos que
   * todavía no comenzaron.
   */
  if (now < timestamp) {
    return false;
  }

  /*
   * No consultar partidos que
   * comenzaron hace más de 4 horas.
   */
  if (
    now >
    timestamp + MAX_MATCH_DURATION
  ) {
    return false;
  }

  return true;
}

function loadExistingLive() {
  if (!fs.existsSync(outputFile)) {
    return [];
  }

  try {
    const data =
      JSON.parse(
        fs.readFileSync(
          outputFile,
          "utf8"
        )
      );

    return Array.isArray(
      data.liveMatches
    )
      ? data.liveMatches
      : [];
  } catch {
    return [];
  }
}

function saveLiveMatches(
  liveMatches,
  today
) {
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
        if (!match.timestamp) {
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

  /*
   * Solo revisamos partidos
   * que podrían estar en vivo.
   */
  const matchesToCheck =
    todayMatches.filter(
      shouldCheckMatch
    );

  console.log(
    `Partidos que requieren consulta: ${matchesToCheck.length}`
  );

  console.log("");


if (
  matchesToCheck.length === 0
) {
  console.log(
    "🟢 No hay partidos dentro de la ventana LIVE."
  );

  console.log(
    "No se consulta Flashscore."
  );

  const existingLive = loadExistingLive();

  if (existingLive.length > 0) {
    saveLiveMatches([], today);

    console.log(
      "🧹 LIVE anterior eliminado."
    );
  } else {
    console.log(
      "No hay LIVE anterior para limpiar."
    );
  }

  console.log(
    "========================================"
  );

  return;
}


  const results = [];

  for (
    const match of matchesToCheck
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
        "   ⚪ Sin actividad LIVE detectada"
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

  const existingLive =
    loadExistingLive();

  /*
   * Si no hay LIVE y tampoco había
   * un LIVE anterior, no escribimos nada.
   *
   * Esto evita generar commits
   * innecesarios cada minuto.
   */
  if (
    liveMatches.length === 0 &&
    existingLive.length === 0
  ) {
    console.log(
      "🟢 No hay partidos en vivo."
    );

    console.log(
      "No se modifica live-matches.json."
    );
  } else {
    /*
     * Si había un partido LIVE y ahora
     * terminó, limpiamos el archivo.
     *
     * Si sigue LIVE, actualizamos.
     */
    saveLiveMatches(
      liveMatches,
      today
    );

    if (
      liveMatches.length === 0
    ) {
      console.log(
        "⚪ No hay partidos en vivo."
      );

      console.log(
        "🧹 Se limpió live-matches.json."
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
  }

  console.log(
    "========================================"
  );

  console.log(
    "FIN UPDATE LIVE"
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
