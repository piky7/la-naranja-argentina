const fs = require("fs");

const generatedFile =
  "matchstats-generated.js";

const matchStatsFile =
  "src/data/matchStats.js";

/*
========================================
NORMALIZAR MATCH ID
========================================

Convierte variantes como:

2026-09-28-lanus-gimnasia
lanus-gimnasia

en:

lanus-gimnasia
*/

function normalizeMatchId(matchId) {
  let normalized = matchId
    .trim()
    .toLowerCase();

  /*
    Eliminamos una fecha al comienzo:

    2026-09-28-lanus-gimnasia
    ↓
    lanus-gimnasia
  */

  normalized =
    normalized.replace(
      /^\d{4}-\d{2}-\d{2}-/,
      ""
    );

  /*
    Normalizamos algunos nombres históricos
    que pueden haber quedado guardados
    con otra variante.
  */

  normalized =
    normalized
      .replace(
        /instituto-de-córdoba/gi,
        "instituto"
      )
      .replace(
        /instituto-de-cordoba/gi,
        "instituto"
      );

  return normalized;
}

/*
========================================
EXTRAER TODOS LOS MATCH IDS
========================================
*/

function getAllMatchIds(source) {
  const regex =
    /^\s*"([^"]+)":\s*\{/gm;

  const ids = [];

  let match;

  while (
    (match = regex.exec(source)) !== null
  ) {
    ids.push(match[1]);
  }

  return ids;
}

/*
========================================
BUSCAR MATCH ID EQUIVALENTE
========================================
*/

function findEquivalentMatchId(
  source,
  targetMatchId
) {
  const targetNormalized =
    normalizeMatchId(
      targetMatchId
    );

  const existingIds =
    getAllMatchIds(source);

  for (
    const existingId of existingIds
  ) {
    if (
      normalizeMatchId(
        existingId
      ) === targetNormalized
    ) {
      return existingId;
    }
  }

  return null;
}

/*
========================================
EXTRAER EL BLOQUE DE UN PARTIDO
========================================
*/

function extractMatchBlock(
  source,
  matchId
) {
  const search =
    `"${matchId}": {`;

  const start =
    source.indexOf(search);

  if (start === -1) {
    return null;
  }

  const objectStart =
    source.indexOf(
      "{",
      start
    );

  if (objectStart === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = objectStart;
    i < source.length;
    i++
  ) {
    const char =
      source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth++;
    }

    if (char === "}") {
      depth--;

      if (depth === 0) {
        let end =
          i + 1;

        while (
          end < source.length &&
          /\s/.test(
            source[end]
          )
        ) {
          end++;
        }

        if (
          source[end] === ","
        ) {
          end++;
        }

        return {
          start,
          end,
          text:
            source.slice(
              start,
              end
            ),
        };
      }
    }
  }

  return null;
}

/*
========================================
EXTRAER MATCH ID DEL ARCHIVO GENERADO
========================================
*/

function getGeneratedMatchId(
  source
) {
  const match =
    source.match(
      /"([^"]+)":\s*\{/
    );

  if (!match) {
    throw new Error(
      "No se pudo detectar el partido generado."
    );
  }

  return match[1];
}

/*
========================================
NORMALIZAR BLOQUE GENERADO
========================================
*/

function normalizeGeneratedBlock(
  source
) {
  return source.trim();
}

/*
========================================
MAIN
========================================
*/

function main() {
  console.log(
    "========================================"
  );

  console.log(
    "ACTUALIZADOR AUTOMÁTICO DE MATCHSTATS"
  );

  console.log(
    "========================================"
  );

  console.log("");

  /*
  ----------------------------------------
  VALIDAR ARCHIVOS
  ----------------------------------------
  */

  if (
    !fs.existsSync(
      generatedFile
    )
  ) {
    throw new Error(
      `No existe ${generatedFile}. Ejecutá primero generate-matchstats.cjs.`
    );
  }

  if (
    !fs.existsSync(
      matchStatsFile
    )
  ) {
    throw new Error(
      `No existe ${matchStatsFile}.`
    );
  }

  /*
  ----------------------------------------
  LEER ARCHIVOS
  ----------------------------------------
  */

  const generated =
    fs.readFileSync(
      generatedFile,
      "utf8"
    );

  let matchStats =
    fs.readFileSync(
      matchStatsFile,
      "utf8"
    );

  /*
  ----------------------------------------
  DETECTAR PARTIDO
  ----------------------------------------
  */

  const matchId =
    getGeneratedMatchId(
      generated
    );

  console.log(
    `Partido detectado: ${matchId}`
  );

  console.log("");

  /*
  ----------------------------------------
  EXTRAER BLOQUE GENERADO
  ----------------------------------------
  */

  const generatedBlock =
    extractMatchBlock(
      generated,
      matchId
    );

  if (!generatedBlock) {
    throw new Error(
      `No se pudo extraer el bloque del partido ${matchId} desde ${generatedFile}.`
    );
  }

  const cleanGeneratedBlock =
    normalizeGeneratedBlock(
      generatedBlock.text
    );

  /*
  ----------------------------------------
  BUSCAR PARTIDO EQUIVALENTE
  ----------------------------------------
  */

  const equivalentMatchId =
    findEquivalentMatchId(
      matchStats,
      matchId
    );

  /*
  ========================================
  CASO 1:
  EL PARTIDO YA EXISTE
  ========================================
  */

  if (equivalentMatchId) {
    console.log(
      `Partido equivalente encontrado: ${equivalentMatchId}`
    );

    if (
      equivalentMatchId !== matchId
    ) {
      console.log(
        `El ID generado "${matchId}" corresponde al mismo partido.`
      );
    }

    console.log(
      "Actualizando estadísticas existentes..."
    );

    console.log("");

    const existingBlock =
      extractMatchBlock(
        matchStats,
        equivalentMatchId
      );

    if (!existingBlock) {
      throw new Error(
        `No se pudo extraer el bloque existente ${equivalentMatchId}.`
      );
    }

    /*
      Si el ID existente es diferente,
      usamos el ID canónico generado.

      Así eliminamos también la variante
      antigua y dejamos solamente:

      "lanus-gimnasia"
    */

    const replacement =
      cleanGeneratedBlock;

    matchStats =
      matchStats.slice(
        0,
        existingBlock.start
      ) +
      replacement +
      matchStats.slice(
        existingBlock.end
      );

    fs.writeFileSync(
      matchStatsFile,
      matchStats,
      "utf8"
    );

    console.log(
      "Partido actualizado correctamente."
    );

    console.log(
      `ID utilizado: ${matchId}`
    );

    console.log(
      `Archivo actualizado: ${matchStatsFile}`
    );

    console.log("");

    return;
  }

  /*
  ========================================
  CASO 2:
  PARTIDO NUEVO
  ========================================
  */

  console.log(
    `El partido "${matchId}" no existe en matchStats.js.`
  );

  console.log(
    "Agregando estadísticas..."
  );

  console.log("");

  const finalIndex =
    matchStats.lastIndexOf(
      "};"
    );

  if (finalIndex === -1) {
    throw new Error(
      `No se encontró el cierre final de ${matchStatsFile}.`
    );
  }

  const before =
    matchStats.slice(
      0,
      finalIndex
    );

  const after =
    matchStats.slice(
      finalIndex
    );

  let separator =
    "";

  const trimmedBefore =
    before.trimEnd();

  if (
    trimmedBefore.endsWith("}") &&
    !trimmedBefore.endsWith("},")
  ) {
    separator = ",";
  }

  matchStats =
    trimmedBefore +
    separator +
    "\n\n" +
    cleanGeneratedBlock +
    "\n" +
    after;

  fs.writeFileSync(
    matchStatsFile,
    matchStats,
    "utf8"
  );

  console.log(
    "Partido agregado correctamente."
  );

  console.log(
    `Archivo actualizado: ${matchStatsFile}`
  );

  console.log("");
}

/*
========================================
EJECUTAR
========================================
*/

try {
  main();
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

  console.error("");

  process.exit(1);
}