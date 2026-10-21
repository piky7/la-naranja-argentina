const fs = require("node:fs");

const ACTUAL = "liga-events.json";
const NUEVO = "liga-events-preview.json";

const actual = JSON.parse(fs.readFileSync(ACTUAL, "utf8"));
const nuevo = JSON.parse(fs.readFileSync(NUEVO, "utf8"));

if (!Array.isArray(nuevo.matches) || !nuevo.matches.length) {
  throw new Error("El calendario nuevo está vacío.");
}

const clave = (partido) =>
  `${partido.date}|${partido.home.officialTeamId}|${partido.away.officialTeamId}`;

const partidos = new Map(
  actual.matches.map((partido) => [clave(partido), partido])
);

let agregados = 0;

for (const partido of nuevo.matches) {
  const key = clave(partido);

  if (!partidos.has(key)) {
    partidos.set(key, partido);
    agregados++;
  } else {
    // Refresh existing snapshots too: their scores may still be partial.
    // Official encrypted URLs rotate between requests; keep the working URL
    // used by the history while refreshing this match's mutable fields.
    partidos.set(key, { ...partido, officialUrl: partidos.get(key).officialUrl });
  }
}

const resultado = {
  ...actual,
  // A recent-only refresh must not shrink the stored season coverage.
  dateTo: [actual.dateTo, nuevo.dateTo].filter(Boolean).sort().at(-1),
  matches: [...partidos.values()].sort((a, b) =>
    `${a.date} ${a.time ?? ""}`.localeCompare(
      `${b.date} ${b.time ?? ""}`
    )
  ),
};

fs.copyFileSync(
  ACTUAL,
  "liga-events.pre-sync.backup.json"
);

fs.writeFileSync(
  ACTUAL,
  JSON.stringify(resultado, null, 2) + "\n",
  "utf8"
);

console.log("Partidos anteriores:", actual.matches.length);
console.log("Partidos incorporados:", agregados);
console.log("Total:", resultado.matches.length);
