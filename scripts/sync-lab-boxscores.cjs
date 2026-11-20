const fs = require("node:fs");
const path = require("node:path");
const cheerio = require("cheerio");
const fixture = require("../data/lab/labSchedule.json");

const TARGET_ARG = process.argv.find(arg => arg.startsWith("--match="));
const TARGET = TARGET_ARG ? TARGET_ARG.slice("--match=".length) : null;
const ALL_FINISHED = process.argv.includes("--all-finished");
const RECENT = process.argv.includes("--recent");
const REFRESH = process.argv.includes("--refresh-comparison");
const PAUSE_MS = 900;
const OUTPUT = path.join(__dirname, "../data/lab/labBoxscores.json");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

function parseFirstObject(call) {
  const start = String(call || "").indexOf("{");
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < call.length; i++) {
    const ch = call[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\\\") escaped = true;
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

function number(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function parseScore(value) {
  const match = String(value || "").replace(/\\s+/g, "").match(/^\\d{1,3}$/);
  return match ? Number(match[0]) : null;
}
function isOfficialFinal(statusText) {
  const value = String(statusText || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/\\s+/g, " ").trim().toLowerCase();
  if (!value || /en juego|en curso|jugando|descanso|entretiempo|cuarto|periodo|programado|suspendido|postergado|aplazado/.test(value)) return false;
  return /^(final|finalizado|finalizada|terminado|terminada|partido finalizado|final del partido)$/.test(value) ||
    /\\b(partido finalizado|final del partido|encuentro finalizado)\\b/.test(value);
}
function normalizePlayer(raw, row) {
  const safe = key => number(raw[key]) ?? 0;
  const made = key => safe(key) >= 0 ? safe(key) : 0;
  const attempts = key => safe(key) >= 0 ? safe(key) : 0;
  return {
    id: safe("IdJugador"), clubId: safe("IdClub"), teamId: safe("IdEquipo"),
    number: String(raw.Dorsal ?? ""), name: String(raw.NombreCompleto || raw.Nombre || "").trim(),
    shortName: String(raw.Nombre || "").trim(), minutes: String(raw.TiempoJuego || row.minutes || "0:00"),
    points: safe("Puntos"),
    twoPointers: { made: made(raw.TirosDos?.Aciertos), attempted: attempts(raw.TirosDos?.Totales) },
    threePointers: { made: made(raw.TirosTres?.Aciertos), attempted: attempts(raw.TirosTres?.Totales) },
    freeThrows: { made: made(raw.TirosLibres?.Aciertos), attempted: attempts(raw.TirosLibres?.Totales) },
    rebounds: safe("RebotesTotales"), offensiveRebounds: safe("ReboteOfensivo"),
    defensiveRebounds: safe("ReboteDefensivo"), assists: safe("Asistencias"),
    steals: safe("Recuperaciones"), turnovers: safe("Perdidas"),
    blocks: safe("TaponCometido"), blocksReceived: safe("TaponRecibido"),
    fouls: safe("FaltaCometida"), foulsReceived: safe("FaltaRecibida"),
    valuation: safe("Valoracion"), plusMinus: safe("MasMenos"), starter: Boolean(raw.CincoInicial)
  };
}
function minutesPlayed(value) {
  const parts = String(value || "").trim().split(":").map(Number);
  if (parts.some(v => !Number.isFinite(v))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return number(value) || 0;
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
  const aliases = {
    "TC": "fieldGoals", "2P": "twoPointers", "3P": "threePointers", "TL": "freeThrows",
    "Reb.": "rebounds", "As.": "assists", "Rec.": "steals", "Tap.": "blocks",
    "Pér.": "turnovers", "Faltas Com.": "fouls"
  };
  const home = {}, away = {};
  for (const row of lines.toArray().map(readLine).filter(Boolean)) {
    const key = aliases[row.label];
    if (!key || row.home == null || row.away == null) continue;
    home[key] = row.home; away[key] = row.away;
  }
  if (!Object.values(aliases).every(key => home[key] != null && away[key] != null)) return null;
  return {
    source: "Comparativa oficial del boxscore LAB", method: "official-boxscore-comparison",
    teamNames: {
      home: root.find(".tituloEquipoLocal strong").first().text().trim(),
      away: root.find(".tituloEquipoVisitante strong").first().text().trim()
    }, home, away
  };
}
function validateCompletedBoxscore(match, statusText, homeScore, awayScore, players, teamComparison) {
  if (!isOfficialFinal(statusText)) return "El estado oficial todavía no confirma FINAL.";
  if (homeScore == null || awayScore == null || (homeScore === 0 && awayScore === 0) || homeScore === awayScore)
    return "Marcador oficial incompleto o inválido.";
  const homeId = Number(match.homeTeam.teamId), awayId = Number(match.awayTeam.teamId);
  const home = players.filter(p => Number(p.teamId) === homeId);
  const away = players.filter(p => Number(p.teamId) === awayId);
  if (!home.length || !away.length || players.some(p => ![homeId, awayId].includes(Number(p.teamId))))
    return "La planilla no contiene exactamente los dos equipos del partido.";
  if (home.filter(p => minutesPlayed(p.minutes) > 0).length < 5 || away.filter(p => minutesPlayed(p.minutes) > 0).length < 5)
    return "La planilla todavía no contiene cinco jugadores con minutos por equipo.";
  if (home.reduce((sum,p)=>sum+Number(p.points||0),0) !== homeScore ||
      away.reduce((sum,p)=>sum+Number(p.points||0),0) !== awayScore)
    return "La suma de puntos de jugadores no coincide con el marcador oficial.";
  if (!teamComparison?.home || !teamComparison?.away)
    return "La comparativa colectiva oficial todavía no está completa.";
  return null;
}

async function fetchOfficialPage(match) {
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
  const statusText = $("#status-partido").text().replace(/\\s+/g, " ").trim();
  const homeScore = parseScore($("#score-local").text());
  const awayScore = parseScore($("#score-visitante").text());
  if (!isOfficialFinal(statusText)) return { final: false, statusText };
  const tables = $(".tabla-estadisticas");
  if (tables.length !== 2) return { final: true, statusText, reason: "No están publicadas las dos tablas de jugadores." };
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
  const teamComparison = parseOfficialTeamComparison($);
  const reason = validateCompletedBoxscore(match, statusText, homeScore, awayScore, players, teamComparison);
  if (reason) return { final: true, statusText, homeScore, awayScore, reason };
  return {
    final: true, statusText, homeScore, awayScore, players, teamComparison,
    homeTeamId: Number(match.homeTeam.teamId), awayTeamId: Number(match.awayTeam.teamId)
  };
}

async function main() {
  const importedAtStart = fs.existsSync(OUTPUT) && fs.readFileSync(OUTPUT, "utf8").trim()
    ? JSON.parse(fs.readFileSync(OUTPUT, "utf8")) : {};
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  const yesterday = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now.getTime()-86400000));
  const matches = fixture.matches.filter(match => {
    if (TARGET) return match.id === TARGET;
    const date = String(match.date || "");
    if (RECENT && (date < yesterday || date > today)) return false;
    if (!ALL_FINISHED && !RECENT && date > today) return false;
    if (RECENT && /^\\d{2}:\\d{2}$/.test(match.time || "")) {
      const start = Date.parse(`${date}T${match.time}:00-03:00`);
      if (Number.isFinite(start) && start > now.getTime()) return false;
    }
    const existing = importedAtStart[match.id];
    const complete = existing?.status === "finished" && existing.players?.length && existing.teamComparison?.home && existing.teamComparison?.away;
    return REFRESH || !complete;
  });
  if (!matches.length) { console.log("LAB: no hay partidos pendientes para consultar."); return; }
  const output = importedAtStart;
  let imported = 0, notFinal = 0, incomplete = 0, errors = 0;
  for (const [index, match] of matches.entries()) {
    try {
      if (!match.officialUrl) { incomplete++; continue; }
      const result = await fetchOfficialPage(match);
      if (!result.final) { notFinal++; console.log("TODAVÍA NO FINAL", match.id, result.statusText || "(sin estado)"); }
      else if (result.reason) { incomplete++; console.log("FINAL, PLANILLA PENDIENTE", match.id, result.reason); }
      else {
        output[match.id] = {
          matchId: match.id, status: "finished", officialStatus: result.statusText,
          date: match.date, season: match.season || "2026-2027",
          homeTeamId: result.homeTeamId, awayTeamId: result.awayTeamId,
          homeScore: result.homeScore, awayScore: result.awayScore,
          source: "Liga Nacional oficial", officialUrl: match.officialUrl,
          importedAt: new Date().toISOString(), players: result.players,
          teamComparison: result.teamComparison
        };
        fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\\n");
        imported++;
        console.log("LAB BOX SCORE PUBLICABLE", match.homeTeam.name, result.homeScore, "-", result.awayScore, match.awayTeam.name, "jugadores:", result.players.length);
      }
    } catch (error) { errors++; console.log("ERROR LAB", match.id, error.message); }
    if (index < matches.length - 1) await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\\n");
  console.log("RESUMEN LAB", JSON.stringify({consultados:matches.length,importados:imported,noFinal:notFinal,planillaPendiente:incomplete,errores:errors,totalBase:Object.keys(output).length}));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { isOfficialFinal, parseScore, validateCompletedBoxscore, parseOfficialTeamComparison };
