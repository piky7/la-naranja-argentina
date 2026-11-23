const fs = require("node:fs");
const path = require("node:path");
const { parseFixtureRows } = require("./parse-fixture-lab.cjs");

const BASE = "https://www.laliganacional.com.ar";
const START = process.env.LAB_START_DATE || "2026-09-01";
const END = process.env.LAB_END_DATE || "2027-06-30";
const OUTPUT = process.env.LAB_OUTPUT || "data/lab/labSchedule.json";

async function main() {
  const url = new URL("/laligaargentina/fixture", BASE);
  url.searchParams.set("handler", "ProximosPartidos");
  url.searchParams.set("fechaInicio", START);
  url.searchParams.set("fechaFin", END);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LaNaranjaArgentina/1.0)",
      Accept: "text/html, */*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: new URL("/laligaargentina/fixture", BASE).href,
    },
  });
  if (!response.ok) throw new Error(`Fixture LAB HTTP ${response.status}`);
  const html = await response.text();
  const matches = parseFixtureRows(html);
  if (!matches.length) throw new Error("La fuente oficial no devolvió partidos parseables.");

  const ids = new Set(matches.map(match => match.id));
  if (ids.size !== matches.length) throw new Error("Hay IDs de partidos duplicados.");
  const invalid = matches.filter(match =>
    !match.id || !match.date || !match.homeTeam?.teamId || !match.awayTeam?.teamId ||
    match.homeTeam.teamId === match.awayTeam.teamId
  );
  if (invalid.length) throw new Error(`Partidos incompletos: ${invalid.length}`);

  // Conservar resultados ya validados por boxscore aunque el fixture oficial vuelva a mostrar 0-0.
  const existingPath = OUTPUT;
  const boxesPath = path.join(__dirname, "../data/lab/labBoxscores.json");
  const boxes = fs.existsSync(boxesPath) && fs.readFileSync(boxesPath, "utf8").trim()
    ? JSON.parse(fs.readFileSync(boxesPath, "utf8")) : {};
  const previous = fs.existsSync(existingPath) && fs.readFileSync(existingPath, "utf8").trim()
    ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : null;
  const previousById = new Map((previous?.matches || []).map(match => [match.id, match]));
  for (const match of matches) {
    const box = boxes[match.id];
    const old = previousById.get(match.id);
    const valid = box?.status === "finished" && Array.isArray(box.players) && box.players.length > 0 &&
      box.teamComparison?.home && box.teamComparison?.away &&
      Number(box.homeTeamId) === Number(match.homeTeam.teamId) &&
      Number(box.awayTeamId) === Number(match.awayTeam.teamId);
    if (valid) {
      match.homeScore = Number(box.homeScore);
      match.awayScore = Number(box.awayScore);
      match.status = "finished";
      match.statusSource = "official-final-and-complete-boxscore";
      match.boxscoreImportedAt = box.importedAt || null;
    } else if (old?.status === "finished") {
      Object.assign(match, {
        homeScore: old.homeScore, awayScore: old.awayScore,
        status: "finished", statusSource: old.statusSource,
        boxscoreImportedAt: old.boxscoreImportedAt || null
      });
    }
  }

  const report = {
    competition: "Liga Argentina",
    season: "2026-2027",
    source: "Liga Nacional oficial",
    sourceUrl: url.href,
    importedAt: new Date().toISOString(),
    range: { start: START, end: END },
    total: matches.length,
    teams: [...new Map(matches.flatMap(m => [m.homeTeam, m.awayTeam]).map(t => [t.teamId, t])).values()]
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
    matches,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    output: OUTPUT, total: report.total, teams: report.teams.length,
    withScore: matches.filter(m => m.homeScore !== null && m.awayScore !== null).length,
    upcoming: matches.filter(m => m.homeScore === null && m.awayScore === null).length,
    partial: matches.filter(m => m.status === "needs_review").length,
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
