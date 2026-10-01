const fs = require("fs");

const generatedFile = "matchstats-generated.js";
const matchStatsFile = "src/data/matchStats.js";

function main() {
  console.log("========================================");
  console.log("ACTUALIZADOR AUTOMÁTICO DE MATCHSTATS");
  console.log("========================================");
  console.log("");

  if (!fs.existsSync(generatedFile)) {
    throw new Error(
      `No existe ${generatedFile}. Ejecutá primero generate-matchstats.cjs.`
    );
  }

  if (!fs.existsSync(matchStatsFile)) {
    throw new Error(
      `No existe ${matchStatsFile}.`
    );
  }

  const generated =
    fs.readFileSync(
      generatedFile,
      "utf8"
    ).trim();

  let matchStats =
    fs.readFileSync(
      matchStatsFile,
      "utf8"
    );

  if (!generated) {
    throw new Error(
      "El archivo generado está vacío."
    );
  }

  /*
   * Extraemos el matchId del bloque generado.
   *
   * Ejemplo:
   *
   * "penarol-gimnasia": {
   */

  const matchIdMatch =
    generated.match(
      /^\s*"([^"]+)":\s*\{/m
    );

  if (!matchIdMatch) {
    throw new Error(
      "No se pudo encontrar el matchId en matchstats-generated.js."
    );
  }

  const matchId =
    matchIdMatch[1];

  console.log(
    `Partido detectado: ${matchId}`
  );

  /*
   * Buscamos si el partido ya existe.
   *
   * Esto evita duplicarlo si ejecutamos
   * el script más de una vez.
   */

  const existingMatchRegex =
    new RegExp(
      `"${matchId}"\\s*:\\s*\\{`
    );

  if (
    existingMatchRegex.test(
      matchStats
    )
  ) {
    console.log("");
    console.log(
      `El partido "${matchId}" ya existe en matchStats.js.`
    );
    console.log(
      "No se agregó nuevamente."
    );
    console.log("");

    return;
  }

  /*
   * Buscamos el cierre del objeto principal:
   *
   * export const matchPlayerStats = {
   *
   * ...
   *
   * };
   */

  const closingIndex =
    matchStats.lastIndexOf(
      "};"
    );

  if (closingIndex === -1) {
    throw new Error(
      "No se encontró el cierre de matchStats.js."
    );
  }

  /*
   * Insertamos el nuevo partido justo
   * antes del cierre final.
   */

  const beforeClosing =
    matchStats.slice(
      0,
      closingIndex
    );

  const afterClosing =
    matchStats.slice(
      closingIndex
    );

  /*
   * Nos aseguramos de que el bloque anterior
   * tenga una separación correcta.
   */

  const separator =
    beforeClosing.endsWith("\n")
      ? ""
      : "\n";

  const updated =
    beforeClosing +
    separator +
    generated +
    "\n" +
    afterClosing;

  fs.writeFileSync(
    matchStatsFile,
    updated,
    "utf8"
  );

  console.log("");
  console.log(
    "Partido agregado correctamente."
  );

  console.log(
    `Archivo actualizado: ${matchStatsFile}`
  );

  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);
}