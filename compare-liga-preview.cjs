
const fs = require("node:fs");

const preview = JSON.parse(
  fs.readFileSync("liga-matchstats-preview.json", "utf8")
);

const source = fs.readFileSync(
  "src/data/matchStats.js",
  "utf8"
);

const vm = require("node:vm");

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
  throw new Error("No se pudo leer matchPlayerStats");
}

let compared = 0;
let differences = 0;
let missing = 0;

for (const [matchId, officialMatch] of Object.entries(preview)) {
  const currentMatch = existing[matchId];

  if (!currentMatch) {
    console.log("PARTIDO SIN STATS:", matchId);
    continue;
  }

  for (const [teamId, officialPlayers] of Object.entries(officialMatch)) {
    if (!Array.isArray(officialPlayers)) continue;

    const currentPlayers = currentMatch[teamId] || [];

    for (const player of officialPlayers) {
      const current = currentPlayers.find(
        p => p.id === player.id
      );

      if (!current) {
        missing++;
        console.log(
          "JUGADOR FALTANTE:",
          matchId,
          player.name
        );
        continue;
      }

      compared++;

      const fields = [
        "points",
        "rebounds",
        "assists",
        "minutes",
      ];

      for (const field of fields) {
        if (current[field] !== player[field]) {
          differences++;

          console.log(
            "DIFERENCIA:",
            matchId,
            player.name,
            field,
            "Flashscore:",
            current[field],
            "Oficial:",
            player[field]
          );
        }
      }
    }
  }
}

console.log("\n=== COMPARACIÓN ===");
console.log("Jugadores comparados:", compared);
console.log("Jugadores faltantes:", missing);
console.log("Diferencias:", differences);
