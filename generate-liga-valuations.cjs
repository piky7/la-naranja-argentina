
const fs = require("node:fs");

const history = JSON.parse(
  fs.readFileSync("liga-history.json", "utf8")
);

const report = JSON.parse(
  fs.readFileSync("liga-player-map-report.json", "utf8")
);

const teamMap = {
  114763: "la-union",
  114607: "racing-chivilcoy",
  112549: "platense",
  113652: "obera",
  113373: "san-lorenzo",
  114902: "penarol",
  114561: "regatas",
  113870: "olimpico",
  114628: "independiente-oliva",
  112600: "lanus",
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
