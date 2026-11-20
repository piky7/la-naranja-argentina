const cheerio = require("cheerio");

const BASE = "https://www.laliganacional.com.ar";
const FIXTURE_URL = new URL("/laligaargentina/fixture", BASE);
const START = process.env.LAB_START_DATE || "2026-09-01";
const END = process.env.LAB_END_DATE || "2027-06-30";
const UA = "Mozilla/5.0 (compatible; LaNaranjaArgentina/1.0; +https://lanaranjaargentina.com.ar)";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseTeam($, anchor) {
  const href = anchor.attr("href") || "";
  const match = href.match(/\/equipo\/(\d+)\/(\d+)\/([^/?#]+)/i);
  const name = clean(anchor.text()) || clean(anchor.find("img").attr("alt"));
  if (!match || !name) return null;
  const crest = anchor.find("img").attr("src");
  return {
    name, clubId: Number(match[1]), teamId: Number(match[2]), slug: match[3],
    url: new URL(href, BASE).href,
    crestUrl: new URL(crest || `/escudos/${match[1]}/${match[2]}`, BASE).href,
  };
}

function parseDateTime(value) {
  const match = clean(value).match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return { date: null, time: null };
  return { date: `${match[3]}-${match[2]}-${match[1]}`, time: match[4] ? `${match[4]}:${match[5]}` : null };
}

function parseScore(value) {
  const text = clean(value);
  return /^\d+$/.test(text) ? Number(text) : null;
}

function parseFixtureRows(html) {
  const $ = cheerio.load(html);
  const matches = [];
  const seen = new Set();

  $(".fila-tabla-calendarios.datos-estadisticos").each((_, element) => {
    const row = $(element);
    const statsHref = row.find('a[href*="/laligaargentina/partido/"]').first().attr("href") || "";
    const idMatch = statsHref.match(/\/partido\/([^/?#]+)/i);
    const teams = [];
    const teamSeen = new Set();

    row.find('a[href*="/laligaargentina/equipo/"]').each((__, anchor) => {
      const team = parseTeam($, $(anchor));
      if (!team || teamSeen.has(team.teamId)) return;
      teamSeen.add(team.teamId);
      teams.push(team);
    });

    if (!idMatch || teams.length < 2) return;
    const dateCell = row.find("td.fecha-campo").first();
    const dateTime = parseDateTime(dateCell.find("strong").first().text());
    const scores = row.find("td.resultados strong").map((__, el) => parseScore($(el).text())).get();
    const homeScore = scores[0] ?? null;
    const awayScore = scores[1] ?? null;
    const bothScores = homeScore !== null && awayScore !== null;
    const partialScore = (homeScore !== null) !== (awayScore !== null);
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    matches.push({
      id, competition: "Liga Argentina", season: "2026-2027",
      date: dateTime.date, time: dateTime.time,
      venue: clean(dateCell.find("small").first().text()) || null,
      homeTeam: teams[0], awayTeam: teams[1], homeScore, awayScore,
      status: partialScore ? "needs_review" : bothScores ? "score_available" : "scheduled",
      statusSource: "score_presence_only",
      officialUrl: new URL(statsHref, BASE).href,
      source: "Liga Nacional oficial",
    });
  });

  return matches.sort((a, b) => `${a.date || "9999"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999"} ${b.time || "99:99"}`));
}

async function main() {
  const url = new URL(FIXTURE_URL);
  url.searchParams.set("handler", "ProximosPartidos");
  url.searchParams.set("fechaInicio", START);
  url.searchParams.set("fechaFin", END);
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html, */*", "X-Requested-With": "XMLHttpRequest", Referer: FIXTURE_URL.href },
  });
  if (!response.ok) throw new Error(`Fixture LAB respondió HTTP ${response.status}`);
  const matches = parseFixtureRows(await response.text());
  if (!matches.length) throw new Error("El parser no encontró partidos LAB.");
  if (matches.some(m => !m.id || !m.homeTeam.teamId || !m.awayTeam.teamId || !m.date)) {
    throw new Error("Hay partidos con identificadores, equipos o fechas incompletos.");
  }

  const report = {
    sourceUrl: url.href, fetchedAt: new Date().toISOString(),
    dateRange: { start: START, end: END }, count: matches.length,
    playedWithScore: matches.filter(m => m.status === "score_available").length,
    scheduled: matches.filter(m => m.status === "scheduled").length,
    partialScores: matches.filter(m => m.status === "needs_review").length,
    uniqueTeams: new Set(matches.flatMap(m => [m.homeTeam.teamId, m.awayTeam.teamId])).size,
    matches,
  };
  const output = process.argv.find(arg => arg.startsWith("--output="))?.slice(9);
  if (output) require("node:fs").writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  if (process.argv.includes("--summary")) {
    console.log(JSON.stringify({ ...report, matches: matches.slice(0, 5) }, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) {
      const md = [
        "# Importación de fixture LAB — validación", "",
        `- Fuente oficial: ${url.href}`,
        `- Partidos únicos: **${report.count}**`,
        `- Equipos únicos: **${report.uniqueTeams}**`,
        `- Con marcador (estado aún por validar): **${report.playedWithScore}**`,
        `- Sin marcador: **${report.scheduled}**`,
        `- Marcadores parciales: **${report.partialScores}**`, "",
        "La clasificación por presencia de marcador no se publica como resultado final hasta verificar el indicador oficial de estado."
      ].join("\n");
      require("node:fs").appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
    }
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  }
}

module.exports = { parseFixtureRows, parseDateTime };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
