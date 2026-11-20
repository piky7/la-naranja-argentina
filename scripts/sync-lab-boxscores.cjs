const fs = require("node:fs");
const path = require("node:path");
const cheerio = require("cheerio");
const fixture = require("../data/lab/labSchedule.json");

const TARGET_ARG = process.argv.find(arg => arg.startsWith("--match="));
const TARGET = TARGET_ARG ? TARGET_ARG.slice("--match=".length) : null;
const ALL_FINISHED = process.argv.includes("--all-finished");
const REFRESH_COMPARISON = process.argv.includes("--refresh-comparison");
const PAUSE_MS = 900;
const OUTPUT = path.join(__dirname, "../data/lab/labBoxscores.json");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

function parseFirstObject(call) {
  const start = call.indexOf("{");
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < call.length; i++) {
    const ch = call[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try { return JSON.parse(call.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function normalizePlayer(raw, row) {
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const made = key => number(raw[key]?.Aciertos);
  const attempted = key => number(raw[key]?.Totales);
  return {
    id: number(raw.IdJugador), clubId: number(raw.IdClub), teamId: number(raw.IdEquipo),
    number: String(raw.Dorsal ?? ""), name: String(raw.NombreCompleto || raw.Nombre || "").trim(),
    shortName: String(raw.Nombre || "").trim(), minutes: String(raw.TiempoJuego || row.minutes || "0:00"),
    points: number(raw.Puntos),
    twoPointers: { made: made("TirosDos"), attempted: attempted("TirosDos") },
    threePointers: { made: made("TirosTres"), attempted: attempted("TirosTres") },
    freeThrows: { made: made("TirosLibres"), attempted: attempted("TirosLibres") },
    rebounds: number(raw.RebotesTotales),
    offensiveRebounds: number(raw.ReboteOfensivo), defensiveRebounds: number(raw.ReboteDefensivo),
    assists: number(raw.Asistencias), steals: number(raw.Recuperaciones), turnovers: number(raw.Perdidas),
    blocks: number(raw.TaponCometido), blocksReceived: number(raw.TaponRecibido),
    fouls: number(raw.FaltaCometida), foulsReceived: number(raw.FaltaRecibida),
    valuation: number(raw.Valoracion), plusMinus: number(raw.MasMenos),
    starter: Boolean(raw.CincoInicial)
  };
}

function parseOfficialTeamComparison($) {
  const root = $("#scroll-comparativa .tablaResultadosEstadisticas");
  const lines = root.find(".linea");
  if (!root.length || lines.length < 9) return null;
  const readLine = line => {
    const cols = $(line).children(".col");
    if (cols.length < 3) return null;
    const label = cols.eq(1).find(".stat-nombre-abrev").text().trim() ||
      cols.eq(1).find(".stat-nombre-completo").text().trim();
    const left = cols.eq(0).text().replace(/\\s+/g, " ").trim();
    const right = cols.eq(2).text().replace(/\\s+/g, " ").trim();
    const parseValue = value => {
      const shot = value.match(/(\\d+)\\s*\\/\\s*(\\d+)\\s*(?:([\\d.,]+)\\s*%)?/);
      if (shot) return { made: Number(shot[1]), attempted: Number(shot[2]), percentage: Number(String(shot[3] || "0").replace(",", ".")) };
      const numeric = value.match(/-?\\d+/);
      return numeric ? Number(numeric[0]) : null;
    };
    return { label, home: parseValue(left), away: parseValue(right) };
  };
  const rows = lines.toArray().map(readLine).filter(Boolean);
  const aliases = {
    "TC": "fieldGoals", "2P": "twoPointers", "3P": "threePointers", "TL": "freeThrows",
    "Reb.": "rebounds", "As.": "assists", "Rec.": "steals", "Tap.": "blocks",
    "Pér.": "turnovers", "Faltas Com.": "fouls"
  };
  const home = {}, away = {};
  for (const row of rows) {
    const key = aliases[row.label];
    if (!key || row.home == null || row.away == null) continue;
    home[key] = row.home;
    away[key] = row.away;
  }
  const required = Object.values(aliases);
  if (!required.every(key => home[key] != null && away[key] != null)) return null;
  const teamNames = {
    home: root.find(".tituloEquipoLocal strong").first().text().trim(),
    away: root.find(".tituloEquipoVisitante strong").first().text().trim()
  };
  return { source: "Comparativa oficial del boxscore LAB", method: "official-boxscore-comparison",
    teamNames, home, away };
}

async function main() {
  const importedAtStart = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, "utf8")) : {};
  const today = new Date().toISOString().slice(0, 10);
  const matches = fixture.matches.filter(match => {
    if (TARGET) return match.id === TARGET;
    if (!ALL_FINISHED) return true;
    const date = String(match.date || "");
    const hasRealScore = match.homeScore != null && match.awayScore != null &&
      !(Number(match.homeScore) === 0 && Number(match.awayScore) === 0);
    return date <= today && hasRealScore && (!importedAtStart[match.id] || REFRESH_COMPARISON);
  });
  if (!matches.length) {
    console.log("No hay partidos pendientes para importar.");
    return;
  }
  const output = importedAtStart;
  let importedThisRun = 0, skipped = 0, failed = 0;
  for (const [index, match] of matches.entries()) {
    try {
      if (!match.officialUrl) { skipped++; continue; }
      let response, lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch(match.officialUrl, { headers: { "User-Agent": UA, Accept: "text/html" } });
          if (!response.ok) throw new Error("HTTP " + response.status);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
        }
      }
      if (!response?.ok) throw lastError || new Error("No se pudo obtener la planilla");
      const $ = cheerio.load(await response.text());
      const tables = $(".tabla-estadisticas");
      if (tables.length !== 2) {
        console.log("SIN PLANILLA COMPLETA:", match.id, "tablas:", tables.length);
        skipped++;
      } else {
        const players = [];
        tables.each((_, table) => {
          $(table).find("tbody tr").each((__, row) => {
            const $row = $(row);
            const onclick = $row.attr("onclick") || $row.find("[onclick]").first().attr("onclick") || "";
            const raw = parseFirstObject(onclick);
            if (!raw?.IdJugador || !raw?.IdEquipo) return;
            players.push(normalizePlayer(raw, { minutes: $row.find("td").eq(3).text().trim() }));
          });
        });
        const teams = [...new Set(players.map(player => player.teamId))];
        if (teams.length !== 2 || players.length < 2) {
          console.log("PLANILLA INCOMPLETA:", match.id, "equipos:", teams.length, "jugadores:", players.length);
          skipped++;
        } else {
          output[match.id] = {
            matchId: match.id, date: match.date, season: match.season,
            homeTeamId: match.homeTeam.teamId, awayTeamId: match.awayTeam.teamId,
            homeScore: Number(match.homeScore), awayScore: Number(match.awayScore),
            source: "Liga Nacional oficial", officialUrl: match.officialUrl,
            importedAt: new Date().toISOString(), players,
            teamComparison: parseOfficialTeamComparison($)
          };
          fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");
          importedThisRun++;
          console.log("BOX SCORE IMPORTADO", match.homeTeam.name, match.awayTeam.name,
            "jugadores:", players.length, "progreso:", index + 1, "/", matches.length);
        }
      }
    } catch (error) {
      failed++;
      console.log("ERROR PARTIDO", match.id, error.message);
    }
    if (index < matches.length - 1) await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");
  console.log("RESUMEN IMPORTACIÓN:", JSON.stringify({
    solicitados: matches.length, importados: importedThisRun, omitidos: skipped,
    errores: failed, totalBase: Object.keys(output).length
  }));
  console.log("ARCHIVO:", OUTPUT);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
