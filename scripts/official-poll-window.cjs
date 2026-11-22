const fs = require("node:fs");

function argentinaDate(now) {
  return new Date(now.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

// Timing only selects candidates. It never establishes final status.
function isCandidate(match, now = new Date(), recent = false) {
  const today = argentinaDate(now);
  if (match.date > today) return false;
  if (!recent) return true;
  const yesterday = argentinaDate(new Date(now.getTime() - 86400000));
  if (match.date < yesterday) return false;
  if (!/^\d{2}:\d{2}$/.test(match.time || "")) return true;
  const start = Date.parse(`${match.date}T${match.time}:00-03:00`);
  return Number.isFinite(start) && start <= now.getTime();
}

function pollDecision(fixture, history, event, schedule, now = new Date(), requestedMode = "", statsByMatch = null) {
  const recent = event === "schedule" && schedule === "*/10 * * * *" ||
    event === "workflow_dispatch" && requestedMode === "recent";
  if (!recent) return { run: true, mode: "full" };
  if (fixture.source !== "Liga Nacional" || history.source !== "Liga Nacional" ||
      !Array.isArray(fixture.matches) || !Array.isArray(history.matches)) {
    throw new Error("Fixture o historial oficial inválido");
  }
  // El historial de extracción no alcanza: un partido puede estar guardado
  // allí y aun así no tener una planilla oficial publicada en la web.
  const processed = statsByMatch
    ? new Set(Object.values(statsByMatch)
      .filter(record => record?.source === "Liga Nacional" &&
        record.officialUrl?.startsWith("https://www.laliganacional.com.ar/laliga/partido/") &&
        Array.isArray(record[record.homeTeam]) && record[record.homeTeam].length > 0 &&
        Array.isArray(record[record.awayTeam]) && record[record.awayTeam].length > 0)
      .map(record => record.officialUrl))
    : new Set(history.matches.map(m => m.officialUrl));
  return { run: fixture.matches.some(m => !processed.has(m.officialUrl) && isCandidate(m, now, true)), mode: "recent" };
}

if (require.main === module) {
  (async () => {
    const statsModule = await import("../src/data/matchStats.js?official-poll");
    const decision = pollDecision(
      JSON.parse(fs.readFileSync("liga-events.json", "utf8")),
      JSON.parse(fs.readFileSync("liga-history.json", "utf8")),
      process.env.GITHUB_EVENT_NAME, process.env.OFFICIAL_SCHEDULE,
      new Date(), process.env.OFFICIAL_REQUESTED_MODE,
      statsModule.matchPlayerStats
    );
    const output = `run=${decision.run}\nmode=${decision.mode}\n`;
    console.log(output);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  })().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { argentinaDate, isCandidate, pollDecision };
