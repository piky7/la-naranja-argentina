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

function pollDecision(fixture, history, event, schedule, now = new Date(), requestedMode = "") {
  const recent = event === "schedule" && schedule === "*/10 * * * *" ||
    event === "workflow_dispatch" && requestedMode === "recent";
  if (!recent) return { run: true, mode: "full" };
  if (fixture.source !== "Liga Nacional" || history.source !== "Liga Nacional" ||
      !Array.isArray(fixture.matches) || !Array.isArray(history.matches)) {
    throw new Error("Fixture o historial oficial inválido");
  }
  const processed = new Set(history.matches.map(m => m.officialUrl));
  return { run: fixture.matches.some(m => !processed.has(m.officialUrl) && isCandidate(m, now, true)), mode: "recent" };
}

if (require.main === module) {
  const decision = pollDecision(
    JSON.parse(fs.readFileSync("liga-events.json", "utf8")),
    JSON.parse(fs.readFileSync("liga-history.json", "utf8")),
    process.env.GITHUB_EVENT_NAME, process.env.OFFICIAL_SCHEDULE,
    new Date(), process.env.OFFICIAL_REQUESTED_MODE
  );
  const output = `run=${decision.run}\nmode=${decision.mode}\n`;
  console.log(output);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
}

module.exports = { argentinaDate, isCandidate, pollDecision };
