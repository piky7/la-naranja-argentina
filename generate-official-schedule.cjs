const fs = require("node:fs");

const INPUT = "liga-events.json";
const OUTPUT = "src/data/officialSchedule.js";

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

const data = JSON.parse(
  fs.readFileSync(INPUT, "utf8")
);

const partidos = [];
const claves = new Set();

for (const partido of data.matches) {
  const homeTeam = teamMap[partido.home.officialTeamId];
  const awayTeam = teamMap[partido.away.officialTeamId];

  if (!homeTeam || !awayTeam) {
    throw new Error(
      `Equipo desconocido: ${partido.home.name} vs ${partido.away.name}`
    );
  }

  const key = `${partido.date}-${homeTeam}-${awayTeam}`;

  if (claves.has(key)) continue;
  claves.add(key);

  partidos.push({
    id: key,
    date: partido.date,
    time: partido.time === "00:00" ? null : partido.time,
    homeTeam,
    awayTeam,
    officialUrl: partido.officialUrl,
  });
}

partidos.sort((a, b) =>
  `${a.date} ${a.time || ""}`.localeCompare(
    `${b.date} ${b.time || ""}`
  )
);

fs.writeFileSync(
  OUTPUT,
  `export const officialSchedule = ${JSON.stringify(partidos, null, 2)};\n`,
  "utf8"
);

console.log(`Partidos oficiales generados: ${partidos.length}`);
console.log(`Archivo: ${OUTPUT}`);