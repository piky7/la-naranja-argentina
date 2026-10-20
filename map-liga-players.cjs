
const fs = require("node:fs");

const history = JSON.parse(
  fs.readFileSync("liga-history.json", "utf8")
);

const playersSource = fs.readFileSync(
  "src/data/players.js",
  "utf8"
);

// IDs oficiales de los equipos ya identificados.
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

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Leer los objetos simples de players.js.
const players = [];

for (const match of playersSource.matchAll(/\{[^{}]*\}/g)) {
  const block = match[0];

  const id = block.match(/\bid:\s*["']([^"']+)["']/);
  const name = block.match(/\bname:\s*["']([^"']+)["']/);
  const team = block.match(/\bteamId:\s*["']([^"']+)["']/);
  const number = block.match(/\bnumber:\s*(\d+)/);

  if (!id || !name || !team) continue;

  players.push({
    id: id[1],
    name: name[1],
    teamId: team[1],
    number: number ? Number(number[1]) : null,
  });
}

const officialPlayers = new Map();

for (const match of history.matches) {
  for (const team of match.teams) {
    for (const player of team.players) {
      const key = String(player.officialPlayerId);

      if (!officialPlayers.has(key)) {
        officialPlayers.set(key, {
          officialPlayerId: player.officialPlayerId,
          officialTeamId: team.officialTeamId,
          officialName: player.name.trim(),
          number: player.number,
        });
      }
    }
  }
}

const matched = [];
const review = [];
const unmatched = [];

for (const official of officialPlayers.values()) {
  const teamId = teamMap[official.officialTeamId];

  const candidates = players.filter(
    (player) => player.teamId === teamId
  );

  const officialName = normalize(official.officialName);

  // Formato oficial habitual: APELLIDO, NOMBRES.
  const parts = official.officialName.split(",");

  const surname = normalize(parts[0]);
  const givenNames = normalize(parts.slice(1).join(" "));

  const firstGivenName = givenNames.split(" ")[0];

  const exactMatches = candidates.filter((player) => {
    const name = normalize(player.name);

    return (
      name === officialName ||
      name === normalize(`${givenNames} ${surname}`) ||
      (
        parts.length > 1 &&
        name === normalize(`${firstGivenName} ${surname}`)
      )
    );
  });

  if (exactMatches.length === 1) {
    matched.push({
      ...official,
      lnaPlayerId: exactMatches[0].id,
      lnaName: exactMatches[0].name,
    });
    continue;
  }

  // El dorsal sirve para sugerir, nunca para asignar solo.
  const sameNumber = candidates.filter(
    (player) =>
      player.number !== null &&
      String(player.number) === String(official.number)
  );

  if (sameNumber.length > 0 || exactMatches.length > 1) {
    review.push({
      ...official,
      candidates: [...new Map(
        [...exactMatches, ...sameNumber].map(
          (player) => [player.id, player]
        )
      ).values()],
    });
  } else {
    unmatched.push(official);
  }
}

const report = {
  summary: {
    lnaPlayers: players.length,
    uniqueOfficialPlayers: officialPlayers.size,
    matched: matched.length,
    review: review.length,
    unmatched: unmatched.length,
  },
  matched,
  review,
  unmatched,
};

fs.writeFileSync(
  "liga-player-map-report.json",
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("\n=== MAPEO LIGA NACIONAL → LNA ===");
console.log("Jugadores LNA:", players.length);
console.log("Jugadores oficiales:", officialPlayers.size);
console.log("Coincidencias:", matched.length);
console.log("Para revisar:", review.length);
console.log("Sin coincidencia:", unmatched.length);
console.log("\nArchivo: liga-player-map-report.json");
