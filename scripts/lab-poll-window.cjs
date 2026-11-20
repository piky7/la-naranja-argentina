const fs = require("node:fs");

function argentinaDate(now) {
  return new Date(now.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

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

function pollDecision(fixture, boxes, event, schedule, now = new Date(), requestedMode = "") {
  const recent = event === "schedule" && schedule === "*/10 * * * *" ||
    event === "workflow_dispatch" && requestedMode === "recent";
  if (!recent) return { run: true, mode: "full" };
  if (fixture.source !== "Liga Nacional oficial" ||
      !Array.isArray(fixture.matches) || !boxes || typeof boxes !== "object") {
    throw new Error("Fixture o boxscores LAB inválidos");
  }
  const pending = fixture.matches.some(match =>
    match.officialUrl && !boxes[match.id] && isCandidate(match, now, true)
  );
  return { run: pending, mode: "recent" };
}

if (require.main === module) {
  const fixture = JSON.parse(fs.readFileSync("data/lab/labSchedule.json", "utf8"));
  const boxes = JSON.parse(fs.readFileSync("data/lab/labBoxscores.json", "utf8"));
  const decision = pollDecision(
    fixture, boxes, process.env.GITHUB_EVENT_NAME, process.env.LAB_SCHEDULE,
    new Date(), process.env.LAB_REQUESTED_MODE
  );
  const output = `run=${decision.run}\nmode=${decision.mode}\n`;
  console.log(output);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
}

module.exports = { argentinaDate, isCandidate, pollDecision };
