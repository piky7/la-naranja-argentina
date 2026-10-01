const fs = require("fs");

const eventId =
  process.argv[2];

if (!eventId) {
  console.error("");
  console.error("ERROR:");
  console.error(
    "Tenés que indicar un event ID."
  );
  console.error("");
  console.error("Ejemplo:");
  console.error(
    "node auto-flashscore.cjs ATkHsGgL"
  );
  console.error("");

  process.exit(1);
}

const eventsFile =
  "lnb-events.json";

function loadMatch() {
  if (!fs.existsSync(eventsFile)) {
    throw new Error(
      `No existe ${eventsFile}. Ejecutá primero discover-mids.cjs.`
    );
  }

  const data =
    JSON.parse(
      fs.readFileSync(
        eventsFile,
        "utf8"
      )
    );

  if (!Array.isArray(data.matches)) {
    throw new Error(
      "lnb-events.json no contiene la lista de partidos."
    );
  }

  const match =
    data.matches.find(
      (item) =>
        item.eventId === eventId
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
  const response =
    await fetch(
      url,
      {
        headers,
      }
    );

  if (!response.ok) {
    throw new Error(
      `Flashscore respondió con ${response.status}`
    );
  }

  return await response.text();
}

function extractOgTitle(page) {
  const match =
    page.match(
      /<meta property="og:title" content="([^"]+)"/
    );

  if (!match) {
    throw new Error(
      "No se encontró og:title."
    );
  }

  return match[1];
}

function parseMatchFromTitle(title) {
  const match =
    title.match(
      /^(.+?)\s+-\s+(.+?)\s+(-?\d+)-(-?\d+)$/
    );

  if (!match) {
    throw new Error(
      `No se pudo interpretar el título: ${title}`
    );
  }

  return {
    homeTeam:
      match[1],

    awayTeam:
      match[2],

    homeScore:
      Number(match[3]),

    awayScore:
      Number(match[4]),
  };
}

function parseStatus(text) {
  const statusMatch =
    text.match(
      /DI÷([^¬]+)/
    );

  if (!statusMatch) {
    return "unknown";
  }

  const statusCode =
    statusMatch[1];

  if (statusCode === "-1") {
    return "finished";
  }

  return statusCode;
}

function parseTv(text) {
  if (
    text.includes(
      "tycsports.com"
    ) ||
    text.includes(
      "TyC Sports"
    )
  ) {
    return ["TyC Sports"];
  }

  if (
    text.includes(
      "DSports"
    ) ||
    text.includes(
      "DirectTV"
    )
  ) {
    return ["DSports"];
  }

  return ["Básquet Pass"];
}

function parsePlayers(text) {
  const players = [];

  const generalStart =
    text.indexOf(
      "PA÷General"
    );

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

  if (
    nextSectionStart === -1
  ) {
    generalBlock =
      text.slice(
        generalStart
      );
  } else {
    generalBlock =
      text.slice(
        generalStart,
        nextSectionStart
      );
  }

  const playerBlocks =
    generalBlock.split(
      "~PJ÷"
    );

  for (
    const block of playerBlocks.slice(1)
  ) {
    const playerNameEnd =
      block.indexOf("¬");

    if (
      playerNameEnd === -1
    ) {
      continue;
    }

    const name =
      block.slice(
        0,
        playerNameEnd
      );

    const statsMatch =
      block.match(
        /¬PC÷([^¬~]+)/
      );

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
      block.match(
        /¬PN÷([^¬~]+)/
      );

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

    /*
     * Buscamos el partido descubierto
     * previamente por discover-mids.cjs.
     */

    const discoveredMatch =
      loadMatch();

    console.log(
      `Partido detectado: ${discoveredMatch.homeName} - ${discoveredMatch.awayName}`
    );

    console.log("");

    /*
     * Flashscore utiliza en la URL:
     *
     * visitante primero
     * local después
     *
     * Ejemplo:
     *
     * gimnasia-Cn0pHIpQ/
     * penarol-0OnqJxtR/
     */

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

    console.log(
      matchPageUrl
    );

    console.log("");

    console.log(
      "Descargando página principal..."
    );

    const page =
      await getFeed(
        matchPageUrl
      );

    console.log(
      `Página: ${page.length} caracteres`
    );

    console.log("");

    const title =
      extractOgTitle(
        page
      );

    const match =
      parseMatchFromTitle(
        title
      );

    console.log(
      `Partido: ${match.homeTeam} - ${match.awayTeam}`
    );

    console.log(
      `Resultado: ${match.homeScore}-${match.awayScore}`
    );

    console.log("");

    const playersUrl =
      `https://global.flashscore.ninja/204/x/feed/df_psn_1_${eventId}`;

    const matchUrl =
      `https://global.flashscore.ninja/204/x/feed/dc_1_${eventId}`;

    const tvUrl =
      `https://global.flashscore.ninja/204/x/feed/df_dos_1_${eventId}_`;

    console.log(
      "Descargando feeds..."
    );

    const [
      playersText,
      matchText,
      tvText,
    ] =
      await Promise.all([
        getFeed(playersUrl),
        getFeed(matchUrl),
        getFeed(tvUrl),
      ]);

    console.log(
      `Feed jugadores: ${playersText.length} caracteres`
    );

    console.log(
      `Feed partido: ${matchText.length} caracteres`
    );

    console.log(
      `Feed TV: ${tvText.length} caracteres`
    );

    console.log("");

    const status =
      parseStatus(
        matchText
      );

    const players =
      parsePlayers(
        playersText
      );

    const tv =
      parseTv(
        tvText
      );

    const result = {
      eventId,

      homeTeam:
        match.homeTeam,

      awayTeam:
        match.awayTeam,

      homeScore:
        match.homeScore,

      awayScore:
        match.awayScore,

      status,

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
      `Jugadores encontrados: ${result.players.length}`
    );

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