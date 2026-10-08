
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

      matchStats =
        matchStats.slice(0, existingBlock.start) +
        cleanBlock +
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
