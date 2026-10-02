const fs = require("fs");
const path = require("path");

const URL = "https://basquetplus.com/lnb";

const OUTPUT = path.join(
  __dirname,
  "src",
  "data",
  "broadcasts.js"
);

/*
 * =========================================
 * CÓDIGOS DE BÁSQUET PLUS → IDs DE LNA
 * =========================================
 */

const teamMap = {
  ARG: "argentino",
  ATE: "atenas",
  BOC: "boca",
  FCO: "ferro",
  GIM: "gimnasia",
  IND: "independiente-oliva",
  INS: "instituto",
  LUF: "la-union",
  LAN: "lanus",
  OTC: "obera",
  OLI: "olimpico",
  "PEÑ": "penarol",
  PLA: "platense",
  QSA: "quimsa",
  RAC: "racing-chivilcoy",
  REG: "regatas",
  SLA: "san-lorenzo",
  SMC: "san-martin",
};

/*
 * =========================================
 * DESCARGAR PÁGINA
 * =========================================
 */

async function fetchPage() {
  const response = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Error al descargar Básquet Plus: ${response.status}`
    );
  }

  return await response.text();
}

/*
 * =========================================
 * CONVERTIR HTML → TEXTO
 * =========================================
 */

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * =========================================
 * EXTRAER TELEVISADOS
 * =========================================
 */

function extractBroadcasts(html) {
  const broadcasts = {};

  /*
   * Primero convertimos toda la página a texto.
   *
   * Ejemplo:
   *
   * 05/10/2026 - 22:00 QSA ATE TyC Sports
   *
   * De esta forma las etiquetas HTML no interfieren.
   */

  const text = cleanText(html);

  /*
   * Buscamos:
   *
   * fecha
   * hora
   * equipo local
   * equipo visitante
   * canal
   */

  const pattern =
    /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2})\s+([A-ZÑÁÉÍÓÚ]+)\s+([A-ZÑÁÉÍÓÚ]+)\s+(TyC Sports|DSports)/gi;

  let match;

  while ((match = pattern.exec(text)) !== null) {
    const [
      ,
      date,
      time,
      homeCode,
      awayCode,
      channel,
    ] = match;

    const homeTeam =
      teamMap[homeCode.toUpperCase()];

    const awayTeam =
      teamMap[awayCode.toUpperCase()];

    /*
     * Si aparece un equipo que no conocemos,
     * mostramos aviso y seguimos.
     */

    if (!homeTeam || !awayTeam) {
      console.log(
        `[TV] ⚠️ Equipo no identificado: ${homeCode} vs ${awayCode}`
      );

      continue;
    }

    const [
      day,
      month,
      year,
    ] = date.split("/");

    const isoDate =
      `${year}-${month}-${day}`;

    /*
     * ID único del partido.
     */

    const key =
      `${isoDate}-${homeTeam}-${awayTeam}`;

    broadcasts[key] = {
      date: isoDate,
      time,
      homeTeam,
      awayTeam,
      channel,
    };

    console.log(
      `[TV] ${isoDate} ${time} | ${homeCode} vs ${awayCode} → ${channel}`
    );
  }

  return broadcasts;
}

/*
 * =========================================
 * GENERAR broadcasts.js
 * =========================================
 */

function writeBroadcastFile(broadcasts) {
  const content = `// ESTE ARCHIVO ES GENERADO AUTOMÁTICAMENTE.
// Fuente: Básquet Plus
// No editar manualmente.

export const broadcasts = ${JSON.stringify(
    broadcasts,
    null,
    2
)};
`;

  fs.mkdirSync(
    path.dirname(OUTPUT),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    OUTPUT,
    content,
    "utf8"
  );
}

/*
 * =========================================
 * MAIN
 * =========================================
 */

async function main() {
  console.log("");
  console.log("=========================================");
  console.log(" ACTUALIZANDO TELEVISACIÓN LNB");
  console.log("=========================================");
  console.log("");

  try {
    const html = await fetchPage();

    const broadcasts =
      extractBroadcasts(html);

    writeBroadcastFile(broadcasts);

    console.log("");

    console.log(
      `Televisados encontrados: ${
        Object.keys(broadcasts).length
      }`
    );

    console.log("");

    console.log(
      `Archivo generado: ${OUTPUT}`
    );

    console.log("");

    console.log("=========================================");
    console.log(" TELEVISACIÓN ACTUALIZADA");
    console.log("=========================================");
    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "ERROR:",
      error.message
    );
    console.error("");

    process.exit(1);
  }
}

main();