const fs = require("fs");

const eventId = process.argv[2];

if (!eventId) {
  console.error("");
  console.error("ERROR:");
  console.error("Tenés que indicar un event ID.");
  console.error("");
  console.error("Ejemplo:");
  console.error("node auto-flashscore.cjs ATkHsGgL");
  console.error("");

  process.exit(1);
}

const eventsFile = "lnb-events.json";

function loadMatch() {
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

  const match = data.matches.find(
    (item) => item.eventId === eventId
  );

  if (!match) {
    throw new Error(
      `No se encontró el Event ID ${eventId} en lnb-events.json.`
    );
  }

  return match;
}

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

function extractOgTitle(page) {
  const match = page.match(
    /<meta property="og:title" content="([^"]+)"/
  );

  if (!match) {
    throw new Error(
      "No se encontró og:title."
    );
  }

  return match[1];
}

function parseMatchFromTitle(title, fallbackHome, fallbackAway) {
  const match = title.match(
    /^(.+?)\s+-\s+(.+?)\s+(-?\d+)-(-?\d+)$/
  );

  if (match) {
    return {
      homeTeam: match[1],
      awayTeam: match[2],
      homeScore: Number(match[3]),
      awayScore: Number(match[4]),
    };
  }

  /*
   * Durante un partido en vivo Flashscore puede
   * devolver og:title sin marcador.
   *
   * En ese caso usamos los nombres descubiertos
   * previamente en lnb-events.json.
   */

  const teamsOnly = title.match(
    /^(.+?)\s+-\s+(.+?)$/
  );

  if (teamsOnly) {
    return {
      homeTeam: teamsOnly[1],
      awayTeam: teamsOnly[2],
      homeScore: fallbackHome,
      awayScore: fallbackAway,
    };
  }

  return {
    homeTeam: fallbackHome,
    awayTeam: fallbackAway,
    homeScore: 0,
    awayScore: 0,
  };
}


/* =========================================
   PARSER DEL FEED DE PARTIDO
   ========================================= */

function parseFeedFields(text) {
  const fields = {};

  const parts = text.split("¬");

  for (const part of parts) {
    const separator = part.indexOf("÷");

    if (separator === -1) {
      continue;
    }

    const key = part
      .slice(0, separator)
      .replace(/^~/, "");

    const value = part.slice(separator + 1);

    if (!key) {
      continue;
    }

    if (!fields[key]) {
      fields[key] = [];
    }

    fields[key].push(value);
  }

  return fields;
}


/* =========================================
   ESTADO DEL PARTIDO
   ========================================= */

function parseStatus(text) {
  const fields = parseFeedFields(text);

  const statusValues = fields.DI || [];

  if (!statusValues.length) {
    return "unknown";
  }

  const statusCode =
    statusValues[statusValues.length - 1];

  /*
   * En el feed observado:
   *
   * DI÷6
   * DI÷7
   *
   * cambia mientras el partido está en curso.
   */

  if (statusCode === "-1") {
    return "finished";
  }

  return "live";
}


/* =========================================
   MARCADOR EN VIVO
   ========================================= */

function parseLiveScore(text, fallbackHome = 0, fallbackAway = 0) {
  const fields = parseFeedFields(text);

  const homeValues = fields.DE || [];
  const awayValues = fields.DF || [];

  const homeScore =
    homeValues.length
      ? Number(homeValues[homeValues.length - 1])
      : fallbackHome;

  const awayScore =
    awayValues.length
      ? Number(awayValues[awayValues.length - 1])
      : fallbackAway;

  return {
    homeScore:
      Number.isFinite(homeScore)
        ? homeScore
        : fallbackHome,

    awayScore:
      Number.isFinite(awayScore)
        ? awayScore
        : fallbackAway,
  };
}


/* =========================================
   PARCIALES POR CUARTO
   ========================================= */


function parseQuarterScores(text) {
  const fields = parseFeedFields(text);

  const quarterPairs = [
    ["1", "BA", "BB"],
    ["2", "BC", "BD"],
    ["3", "BE", "BF"],
    ["4", "BG", "BH"],
    ["PR", "BI", "BJ"],
  ];

  const quarters = [];

  for (const [period, homeKey, awayKey] of quarterPairs) {
    const homeValue = fields[homeKey]?.at(-1);
    const awayValue = fields[awayKey]?.at(-1);

    if (
      homeValue === undefined ||
      awayValue === undefined ||
      homeValue === "" ||
      awayValue === ""
    ) {
      continue;
    }

    const home = Number(homeValue);
    const away = Number(awayValue);

    if (
      !Number.isFinite(home) ||
      !Number.isFinite(away)
    ) {
      continue;
    }

    quarters.push({
      period,
      home,
      away,
    });
  }

  return quarters;
}



/* =========================================
   TV
   ========================================= */

function parseTv(text) {
  if (
    text.includes("tycsports.com") ||
    text.includes("TyC Sports")
  ) {
    return ["TyC Sports"];
  }

  if (
    text.includes("DSports") ||
    text.includes("DirectTV")
  ) {
    return ["DSports"];
  }

  return [];
}


/* =========================================
   JUGADORES
   ========================================= */

function parsePlayers(text) {
  const players = [];

  const generalStart =
    text.indexOf("PA÷General");

  if (generalStart === -1) {
    throw new Error(
      "No se encontró el bloque General de jugadores."
    );
  }

  const nextSectionStart =
    text.indexOf(
      "¬~PA÷",
      generalStart +
        "PA÷General".length
    );

  let generalBlock;

  if (nextSectionStart === -1) {
    generalBlock = text.slice(generalStart);
  } else {
    generalBlock = text.slice(
      generalStart,
      nextSectionStart
    );
  }

  const playerBlocks =
    generalBlock.split("~PJ÷");

  for (
    const block of playerBlocks.slice(1)
  ) {
    const playerNameEnd =
      block.indexOf("¬");

    if (playerNameEnd === -1) {
      continue;
    }

    const name =
      block.slice(0, playerNameEnd);

    const statsMatch =
      block.match(/¬PC÷([^¬~]+)/);

    if (!statsMatch) {
      continue;
    }

    const values =
      statsMatch[1].split("|");

    const points =
      values[0] === "-"
        ? 0
        : Number(values[0]);

    const rebounds =
      values[1] === "-"
        ? 0
        : Number(values[1]);

    const assists =
      values[2] === "-"
        ? 0
        : Number(values[2]);

    const minutes =
      values[3] || null;

    const teamMatch =
      block.match(/¬PN÷([^¬~]+)/);

    const teamCode =
      teamMatch
        ? teamMatch[1]
        : null;

    const playerUrlMatch =
      block.match(
        /¬PK÷\/jugador\/([^¬]+)/
      );

    const flashscoreSlug =
      playerUrlMatch
        ? playerUrlMatch[1]
        : null;

    players.push({
      name,
      teamCode,
      flashscoreSlug,
      points,
      rebounds,
      assists,
      minutes,
    });
  }

  return players;
}


/* =========================================
   MAIN
   ========================================= */

async function main() {
  try {
    console.log(
      "========================================"
    );

    console.log(
      "EXTRACTOR AUTOMÁTICO FLASHSCORE"
    );

    console.log(
      "========================================"
    );

    console.log("");

    console.log(
      `Event ID: ${eventId}`
    );

    console.log("");

    const discoveredMatch =
      loadMatch();

    console.log(
      `Partido detectado: ${discoveredMatch.homeName} - ${discoveredMatch.awayName}`
    );

    console.log("");

    if (
      !discoveredMatch.homeSlug ||
      !discoveredMatch.homeId ||
      !discoveredMatch.awaySlug ||
      !discoveredMatch.awayId
    ) {
      throw new Error(
        "El partido no contiene los datos necesarios para construir la URL de Flashscore."
      );
    }

    const matchPageUrl =
      `https://www.flashscore.com.ar/partido/basquetbol/${discoveredMatch.awaySlug}-${discoveredMatch.awayId}/${discoveredMatch.homeSlug}-${discoveredMatch.homeId}/?mid=${eventId}`;

    console.log(
      "URL del partido:"
    );

    console.log(matchPageUrl);

    console.log("");

    console.log(
      "Descargando página principal..."
    );

    const page =
      await getFeed(matchPageUrl);

    console.log(
      `Página: ${page.length} caracteres`
    );

    console.log("");

    const title =
      extractOgTitle(page);

    const match =
  parseMatchFromTitle(
    title,
    discoveredMatch.homeName,
    discoveredMatch.awayName
  );

    console.log(
      `Partido: ${match.homeTeam} - ${match.awayTeam}`
    );

    console.log(
      `Resultado base: ${match.homeScore}-${match.awayScore}`
    );

    console.log("");

    const playersUrl =
  `https://global.flashscore.ninja/204/x/feed/df_psn_1_${eventId}`;

const matchUrl =
  `https://global.flashscore.ninja/204/x/feed/dc_1_${eventId}`;

const quartersUrl =
  `https://global.flashscore.ninja/204/x/feed/df_sur_1_${eventId}`;

const tvUrl =
  `https://global.flashscore.ninja/204/x/feed/df_dos_1_${eventId}_`;

    console.log(
      "Descargando feeds..."
    );

    const [
  playersText,
  matchText,
  quartersText,
  tvText,
] = await Promise.all([
  getFeed(playersUrl),
  getFeed(matchUrl),
  getFeed(quartersUrl),
  getFeed(tvUrl),
]);

    console.log(
      `Feed jugadores: ${playersText.length} caracteres`
    );

    console.log(
      `Feed partido: ${matchText.length} caracteres`
    );

    console.log(
  `Feed parciales: ${quartersText.length} caracteres`
);
console.log("");
console.log("========================================");
console.log("FEED PARCIALES RAW");
console.log("========================================");
console.log(quartersText);
console.log("========================================");
console.log("");
    console.log(
      `Feed TV: ${tvText.length} caracteres`
    );

    console.log("");
console.log("========================================");
console.log("FEED PARTIDO RAW");
console.log("========================================");
console.log(matchText);
console.log("========================================");
console.log("");

    console.log("");

    const status =
      parseStatus(matchText);

    const liveScore =
      parseLiveScore(
        matchText,
        match.homeScore,
        match.awayScore
      );

    const quarterScores =
  parseQuarterScores(quartersText);

    const players =
  playersText.length > 20
    ? parsePlayers(playersText)
    : [];

    const tv =
      parseTv(tvText);

    const result = {
      eventId,

      homeTeam:
        match.homeTeam,

      awayTeam:
        match.awayTeam,

      homeScore:
        liveScore.homeScore,

      awayScore:
        liveScore.awayScore,

      status,

      quarterScores,

      tv,

      players,
    };

    console.log(
      "========================================"
    );

    console.log(
      "RESULTADO AUTOMÁTICO"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Event ID: ${result.eventId}`
    );

    console.log(
      `Local: ${result.homeTeam}`
    );

    console.log(
      `Visitante: ${result.awayTeam}`
    );

    console.log(
      `Resultado: ${result.homeScore}-${result.awayScore}`
    );

    console.log(
      `Estado: ${result.status}`
    );

    console.log(
      `TV: ${result.tv.join(", ")}`
    );

    console.log(
      `Cuartos detectados: ${result.quarterScores.length}`
    );

    console.log(
      `Jugadores encontrados: ${result.players.length}`
    );

    if (result.quarterScores.length) {
      console.log("");

      console.log(
        "PARCIALES:"
      );

      result.quarterScores.forEach(
        (quarter) => {
          console.log(
            `${quarter.period}: ${quarter.home}-${quarter.away}`
          );
        }
      );
    }

    console.log(
      "========================================"
    );

    console.log("");

    result.players.forEach(
      (player) => {
        console.log(
          `${player.name} | ${player.teamCode} | PTS ${player.points} | REB ${player.rebounds} | AST ${player.assists} | MIN ${player.minutes}`
        );
      }
    );

    console.log("");

    console.log(
      "JSON COMPLETO:"
    );

    const json =
      JSON.stringify(
        result,
        null,
        2
      );

    console.log(json);

    fs.writeFileSync(
      "flashscore-raw.json",
      json,
      "utf8"
    );

    console.log("");

    console.log(
      "Archivo generado: flashscore-raw.json"
    );

  } catch (error) {
    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "ERROR"
    );

    console.error(
      "========================================"
    );

    console.error("");

    console.error(
      error.message
    );

    process.exit(1);
  }
}

main();
