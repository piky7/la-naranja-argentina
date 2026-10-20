
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
  report.matched.map(p => [
    String(p.officialPlayerId),
    {
      id: p.lnaPlayerId,
      name: p.lnaName,
    },
  ])
);

const preview = {};
const errors = [];

function number(value) {
  return value == null ? null : Number(value);
}

function shots(data) {
  if (!data) return null;

  return {
    made: number(data.Aciertos),
    attempted: number(data.Totales),
    percentage: number(data.Porcentaje),
  };
}

for (const match of history.matches) {
  const home = match.teams[0];
  const away = match.teams[1];

  const homeId = teamMap[home.officialTeamId];
  const awayId = teamMap[away.officialTeamId];

  if (!homeId || !awayId) {
    errors.push(`Equipo desconocido: ${match.date}`);
    continue;
  }

  const key = `${homeId}-${awayId}`;

  if (preview[key]) {
    errors.push(`Partido duplicado: ${key}`);
    continue;
  }

  const output = {
    date: match.date,
    officialUrl: match.officialUrl,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    [homeId]: [],
    [awayId]: [],
  };

  for (const [team, teamId] of [
    [home, homeId],
    [away, awayId],
  ]) {
    for (const player of team.players) {
      const mapped = playerMap.get(
        String(player.officialPlayerId)
      );

      if (!mapped) {
        errors.push(
          `Jugador sin mapear: ${player.name}`
        );
        continue;
      }

      output[teamId].push({
        id: mapped.id,
        name: mapped.name,
        points: number(player.points),
        rebounds: number(player.rebounds),
        assists: number(player.assists),
        minutes: player.minutes,
        valuation: number(player.valuation),
        starter: player.starter,
        steals: number(player.steals),
        turnovers: number(player.turnovers),
        offensiveRebounds: number(player.offensiveRebounds),
        defensiveRebounds: number(player.defensiveRebounds),
        twoPointers: shots(player.twoPointers),
        threePointers: shots(player.threePointers),
        freeThrows: shots(player.freeThrows),
        plusMinus: number(player.plusMinus),
      });
    }
  }

  for (const [teamId, expected] of [
    [homeId, match.homeScore],
    [awayId, match.awayScore],
  ]) {
    const total = output[teamId].reduce(
      (sum, p) => sum + (p.points ?? 0),
      0
    );

    if (total !== expected) {
      errors.push(
        `${key}: ${teamId} suma ${total}, resultado ${expected}`
      );
    }
  }

  preview[key] = output;
}

fs.writeFileSync(
  "liga-matchstats-preview.json",
  JSON.stringify(preview, null, 2),
  "utf8"
);

console.log("\n=== PREVIEW ESTADÍSTICAS OFICIALES ===");
console.log("Partidos:", Object.keys(preview).length);
console.log(
  "Jugadores:",
  Object.values(preview).reduce(
    (sum, match) =>
      sum +
      Object.entries(match)
        .filter(([key, value]) =>
          Array.isArray(value)
        )
        .reduce((n, [, players]) => n + players.length, 0),
    0
  )
);
console.log("Errores:", errors.length);

for (const error of errors) {
  console.log("ERROR:", error);
}

console.log("\nArchivo: liga-matchstats-preview.json");

if (errors.length > 0) {
  process.exitCode = 1;
}
