const fs = require("fs");

const generatedFile =
  "matchstats-generated.js";

const matchStatsFile =
  "src/data/matchStats.js";

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

  /*
    Buscamos la llave inicial del objeto
    del partido.
  */

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

    /*
      Control de strings para no contar
      llaves que estén dentro de textos.
    */

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
        /*
          Incluimos la coma posterior si existe.
        */

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
  /*
    Eliminamos posibles espacios iniciales
    para insertarlo de forma limpia.
  */

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
  BUSCAR SI YA EXISTE
  ----------------------------------------
  */

  const existingBlock =
    extractMatchBlock(
      matchStats,
      matchId
    );

  /*
  ========================================
  CASO 1: PARTIDO YA EXISTE
  ========================================
  */

  if (existingBlock) {
    console.log(
      `El partido "${matchId}" ya existe en matchStats.js.`
    );

    console.log(
      "Actualizando estadísticas existentes..."
    );

    console.log("");

    matchStats =
      matchStats.slice(
        0,
        existingBlock.start
      ) +
      cleanGeneratedBlock +
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
      `Archivo actualizado: ${matchStatsFile}`
    );

    console.log("");

    return;
  }

  /*
  ========================================
  CASO 2: PARTIDO NUEVO
  ========================================
  */

  console.log(
    `El partido "${matchId}" no existe en matchStats.js.`
  );

  console.log(
    "Agregando estadísticas..."
  );

  console.log("");

  /*
    Buscamos el cierre del objeto principal:

      };

    y agregamos el nuevo partido
    inmediatamente antes.
  */

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

  /*
    Si ya existe contenido antes del nuevo
    bloque, aseguramos una coma.
  */

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