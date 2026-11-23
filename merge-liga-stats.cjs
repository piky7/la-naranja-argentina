
const fs = require("node:fs");
const vm = require("node:vm");

const official = JSON.parse(
  fs.readFileSync("liga-matchstats-preview.json", "utf8")
);

const source = fs.readFileSync(
  "src/data/matchStats.js",
  "utf8"
);

const context = Object.create(null);

vm.runInNewContext(
  source.replace(
    /^\s*export\s+const\s+matchPlayerStats\s*=/,
    "globalThis.matchPlayerStats ="
  ),
  context,
  { timeout: 5000 }
);

const existing = context.matchPlayerStats;

if (!existing || typeof existing !== "object") {
  throw new Error("No se pudo leer matchStats.js");
}

const merged = JSON.parse(JSON.stringify(existing));

let updated = 0;
let added = 0;
let matchesProcessed = 0;
let errors = [];

for (const [matchId, officialMatch] of Object.entries(official)) {
  const currentMatch = existing[matchId];

  if (!currentMatch) {
    errors.push(`Partido inexistente: ${matchId}`);
    continue;
  }

  const homeId = Object.keys(officialMatch).find(
    key => Array.isArray(officialMatch[key])
  );

  const awayId = Object.keys(officialMatch).filter(
    key => Array.isArray(officialMatch[key])
  )[1];

  if (!homeId || !awayId || homeId === awayId) {
    errors.push(`Equipos inválidos: ${matchId}`);
    continue;
  }

  const output = JSON.parse(JSON.stringify(currentMatch));

  for (const teamId of [homeId, awayId]) {
    const currentPlayers = currentMatch[teamId] || [];
    const officialPlayers = officialMatch[teamId];

    if (!Array.isArray(officialPlayers)) {
      errors.push(`Faltan jugadores: ${matchId} / ${teamId}`);
      continue;
    }

    const byId = new Map(
      currentPlayers.map(player => [player.id, { ...player }])
    );

    for (const player of officialPlayers) {
      const previous = byId.get(player.id);

      if (previous) {
        updated++;
      } else {
        added++;
      }

      byId.set(player.id, {
        ...(previous || {}),
        ...player,
      });
    }

    output[teamId] = [...byId.values()];
  }

  // Conservamos los parciales de Flashscore.
  if (currentMatch.quarterScores) {
    output.quarterScores = currentMatch.quarterScores;
  }

  // Verificar duplicados y puntos.
  for (const [teamId, expected] of [
    [homeId, officialMatch.homeScore],
    [awayId, officialMatch.awayScore],
  ]) {
    const players = output[teamId];

    const ids = players.map(p => p.id);

    if (new Set(ids).size !== ids.length) {
      errors.push(`IDs duplicados: ${matchId} / ${teamId}`);
    }

    const total = players.reduce(
      (sum, p) => sum + Number(p.points || 0),
      0
    );

    if (total !== expected) {
      errors.push(
        `Puntos incorrectos: ${matchId} / ${teamId}: ${total} vs ${expected}`
      );
    }
  }

  merged[matchId] = output;
  matchesProcessed++;
}

if (errors.length === 0) {
  fs.writeFileSync(
    "liga-matchstats-merged-preview.json",
    JSON.stringify(merged, null, 2),
    "utf8"
  );
}

console.log("\n=== INTEGRACIÓN OFICIAL LNA ===");
console.log("Partidos procesados:", matchesProcessed);
console.log("Jugadores actualizados:", updated);
console.log("Jugadores incorporados:", added);
console.log("Errores:", errors.length);

for (const error of errors) {
  console.log("ERROR:", error);
}

if (errors.length === 0) {
  console.log(
    "\nArchivo generado: liga-matchstats-merged-preview.json"
  );
} else {
  console.log("\nNo se generó el archivo por errores.");
  process.exitCode = 1;
}
