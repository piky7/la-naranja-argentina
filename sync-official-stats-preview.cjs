const auditedFinals = require("./scripts/audited-official-finals.json");
const { isConfirmedFinal } = require("./scripts/official-final.cjs");
const fs = require("node:fs");

const FIXTURE_FILE = "liga-events.json";
const HISTORY_FILE = "liga-history.json";
const OUTPUT_FILE = "official-sync-preview.json";

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

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sumPoints(team) {
  return team.players.reduce((sum, player) => sum + Number(player.points || 0), 0);
}

async function main() {
  if (!fs.existsSync(FIXTURE_FILE)) throw new Error("No existe liga-events.json");
  if (!fs.existsSync(HISTORY_FILE) || !fs.readFileSync(HISTORY_FILE, "utf8").trim()) {
    throw new Error("No hay historial oficial utilizable en liga-history.json");
  }

  const fixture = readJson(FIXTURE_FILE);
  const history = readJson(HISTORY_FILE);
  if (fixture.source !== "Liga Nacional" || history.source !== "Liga Nacional") {
    throw new Error("La fuente declarada no es Liga Nacional. Se cancela la sincronización.");
  }
  if (!Array.isArray(fixture.matches) || !Array.isArray(history.matches)) {
    throw new Error("Estructura inválida en fixture o historial oficial.");
  }

  const { players } = await import("./src/data/players.js");
  const playersByOfficialId = new Map();
  const playersByTeamAndName = new Map();

  for (const player of players) {
    if (player.officialPlayerId != null) {
      playersByOfficialId.set(String(player.officialPlayerId), player);
    }
    const key = `${player.teamId}| ${normalizeName(player.name)}`;
    if (!playersByTeamAndName.has(key)) playersByTeamAndName.set(key, []);
    playersByTeamAndName.get(key).push(player);
  }

  const fixtureByUrl = new Map(fixture.matches.map((match) => [match.officialUrl, match]));
  const statsByMatch = {};
  const resultsByMatch = {};
  const skipped = [];
  let verified = 0;

  for (const record of history.matches) {
    const official = fixtureByUrl.get(record.officialUrl);
    if (!official) {
      const reason = "La URL no figura en el fixture oficial actual.";
      skipped.push({ date: record.date, reason });
      console.log("OMITIDO", record.date, reason, record.officialUrl);
      continue;
    }

    // Preserve only the already audited historical snapshot. New games fail closed.
    const historicalKey = `${record.date}-${teamMap[official.home.officialTeamId]}-${teamMap[official.away.officialTeamId]}`;
    const baseline = auditedFinals[historicalKey];
    const historical = record.date === official.date && baseline &&
      baseline.officialUrl === record.officialUrl &&
      baseline.homeScore === official.homeScore && baseline.awayScore === official.awayScore;
    if (!historical && !isConfirmedFinal(record)) {
      skipped.push({ date: record.date, reason: "Sin evidencia oficial de finalización." });
      continue;
    }

    const homeTeamId = teamMap[official.home.officialTeamId];
    const awayTeamId = teamMap[official.away.officialTeamId];
    if (!homeTeamId || !awayTeamId) {
      const reason = "Equipo oficial sin correspondencia interna.";
      skipped.push({ date: record.date, reason });
      console.log("OMITIDO", record.date, reason, official.home.officialTeamId, official.away.officialTeamId);
      continue;
    }

    if (
      record.date !== official.date ||
      !Number.isInteger(official.homeScore) ||
      !Number.isInteger(official.awayScore) ||
      official.homeScore === 0 && official.awayScore === 0 ||
      record.homeScore !== official.homeScore ||
      record.awayScore !== official.awayScore
    ) {
      const reason = "El marcador del historial no coincide con el marcador oficial del fixture.";
      skipped.push({ date: record.date, reason, historyScore: [record.homeScore, record.awayScore], fixtureScore: [official.homeScore, official.awayScore] });
      console.log("OMITIDO", record.date, reason, [record.homeScore, record.awayScore], [official.homeScore, official.awayScore]);
      continue;
    }

    const homeOfficial = record.teams?.find((team) => team.officialTeamId === official.home.officialTeamId);
    const awayOfficial = record.teams?.find((team) => team.officialTeamId === official.away.officialTeamId);
    if (!homeOfficial || !awayOfficial || !homeOfficial.players?.length || !awayOfficial.players?.length) {
      const reason = "Faltan equipos o jugadores extraídos de la página oficial.";
      skipped.push({ date: record.date, reason });
      console.log("OMITIDO", record.date, reason, record.officialUrl);
      continue;
    }

    if (sumPoints(homeOfficial) !== official.homeScore || sumPoints(awayOfficial) !== official.awayScore) {
      const reason = "La suma de puntos individuales no coincide con el marcador oficial.";
      skipped.push({ date: record.date, reason, playerPoints: [sumPoints(homeOfficial), sumPoints(awayOfficial)], fixtureScore: [official.homeScore, official.awayScore] });
      console.log("OMITIDO", record.date, reason, [sumPoints(homeOfficial), sumPoints(awayOfficial)], [official.homeScore, official.awayScore]);
      continue;
    }

    const unresolved = [];
    const convertTeam = (sourceTeam, internalTeamId) => sourceTeam.players.map((player) => {
      let found = player.officialPlayerId != null
        ? playersByOfficialId.get(String(player.officialPlayerId))
        : null;

      if (found && found.teamId !== internalTeamId) found = null;

      if (!found) {
        // La Liga suele publicar "APELLIDO, NOMBRE(S)" y el roster LNA
        // suele usar "Nombre Apellido". Solo aceptamos una coincidencia
        // única dentro del mismo equipo, con todos los tokens del roster
        // presentes en el nombre oficial.
        const officialTokens = new Set(normalizeName(player.name).split(" ").filter(Boolean));
        const candidates = players.filter((candidate) => {
          if (candidate.teamId !== internalTeamId) return false;
          const rosterTokens = normalizeName(candidate.name).split(" ").filter(Boolean);
          return rosterTokens.length >= 2 && rosterTokens.every((token) => officialTokens.has(token));
        });
        if (candidates.length === 1) found = candidates[0];
      }

      if (!found) {
        unresolved.push(`${player.name} (${internalTeamId})`);
        return null;
      }

      return {
        id: found.id,
        name: found.name,
        points: Number(player.points || 0),
        rebounds: Number(player.rebounds || 0),
        assists: Number(player.assists || 0),
        minutes: player.minutes || "00:00",
        valuation: player.valuation ?? null,
        steals: Number(player.steals || 0),
        turnovers: Number(player.turnovers || 0),
        offensiveRebounds: Number(player.offensiveRebounds || 0),
        defensiveRebounds: Number(player.defensiveRebounds || 0),
        twoPointers: player.twoPointers ?? null,
        threePointers: player.threePointers ?? null,
        freeThrows: player.freeThrows ?? null,
        plusMinus: player.plusMinus ?? null,
        number: player.number ?? null,
        starter: Boolean(player.starter),
      };
    });

    const homePlayers = convertTeam(homeOfficial, homeTeamId);
    const awayPlayers = convertTeam(awayOfficial, awayTeamId);
    if (unresolved.length || homePlayers.some((p) => !p) || awayPlayers.some((p) => !p)) {
      skipped.push({
        date: record.date,
        reason: "No se publicará el partido porque hay jugadores oficiales sin correspondencia inequívoca en players.js.",
        unresolved,
      });
      console.log("OMITIDO", record.date, "Jugadores sin correspondencia:", unresolved.join(", "));
      continue;
    }

    const key = `${record.date}-${homeTeamId}-${awayTeamId}`;
    if (Object.prototype.hasOwnProperty.call(statsByMatch, key)) {
      skipped.push({
        date: record.date,
        reason: `Clave duplicada (${key}); se conserva el primer registro para evitar sobrescribir estadísticas.`,
      });
      console.warn(`OMITIDO POR CLAVE DUPLICADA: ${key}`);
      continue;
    }

    statsByMatch[key] = {
      source: "Liga Nacional",
      officialUrl: record.officialUrl,
      homeTeam: homeTeamId,
      awayTeam: awayTeamId,
      homeScore: official.homeScore,
      awayScore: official.awayScore,
      [homeTeamId]: homePlayers,
      [awayTeamId]: awayPlayers,
    };

    resultsByMatch[key] = {
      status: "finished", homeScore: official.homeScore, awayScore: official.awayScore,
      time: official.time || null, homeTeam: homeTeamId, awayTeam: awayTeamId,
      venue: null, tv: [], source: "Liga Nacional", officialUrl: official.officialUrl,
      finalEvidence: historical
        ? { type: "audited-history-through-2026-10-19", officialUrl: official.officialUrl }
        : record.finalEvidence,
    };
    verified++;
    console.log(`VERIFICADO LNB: ${record.date} ${official.home.name} ${official.homeScore}-${official.awayScore} ${official.away.name}; puntos individuales coinciden y jugadores identificados.`);
  }

  const output = {
    source: "Liga Nacional",
    generatedAt: new Date().toISOString(),
    verifiedMatches: verified,
    skippedMatches: skipped.length,
    matchStats: statsByMatch,
    matchResults: resultsByMatch,
    skipped,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log("");
  console.log(`Partidos oficiales validados y listos para publicar: ${verified}`);
  console.log(`Partidos omitidos por validación/mapeo: ${skipped.length}`);
  console.log(`Vista previa generada: ${OUTPUT_FILE}`);

  // Results and statistics must pass the same validation.
  if (Object.keys(statsByMatch).length !== verified || Object.keys(resultsByMatch).length < verified) {
    throw new Error("La cantidad de estadísticas verificadas no coincide con sus claves únicas o faltan resultados oficiales.");
  }

  if (verified === 0) {
    throw new Error("No se validó ningún partido oficial. No se debe publicar ninguna actualización.");
  }
}

main().catch((error) => {
  console.error("Error en sincronización oficial:", error.message);
  process.exitCode = 1;
});
