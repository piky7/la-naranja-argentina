const fs = require("fs");
const path = require("path");

const URLS = [
  "https://basquetplus.com/lnb",
  "https://basquetplus.com/liga-nacional-lnb-televisados-semana-semanal-jornada-primera-basquetpass-tyc-dsports",
];

const OUTPUT = path.join(
  __dirname,
  "src",
  "data",
  "broadcasts.js"
);

const TEAM_ALIASES = {
  "Argentino (J)": "argentino",
  "Argentino": "argentino",

  "Atenas (C)": "atenas",
  "Atenas": "atenas",

  "Boca Juniors": "boca",
  "Boca": "boca",

  "Ferro": "ferro",

  "Gimnasia (CR)": "gimnasia",
  "Gimnasia": "gimnasia",

  "Independiente (O)": "independiente-oliva",
  "Independiente de Oliva": "independiente-oliva",
  "Independiente": "independiente-oliva",

  "Instituto": "instituto",
  "Instituto (C)": "instituto",

  "La Unión (FSA.)": "la-union",
  "La Unión (FSA)": "la-union",
  "La Unión": "la-union",

  "Lanús": "lanus",
  "Lanus": "lanus",

  "Oberá TC": "obera",
  "Oberá": "obera",
  "Obera TC": "obera",
  "Obera": "obera",

  "Olímpico (LB)": "olimpico",
  "Olímpico": "olimpico",
  "Olimpico": "olimpico",

  "Peñarol (MDP)": "penarol",
  "Peñarol": "penarol",

  "Platense": "platense",

  "Quimsa": "quimsa",

  "Racing (CH)": "racing-chivilcoy",
  "Racing de Chivilcoy": "racing-chivilcoy",
  "Racing": "racing-chivilcoy",

  "Regatas (C)": "regatas",
  "Regatas": "regatas",

  "San Lorenzo": "san-lorenzo",

  "San Martín (C)": "san-martin",
  "San Martín": "san-martin",
  "San Martin": "san-martin",
};

function fetchPage(url) {
  return fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language":
        "es-AR,es;q=0.9,en;q=0.8",
    },
  }).then((response) => {
    if (!response.ok) {
      throw new Error(
        `Error HTTP ${response.status}`
      );
    }

    return response.text();
  });
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#8217;/gi, "’")
    .replace(/&#243;/gi, "ó")
    .replace(/&#225;/gi, "á")
    .replace(/&#233;/gi, "é")
    .replace(/&#237;/gi, "í")
    .replace(/&#250;/gi, "ú")
    .replace(/&#241;/gi, "ñ");
}

function cleanText(html) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeChannel(text) {
  const normalized =
    normalizeText(text);

  if (
    normalized.includes("tyc sports")
  ) {
    return "TyC Sports";
  }

  if (
    normalized.includes("dsports") ||
    normalized.includes("d sports")
  ) {
    return "DSports";
  }

  if (
    normalized.includes("basquetpass") ||
    normalized.includes("basquet pass")
  ) {
    return "Básquet Pass";
  }

  return null;
}

function findTeam(text) {
  const normalized =
    normalizeText(text);

  const entries =
    Object.entries(
      TEAM_ALIASES
    ).sort(
      (a, b) =>
        normalizeText(b[0]).length -
        normalizeText(a[0]).length
    );

  for (
    const [name, slug] of entries
  ) {
    if (
      normalized.includes(
        normalizeText(name)
      )
    ) {
      return {
        name,
        slug,
      };
    }
  }

  return null;
}

function findTwoTeams(text) {
  const normalized =
    normalizeText(text);

  const entries =
    Object.entries(
      TEAM_ALIASES
    )
      .map(([name, slug]) => ({
        name,
        slug,
        normalized:
          normalizeText(name),
      }))
      .sort(
        (a, b) =>
          b.normalized.length -
          a.normalized.length
      );

  const found = [];

  for (
    const team of entries
  ) {
    const index =
      normalized.indexOf(
        team.normalized
      );

    if (index === -1) {
      continue;
    }

    const overlaps =
      found.some(
        (item) =>
          index >= item.start &&
          index <
            item.end
      );

    if (overlaps) {
      continue;
    }

    found.push({
      ...team,
      start: index,
      end:
        index +
        team.normalized.length,
    });
  }

  found.sort(
    (a, b) =>
      a.start - b.start
  );

  return found.slice(0, 2);
}

function extractRows(html) {
  const rows = [];

  const regex =
    /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;

  let match;

  while (
    (match = regex.exec(html)) !== null
  ) {
    const rowHtml = match[1];

    const text =
      cleanText(rowHtml);

    if (text) {
      rows.push({
        html: rowHtml,
        text,
      });
    }
  }

  return rows;
}

function parseRow(rowText) {
  const normalized =
    normalizeText(rowText);

  const channel =
    normalizeChannel(
      rowText
    );

  if (!channel) {
    return null;
  }

  /*
   * Fecha:
   * 05/10/2026
   * 05/10
   * Lunes 5/10
   */
  const dateMatch =
    rowText.match(
      /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/
    );

  if (!dateMatch) {
    return null;
  }

  const day =
    dateMatch[1].padStart(2, "0");

  const month =
    dateMatch[2].padStart(2, "0");

  const year =
    dateMatch[3] ??
    "2026";

  const isoDate =
    `${year}-${month}-${day}`;

  /*
   * Hora
   */
  const timeMatch =
    rowText.match(
      /\b(\d{1,2}):(\d{2})\b/
    );

  if (!timeMatch) {
    return null;
  }

  const time =
    `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;

  /*
   * Buscamos los dos equipos
   * dentro de ESTA MISMA FILA.
   */
  const teams =
    findTwoTeams(rowText);

  if (teams.length !== 2) {
    console.log(
      `[TV] ⚠️ No se pudieron identificar dos equipos: ${rowText}`
    );

    return null;
  }

  const homeTeam =
    teams[0].slug;

  const awayTeam =
    teams[1].slug;

  return {
    date: isoDate,
    time,
    homeTeam,
    awayTeam,
    channel,
  };
}

function extractBroadcasts(html) {
  const broadcasts = {};

  /*
   * PRIMERA OPCIÓN:
   * leer las filas reales de la tabla.
   */
  const rows =
    extractRows(html);

  for (
    const row of rows
  ) {
    const result =
      parseRow(row.text);

    if (!result) {
      continue;
    }

    const key =
      `${result.date}-${result.homeTeam}-${result.awayTeam}`;

    broadcasts[key] =
      result;

    console.log(
      `[TV] ${result.date} ${result.time} | ${result.homeTeam} vs ${result.awayTeam} → ${result.channel}`
    );
  }

  /*
   * SEGUNDA OPCIÓN:
   * si el sitio cambia la estructura y no usa
   * <tr>, intentamos encontrar bloques
   * individuales del documento.
   */
  if (
    Object.keys(broadcasts).length === 0
  ) {
    console.log(
      "[TV] No se encontraron filas. Intentando parser alternativo..."
    );

    const text =
      cleanText(html);

    const blocks =
      text.split(
        /(?=\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b)/
      );

    for (
      const block of blocks
    ) {
      const result =
        parseRow(block);

      if (!result) {
        continue;
      }

      const key =
        `${result.date}-${result.homeTeam}-${result.awayTeam}`;

      broadcasts[key] =
        result;

      console.log(
        `[TV] ${result.date} ${result.time} | ${result.homeTeam} vs ${result.awayTeam} → ${result.channel}`
      );
    }
  }

  return broadcasts;
}

function mergeBroadcasts(
  target,
  source
) {
  Object.entries(source).forEach(
    ([key, value]) => {
      target[key] = value;
    }
  );
}

function writeBroadcastFile(
  broadcasts
) {
  const content =
`// ESTE ARCHIVO ES GENERADO AUTOMÁTICAMENTE.
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

async function main() {
  console.log("");
  console.log(
    "========================================="
  );
  console.log(
    " ACTUALIZANDO TELEVISACIÓN LNB"
  );
  console.log(
    "========================================="
  );
  console.log("");

  let broadcasts = {};

  /*
   * Conservamos las televisaciones que ya
   * estaban guardadas anteriormente.
   *
   * Esto evita que una falla temporal del
   * parser o un cambio en la página de
   * Básquet Plus borre canales correctos.
   */
  if (fs.existsSync(OUTPUT)) {
    try {
      const existingContent =
        fs.readFileSync(
          OUTPUT,
          "utf8"
        );

      const match =
        existingContent.match(
          /export const broadcasts = (\{[\s\S]*\});/
        );

      if (match) {
        broadcasts =
          JSON.parse(
            match[1]
          );

        console.log(
          `[TV] Conservando ${Object.keys(broadcasts).length} televisaciones existentes.`
        );
      }
    } catch (error) {
      console.log(
        `[TV] ⚠️ No se pudieron leer las televisaciones existentes: ${error.message}`
      );
    }
  }

  for (
    const url of URLS
  ) {
    console.log(
      `Consultando: ${url}`
    );

    try {
      const html =
        await fetchPage(url);

      const found =
        extractBroadcasts(html);

      mergeBroadcasts(
        broadcasts,
        found
      );
    } catch (error) {
      console.log(
        `[TV] ⚠️ Error consultando ${url}: ${error.message}`
      );
    }

    console.log("");
  }

  writeBroadcastFile(
    broadcasts
  );

  console.log(
    `Televisados encontrados: ${
      Object.keys(broadcasts).length
    }`
  );

  console.log("");

  console.log(
    "========================================="
  );
  console.log(
    " TELEVISACIÓN ACTUALIZADA"
  );
  console.log(
    "========================================="
  );
  console.log("");
}

main();