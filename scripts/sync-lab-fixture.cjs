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
