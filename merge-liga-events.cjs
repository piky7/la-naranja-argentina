const fs = require("node:fs");

const ACTUAL = "liga-events.json";
const NUEVO = "liga-events-preview.json";
const actual = JSON.parse(fs.readFileSync(ACTUAL, "utf8"));
const nuevo = JSON.parse(fs.readFileSync(NUEVO, "utf8"));

if (!Array.isArray(nuevo.matches) || !nuevo.matches.length) {
  throw new Error("El calendario oficial consultado está vacío.");
}

const clave = (partido) =>
  `${partido.date}|${partido.home.officialTeamId}|${partido.away.officialTeamId}`;
const hoyArgentina = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const inicio = nuevo.dateFrom;
const fin = nuevo.dateTo;
const modoCompleto = process.env.OFFICIAL_SYNC_MODE !== "recent";

if (modoCompleto && (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fin || "") || fin < hoyArgentina)) {
  throw new Error("Rango del calendario oficial inválido; no se modifica el historial.");
}

// En una consulta completa, la Liga es la fuente de verdad de los partidos
// futuros dentro del intervalo consultado. Esto permite quitar fechas viejas
// de partidos reprogramados sin borrar encuentros históricos.
const partidos = new Map();
let retirados = 0;
for (const partido of actual.matches) {
  const esFuturoCubierto = modoCompleto &&
    partido.date >= hoyArgentina && partido.date >= inicio && partido.date <= fin;
  if (esFuturoCubierto) {
    retirados++;
    continue;
  }
  partidos.set(clave(partido), partido);
}

let incorporados = 0;
for (const partido of nuevo.matches) {
  const key = clave(partido);
  const anterior = partidos.get(key) ||
    actual.matches.find((m) => clave(m) === key);
  if (!anterior) incorporados++;
  // Las URL oficiales cifradas pueden rotar. Mantener la URL previa si
  // coincide fecha y equipos, para no romper referencias del historial.
  partidos.set(key, {
    ...partido,
    officialUrl: anterior?.officialUrl || partido.officialUrl,
  });
}

const resultado = {
  ...actual,
  dateTo: [actual.dateTo, nuevo.dateTo].filter(Boolean).sort().at(-1),
  matches: [...partidos.values()].sort((a, b) =>
    `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`)
  ),
};

fs.copyFileSync(ACTUAL, "liga-events.pre-sync.backup.json");
fs.writeFileSync(ACTUAL, JSON.stringify(resultado, null, 2) + "\n", "utf8");
console.log("Modo:", modoCompleto ? "calendario completo" : "partidos recientes");
console.log("Partidos anteriores:", actual.matches.length);
console.log("Registros futuros reemplazados:", retirados);
console.log("Partidos nuevos:", incorporados);
console.log("Total:", resultado.matches.length);
