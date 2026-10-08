
const fs = require("fs");
const { Script } = require("vm");

const inputFile = "flashscore-normalized.json";
const playersFile = "src/data/players.js";

const apply = process.argv.includes("--apply");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function readPlayers(source) {
  // Leemos el array existente sin modificarlo.
  const transformed = source.replace(
    /^\s*export\s+const\s+players\s*=/m,
    "const players ="
  );

  if (transformed === source) {
    throw new Error("No se encontró export const players.");
  }

  const players = new Script(
    `${transformed}\nplayers;`
  ).runInNewContext({}, { timeout: 1000 });

  if (!Array.isArray(players)) {
    throw new Error("players.js no contiene un array válido.");
  }

  return players;
}

function main() {
  console.log("====================================");
  console.log("SINCRONIZADOR DE JUGADORES LNA");
  console.log("====================================");
  console.log(
    apply ? "MODO: APLICAR CAMBIOS" : "MODO: SIMULACIÓN"
  );

  if (!fs.existsSync(inputFile)) {
    throw new Error(`No existe ${inputFile}`);
  }

  if (!fs.existsSync(playersFile)) {
    throw new Error(`No existe ${playersFile}`);
  }

  const match = JSON.parse(
    fs.readFileSync(inputFile, "utf8")
  );

  if (!Array.isArray(match.players)) {
    throw new Error("El archivo no contiene jugadores.");
  }

  if (
    !match.homeTeam ||
    !match.awayTeam ||
    match.homeTeam === match.awayTeam
  ) {
    throw new Error("Equipos del partido inválidos.");
  }

  const original = fs.readFileSync(playersFile, "utf8");
  const existing = readPlayers(original);

  const knownIds = new Set(existing.map(p => p.id));
  const knownNames = new Set(
    existing.map(
      p => `${p.teamId}|${normalizeText(p.name)}`
    )
  );

  const additions = [];
  const skipped = [];

  for (const player of match.players) {
    const { id, name, teamId } = player;
    // Evitar altas automáticas de nombres abreviados.
// Ejemplos: "Merchant E.", "Ramírez C."
const normalizedPlayerName = normalizeText(name);

const nameParts = normalizedPlayerName
  .split(" ")
  .filter(Boolean);

const hasInitial = nameParts.some(
  (part) => part.length === 1
);

if (
  typeof id === "string" &&
  id.startsWith("flashscore-") &&
  hasInitial
) {
  skipped.push(
    `${name}: nombre abreviado, requiere revisión`
  );

  continue;
}

    if (
      typeof id !== "string" ||
      !id.startsWith("flashscore-")
    ) {
      continue;
    }

    if (
  typeof name !== "string" ||
  !normalizeText(name) ||
  ![match.homeTeam, match.awayTeam].includes(teamId)
) {
  console.log("DEBUG JUGADOR:", {
    id,
    name,
    teamId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
  });

  skipped.push(`${name || "Sin nombre"}: datos inválidos`);
  continue;
}

    const expectedId =
      `flashscore-${teamId}-` +
      normalizeText(name).replace(/\s+/g, "-");

    if (id !== expectedId) {
      skipped.push(`${name}: ID provisional inesperado`);
      continue;
    }

    const nameKey = `${teamId}|${normalizeText(name)}`;

    if (knownIds.has(id) || knownNames.has(nameKey)) {
      continue;
    }

    const newPlayer = {
      id,
      name: name.trim(),
      teamId,
      position: null,
      number: null,
      nationality: null,
    };

    additions.push(newPlayer);
    knownIds.add(id);
    knownNames.add(nameKey);
  }

  console.log(`Jugadores existentes: ${existing.length}`);
  console.log(`Jugadores nuevos: ${additions.length}`);

  for (const player of additions) {
    console.log(`+ ${player.name} (${player.teamId})`);
  }

  for (const reason of skipped) {
    console.log(`OMITIDO: ${reason}`);
  }

  if (additions.length === 0) {
    console.log("No hay jugadores nuevos para agregar.");
    return;
  }

  if (!apply) {
    console.log("");
    console.log("SIMULACIÓN COMPLETADA.");
    console.log("players.js no fue modificado.");
    return;
  }

  // Insertamos únicamente antes del cierre del array.
  const closingMatch = /\]\s*;\s*$/.exec(original);

  if (!closingMatch) {
    throw new Error(
      "No se encontró el cierre esperado de players.js."
    );
  }

  const insertionPoint = closingMatch.index;
  const before = original.slice(0, insertionPoint);
  const after = original.slice(insertionPoint);

  const entries = additions.map(player => {
    const fields = Object.entries(player)
      .map(
        ([key, value]) =>
          `    ${key}: ${JSON.stringify(value)},`
      )
      .join("\n");

    return `  {\n${fields}\n  },`;
  }).join("\n\n");

  const updated =
    before.trimEnd() +
    "\n\n  // JUGADORES INCORPORADOS AUTOMÁTICAMENTE\n" +
    entries +
    "\n" +
    after;

  // Comprobamos sintaxis y cantidad antes de guardar.
  const updatedPlayers = readPlayers(updated);

  if (
    updatedPlayers.length !==
    existing.length + additions.length
  ) {
    throw new Error("Falló la validación del nuevo listado.");
  }

  fs.writeFileSync(playersFile, updated, "utf8");

  console.log("");
  console.log(`${additions.length} jugadores incorporados.`);
  console.log(`Archivo actualizado: ${playersFile}`);
}

try {
  main();
} catch (error) {
  console.error("ERROR:", error.message);
  process.exitCode = 1;
}
