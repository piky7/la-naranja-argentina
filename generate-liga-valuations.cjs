
const fs = require("node:fs");

const history = JSON.parse(
  fs.readFileSync("liga-history.json", "utf8")
);

const report = JSON.parse(
  fs.readFileSync("liga-player-map-report.json", "utf8")
);

const teamMap = {
  112600: "lanus",
  112553: "gimnasia",
  114902: "penarol",
  115240: "argentino",
  112566: "ferro",
  113546: "san-martin",
  112809: "instituto",
  113870: "olimpico",
  112549: "platense",
  114561: "regatas",
  112657: "quimsa",
  114763: "la-union",
  112793: "atenas",
  114735: "boca",
  113652: "obera",
  114607: "racing-chivilcoy",
  114628: "independiente-oliva",
  113373: "san-lorenzo",
};

const playerMap = new Map(
  report.matched.map((player) => [
    String(player.officialPlayerId),
    player.lnaPlayerId,
  ])
);

const valuations = {};
const missing = [];

for (const match of history.matches) {
  const home = teamMap[match.teams[0].officialTeamId];
  const away = teamMap[match.teams[1].officialTeamId];

  if (!home || !away) {
    throw new Error("Equipo oficial sin equivalencia");
  }

  const matchKey = `${home}-${away}`;

  if (valuations[matchKey]) {
    throw new Error(`Partido duplicado: ${matchKey}`);
  }

  valuations[matchKey] = {};

  for (const team of match.teams) {
    const teamId = teamMap[team.officialTeamId];

    valuations[matchKey][teamId] = {};

    for (const player of team.players) {
      const playerId = playerMap.get(
        String(player.officialPlayerId)
      );

      if (!playerId) {
        missing.push({
          matchKey,
          teamId,
          officialPlayerId: player.officialPlayerId,
          name: player.name,
        });
        continue;
      }

      valuations[matchKey][teamId][playerId] =
        typeof player.valuation === "number"
          ? player.valuation
          : null;
    }
  }
}
// VALIDACIÓN DE SEGURIDAD
const totalMatches = Object.keys(valuations).length;

if (totalMatches !== 31 || missing.length > 0) {
  console.error("ERROR: No se actualizaron las valoraciones.");
  console.error("Partidos encontrados:", totalMatches);
  console.error("Jugadores pendientes:", missing.length);
  process.exit(1);
}

console.log("Validación correcta: 31 partidos y 0 jugadores pendientes.");
const output =
  "export const officialValuations = " +
  JSON.stringify(valuations, null, 2) +
  ";\n";

fs.writeFileSync(
  "src/data/officialValuations.js",
  output,
  "utf8"
);

fs.writeFileSync(
  "liga-valuation-missing.json",
  JSON.stringify(missing, null, 2),
  "utf8"
);

console.log("Partidos procesados:", Object.keys(valuations).length);
console.log(
  "Registros VAL vinculados:",
  Object.values(valuations).reduce(
    (total, teams) =>
      total +
      Object.values(teams).reduce(
        (sum, players) => sum + Object.keys(players).length,
        0
      ),
    0
  )
);
console.log("Registros pendientes:", missing.length);
console.log("Generado: src/data/officialValuations.js");
