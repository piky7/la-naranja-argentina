const eventId = "xQfNLYW1";

const playersUrl =
  `https://global.flashscore.ninja/204/x/feed/df_psn_1_${eventId}`;

const matchUrl =
  `https://global.flashscore.ninja/204/x/feed/dc_1_${eventId}`;

const tvUrl =
  `https://global.flashscore.ninja/204/x/feed/df_dos_1_${eventId}_`;

const TEAM_CODES = {
  LAN: "lanus",
  NAS: "gimnasia",
};

const headers = {
  "x-fsign": "SW9D1eZo",
  "Referer": "https://www.flashscore.com.ar/",
  "Origin": "https://www.flashscore.com.ar/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
  "Accept": "*/*",
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

function parsePlayers(text) {
  const players = [];

  const generalStart =
    text.indexOf("PA÷General");

  if (generalStart === -1) {
    throw new Error(
      "No se encontró el bloque General."
    );
  }

  const generalEnd =
    text.indexOf("¬~PA÷Lanus");

  if (generalEnd === -1) {
    throw new Error(
      "No se encontró el final del bloque General."
    );
  }

  const generalBlock =
    text.slice(
      generalStart,
      generalEnd
    );

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

    const teamId =
      TEAM_CODES[teamCode] || null;

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
      teamId,
      flashscoreSlug,
      points,
      rebounds,
      assists,
      minutes,
    });
  }

  return players;
}

function parseScore(text) {
  const homeScoreMatch =
    text.match(/DE÷(-?\d+)/);

  const awayScoreMatch =
    text.match(/DF÷(-?\d+)/);

  if (
    !homeScoreMatch ||
    !awayScoreMatch
  ) {
    throw new Error(
      "No se pudo encontrar el marcador."
    );
  }

  return {
    homeScore:
      Number(homeScoreMatch[1]),

    awayScore:
      Number(awayScoreMatch[1]),
  };
}

function parseStatus(text) {
  const statusMatch =
    text.match(/DI÷([^¬]+)/);

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

  return ["Básquet Pass"];
}

async function main() {
  try {
    console.log(
      "Obteniendo partido desde Flashscore..."
    );

    console.log("");

    const [
      playersText,
      matchText,
      tvText,
    ] = await Promise.all([
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

    const players =
      parsePlayers(playersText);

    const score =
      parseScore(matchText);

    const status =
      parseStatus(matchText);

    const tv =
      parseTv(tvText);

    const match = {
      eventId,

      homeTeam: "lanus",
      awayTeam: "gimnasia",

      homeScore:
        score.homeScore,

      awayScore:
        score.awayScore,

      status,

      tv,

      players,
    };

    console.log("");

    console.log(
      "PARTIDO"
    );

    console.log(
      "--------------------------------"
    );

    console.log(
      `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`
    );

    console.log(
      `Estado: ${match.status}`
    );

    console.log(
      `TV: ${match.tv.join(", ")}`
    );

    console.log(
      `Jugadores: ${match.players.length}`
    );

    console.log(
      "--------------------------------"
    );

    console.log("");

    console.log(
      JSON.stringify(
        match,
        null,
        2
      )
    );
  } catch (error) {
    console.error("");

    console.error(
      "ERROR:"
    );

    console.error(
      error.message
    );
  }
}

main();