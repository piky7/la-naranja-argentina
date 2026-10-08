
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

async function loadData(relativePath, exportName) {
  const filePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${relativePath}`);
  }

  const source = fs.readFileSync(filePath, "utf8");

  // Estos archivos exportan objetos de datos sin imports.
  // Los cargamos sin modificar su contenido original.
  const encoded = Buffer.from(source, "utf8").toString("base64");
  const moduleUrl = `data:text/javascript;base64,${encoded}`;

  const moduleData = await import(moduleUrl);

  if (
    !moduleData[exportName] ||
    typeof moduleData[exportName] !== "object"
  ) {
    throw new Error(`No se encontró ${exportName} en ${relativePath}`);
  }

  return moduleData[exportName];
}

function hasValidPlayers(players) {
  return (
    Array.isArray(players) &&
    players.length > 0 &&
    players.every(
      (player) =>
        player &&
        typeof player.name === "string" &&
        player.name.trim().length > 0 &&
        Number.isFinite(player.points) &&
        Number.isFinite(player.rebounds) &&
        Number.isFinite(player.assists)
    )
  );
}

async function main() {
  const results = await loadData(
    "src/data/matchResults.js",
    "matchResults"
  );

  const stats = await loadData(
    "src/data/matchStats.js",
    "matchPlayerStats"
  );

  const publishedMatches = {};

  for (const [resultKey, result] of Object.entries(results)) {
    if (result?.status !== "finished") continue;

    if (
      !Number.isFinite(result.homeScore) ||
      !Number.isFinite(result.awayScore)
    ) {
      continue;
    }

    // Formato: AAAA-MM-DD-equipo-local-equipo-visitante
    const dateMatch = resultKey.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);

    if (!dateMatch) continue;

    const teamsKey = dateMatch[1];
    const matchStats = stats[teamsKey];

    if (!matchStats || typeof matchStats !== "object") continue;

    const teamIds = Object.keys(matchStats);

    if (teamIds.length !== 2) continue;

    const [homeTeam, awayTeam] = teamIds;

    // Verificamos que las estadísticas correspondan
    // exactamente al partido.
    if (`${homeTeam}-${awayTeam}` !== teamsKey) continue;

    if (
      !hasValidPlayers(matchStats[homeTeam]) ||
      !hasValidPlayers(matchStats[awayTeam])
    ) {
      continue;
    }

    publishedMatches[resultKey] = {
      status: "published",
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      homeTeam,
      awayTeam,
      hasStats: true,
    };
  }

  const output = {
    generatedAt: new Date().toISOString(),
    matches: publishedMatches,
  };

  const publicDir = path.join(ROOT, "public");

  fs.mkdirSync(publicDir, { recursive: true });

  const outputPath = path.join(
    publicDir,
    "published-matches.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(output, null, 2) + "\n",
    "utf8"
  );

  console.log(
    `Partidos publicados con estadísticas: ${
      Object.keys(publishedMatches).length
    }`
  );

  console.log("Archivo generado: public/published-matches.json");
}

main().catch((error) => {
  console.error("Error generando partidos publicados:", error);
  process.exitCode = 1;
});
