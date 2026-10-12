
const fs = require("fs");
const { Script } = require("vm");

const generatedFile = "matchstats-generated.js";
const matchStatsFile = "src/data/matchStats.js";

function normalizeMatchId(matchId) {
  return matchId
    .trim()
    .toLowerCase()
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/instituto-de-córdoba/gi, "instituto")
    .replace(/instituto-de-cordoba/gi, "instituto");
}

function extractMatchBlock(source, matchId) {
  const escapedId = matchId.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `^\\s*"${escapedId}"\\s*:\\s*\\{`,
    "m"
  );

  const match = regex.exec(source);

  if (!match) return null;

  const start = match.index;
  const objectStart = source.indexOf("{", start);

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = objectStart; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
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
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        let end = i + 1;

        while (
          end < source.length &&
          /\s/.test(source[end])
        ) {
          end++;
        }

        if (source[end] === ",") {
          end++;
        }

        return {
          start,
          end,
          text: source.slice(start, end),
        };
      }
    }
  }

  return null;
}

function getMatchIds(source) {
  const regex = /^\s*"([^"]+)"\s*:\s*\{/gm;
  const ids = [];
  let match;

  while ((match = regex.exec(source)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

function normalizeBlock(block) {
  return block
    .trim()
    .replace(/,\s*$/, "")
    .trimEnd() + ",";
}

function validateSyntax(source) {
  const transformed = source
    .replace(
      /^\s*export\s+const\s+matchPlayerStats\s*=/m,
      "const matchPlayerStats ="
    )
    .replace(
      /^\s*export\s+const\s+matchStats\s*=/m,
      "const matchStats ="
    );

  new Script(transformed);
}
function preserveExistingPlayerIds(existingBlock, generatedBlock) {
  const existingIds = new Map();
  const usedIds = new Set();

  const playerRegex =
    /"id"\s*:\s*"([^"]+)"\s*,\s*"name"\s*:\s*"([^"]+)"/g;

  function normalizeName(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  // Recuperar las identidades históricas.
  for (const match of existingBlock.matchAll(playerRegex)) {
    const [, id, name] = match;

    if (!id.startsWith("flashscore-")) {
      const key = normalizeName(name);

      if (existingIds.has(key) && existingIds.get(key) !== id) {
        throw new Error(
          `Identidad histórica ambigua: ${name}`
        );
      }

      existingIds.set(key, id);
    }
  }

  // Reservar todos los IDs oficiales generados.
  for (const match of generatedBlock.matchAll(playerRegex)) {
    const id = match[1];

    if (!id.startsWith("flashscore-")) {
      if (usedIds.has(id)) {
        throw new Error(
          `ID oficial duplicado: ${id}`
        );
      }

      usedIds.add(id);
    }
  }

  // Recuperar IDs históricos solo cuando corresponde.
  return generatedBlock.replace(
    playerRegex,
    (fullMatch, id, name) => {
      if (!id.startsWith("flashscore-")) {
        return fullMatch;
      }

      const key = normalizeName(name);
      const existingId = existingIds.get(key);

      if (!existingId) {
        return fullMatch;
      }

      if (usedIds.has(existingId)) {
        throw new Error(
          `Conflicto de identidad: ${existingId}`
        );
      }

      usedIds.add(existingId);

      return fullMatch.replace(
        `"${id}"`,
        `"${existingId}"`
      );
    }
  );
}
function main() {
  console.log("");
  console.log("========================================");
  console.log("ACTUALIZADOR AUTOMÁTICO DE MATCHSTATS");
  console.log("========================================");

  if (!fs.existsSync(generatedFile)) {
    throw new Error(
      `No existe ${generatedFile}`
    );
  }

  if (!fs.existsSync(matchStatsFile)) {
    throw new Error(
      `No existe ${matchStatsFile}`
    );
  }

  const generated = fs.readFileSync(
    generatedFile,
    "utf8"
  );

  let matchStats = fs.readFileSync(
    matchStatsFile,
    "utf8"
  );

  const generatedIds = getMatchIds(generated);

  if (generatedIds.length === 0) {
    throw new Error(
      "No se encontraron estadísticas generadas."
    );
  }

  let added = 0;
  let updated = 0;

  for (const matchId of generatedIds) {
    const generatedBlock = extractMatchBlock(
      generated,
      matchId
    );

    if (!generatedBlock) {
      throw new Error(
        `No se pudo extraer ${matchId}`
      );
    }

    const cleanBlock = normalizeBlock(
      generatedBlock.text
    );

    const equivalentId = getMatchIds(
      matchStats
    ).find(
      (id) =>
        normalizeMatchId(id) ===
        normalizeMatchId(matchId)
    );

    if (equivalentId) {
      const existingBlock = extractMatchBlock(
        matchStats,
        equivalentId
      );

      if (!existingBlock) {
        throw new Error(
          `No se pudo actualizar ${equivalentId}`
        );
      }

      const protectedBlock = preserveExistingPlayerIds(
  existingBlock.text,
  cleanBlock
);

matchStats =
  matchStats.slice(0, existingBlock.start) +
  protectedBlock +
  matchStats.slice(existingBlock.end);

      updated++;

      console.log(
        `ACTUALIZADO: ${matchId}`
      );
    } else {
      const finalIndex = matchStats.lastIndexOf("};");

      if (finalIndex === -1) {
        throw new Error(
          "No se encontró el cierre de matchStats.js"
        );
      }

      const before = matchStats
        .slice(0, finalIndex)
        .trimEnd();

      const after = matchStats.slice(finalIndex);

      const separator =
        before.endsWith("}") ? "," : "";

      matchStats =
        before +
        separator +
        "\n\n" +
        cleanBlock +
        "\n" +
        after;

      added++;

      console.log(
        `AGREGADO: ${matchId}`
      );
    }
  }
const { Script: ValidationScript } = require("vm");

const validationSource = matchStats
  .replace(
    /^\s*export\s+const\s+matchPlayerStats\s*=/m,
    "const matchPlayerStats ="
  )
  .replace(
    /^\s*export\s+const\s+matchStats\s*=/m,
    "const matchStats ="
  );

const allMatches = new ValidationScript(
  `${validationSource}\nmatchPlayerStats;`
).runInNewContext({}, { timeout: 1000 });

for (const [matchId, matchData] of Object.entries(allMatches)) {
  const ids = new Set();

  for (const [teamId, players] of Object.entries(matchData)) {
    if (!Array.isArray(players)) continue;

   for (const player of players) {
  if (
    typeof player.id !== "string" ||
    !player.id.trim()
  ) {
    throw new Error(
      `Jugador sin ID en ${matchId}, equipo ${teamId}: ` +
      `${player.name || "nombre desconocido"}`
    );
  }

  if (ids.has(player.id)) {
    throw new Error(
      `ID duplicado en ${matchId}: ${player.id}`
    );
  }

  ids.add(player.id);
}
  }
}
  validateSyntax(matchStats);

  if (
    matchStats !==
    fs.readFileSync(matchStatsFile, "utf8")
  ) {
    fs.writeFileSync(
      matchStatsFile,
      matchStats,
      "utf8"
    );
  }

  console.log("");
  console.log("========================================");
  console.log("ACTUALIZACIÓN COMPLETADA");
  console.log("========================================");
  console.log(`Partidos agregados: ${added}`);
  console.log(`Partidos actualizados: ${updated}`);
  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("ERROR ACTUALIZANDO MATCHSTATS");
  console.error(error.message);
  process.exit(1);
}
