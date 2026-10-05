const fs = require("fs");

const headers = {
  "x-fsign": "SW9D1eZo",
  Referer: "https://www.flashscore.com.ar/",
  Origin: "https://www.flashscore.com.ar/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language":
    "es-AR,es;q=0.9,en;q=0.8",
};

const url =
  "https://www.flashscore.com.ar/basquetbol/argentina/lnb/";

function getValue(block, key) {
  const regex = new RegExp(
    `(?:^|¬)${key}÷([^¬~]+)`
  );

  const match = block.match(regex);

  return match
    ? match[1]
    : null;
}

function normalizeTeam(name) {
  const map = {
    "Lanus": "lanus",
    "Lanús": "lanus",

    "Gimnasia": "gimnasia",

    "Peñarol": "penarol",

    "Argentino": "argentino",

    "Ferro": "ferro",

    "San Martin": "san-martin",
    "San Martín": "san-martin",

    "Instituto": "instituto",
    "Instituto de Córdoba": "instituto",

    "Quimsa": "quimsa",

    "Platense": "platense",

    "Regatas": "regatas",

    "La Union": "la-union",
    "La Unión": "la-union",

    "Atenas": "atenas",

    "Olimpico": "olimpico",
    "Olímpico": "olimpico",

    "Obera": "obera",
    "Oberá": "obera",
    "Obera TC": "obera",
    "Oberá TC": "obera",

    "Boca": "boca",
    "Boca Juniors": "boca",

    "San Lorenzo": "san-lorenzo",

    "Racing": "racing-chivilcoy",
    "Racing de Chivilcoy":
      "racing-chivilcoy",

    "Independiente":
      "independiente-oliva",

    "Independiente de Oliva":
      "independiente-oliva",
  };

  if (map[name]) {
    return map[name];
  }

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

/*
========================================
ESTADO FLASHscore
========================================

AB = 3 → Finalizado

Los demás códigos pueden representar
estados especiales de Flashscore.

45 es utilizado por Flashscore para
partidos aplazados en determinados feeds.

Guardamos SIEMPRE el código original
para poder diagnosticar futuros casos.
*/

function getMatchStatus(statusCode) {
  if (statusCode === "3") {
    return "finished";
  }

  /*
   * Estado aplazado.
   *
   * Flashscore utiliza códigos internos
   * que pueden variar según deporte/feed.
   */
  if (
    statusCode === "45"
  ) {
    return "postponed";
  }

  /*
   * Otros estados especiales conocidos.
   *
   * No los tratamos como finalizados.
   */
  if (
    [
      "11",
      "12",
      "13",
      "38",
    ].includes(statusCode)
  ) {
    return "special";
  }

  return "scheduled";
}

function parseEvent(block) {
  const eventId =
    getValue(block, "AA");

  if (!eventId) {
    return null;
  }

  const homeName =
    getValue(block, "CX");

  const awayName =
    getValue(block, "AF");

  if (!homeName || !awayName) {
    return null;
  }

  const homeScoreRaw =
    getValue(block, "AG");

  const awayScoreRaw =
    getValue(block, "AH");

  const statusCode =
    getValue(block, "AB");

  const timestampRaw =
    getValue(block, "AD");

  const homeSlug =
    getValue(block, "WU");

  const awaySlug =
    getValue(block, "WV");

  const homeId =
    getValue(block, "PX");

  const awayId =
    getValue(block, "PY");

  const homeScore =
    homeScoreRaw !== null &&
    homeScoreRaw !== ""
      ? Number(homeScoreRaw)
      : null;

  const awayScore =
    awayScoreRaw !== null &&
    awayScoreRaw !== ""
      ? Number(awayScoreRaw)
      : null;

  const status =
    getMatchStatus(statusCode);

  return {
    eventId,

    homeTeam:
      normalizeTeam(homeName),

    homeName,

    awayTeam:
      normalizeTeam(awayName),

    awayName,

    homeScore,

    awayScore,

    status,

    statusCode,

    timestamp:
      timestampRaw
        ? Number(timestampRaw)
        : null,

    homeSlug,

    awaySlug,

    homeId,

    awayId,
  };
}

async function main() {
  console.log(
    "========================================"
  );

  console.log(
    "DESCUBRIDOR AUTOMÁTICO DE PARTIDOS LNB"
  );

  console.log(
    "========================================"
  );

  console.log("");

  console.log(
    "Descargando página de LNB..."
  );

  const response =
    await fetch(url, {
      headers,
    });

  console.log(
    `HTTP: ${response.status}`
  );

  if (!response.ok) {
    throw new Error(
      `Flashscore respondió con ${response.status}`
    );
  }

  const html =
    await response.text();

  console.log(
    `HTML recibido: ${html.length} caracteres`
  );

  console.log("");

  const blocks =
    html.split("AA÷").slice(1);

  const matches = [];

  for (const block of blocks) {
    const event =
      parseEvent(
        `AA÷${block}`
      );

    if (!event) {
      continue;
    }

    const alreadyExists =
      matches.some(
        (match) =>
          match.eventId ===
          event.eventId
      );

    if (alreadyExists) {
      continue;
    }

    matches.push(event);
  }

  console.log(
    `Partidos encontrados: ${matches.length}`
  );

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "PARTIDOS ENCONTRADOS"
  );

  console.log(
    "========================================"
  );

  console.log("");

  matches.forEach(
    (match, index) => {
      console.log(
        `${index + 1}. ${match.homeName} ${match.homeScore ?? "-"} - ${match.awayScore ?? "-"} ${match.awayName}`
      );

      console.log(
        `   MID: ${match.eventId}`
      );

      console.log(
        `   Estado: ${match.status}`
      );

      console.log(
        `   Código Flashscore: ${match.statusCode ?? "sin código"}`
      );

      console.log(
        `   LNA: ${match.homeTeam} - ${match.awayTeam}`
      );

      console.log(
        `   Flashscore: ${match.homeSlug}-${match.homeId} / ${match.awaySlug}-${match.awayId}`
      );

      console.log("");
    }
  );

  /*
  ========================================
  PARTIDOS TERMINADOS
  ========================================
  */

  const finished =
    matches.filter(
      (match) =>
        match.status === "finished"
    );

  /*
  ========================================
  PARTIDOS APLAZADOS
  ========================================
  */

  const postponed =
    matches.filter(
      (match) =>
        match.status === "postponed"
    );

  console.log(
    "========================================"
  );

  console.log(
    `PARTIDOS TERMINADOS: ${finished.length}`
  );

  console.log(
    "========================================"
  );

  console.log("");

  finished.forEach(
    (match) => {
      console.log(
        `${match.eventId} | ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`
      );
    }
  );

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    `PARTIDOS APLAZADOS: ${postponed.length}`
  );

  console.log(
    "========================================"
  );

  console.log("");

  postponed.forEach(
    (match) => {
      console.log(
        `${match.eventId} | ${match.homeName} vs ${match.awayName} | código ${match.statusCode}`
      );
    }
  );

  console.log("");

  const output = {
    source: url,

    totalMatches:
      matches.length,

    finishedMatches:
      finished.length,

    postponedMatches:
      postponed.length,

    matches,

    finished,

    postponed,
  };

  fs.writeFileSync(
    "lnb-events.json",
    JSON.stringify(
      output,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    "Archivo generado: lnb-events.json"
  );

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "FIN"
  );

  console.log(
    "========================================"
  );
}

main().catch(
  (error) => {
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

    console.error("");

    process.exit(1);
  }
);