const fs = require("node:fs");
const fixture = JSON.parse(fs.readFileSync("data/lab/labSchedule.json", "utf8"));
const boxPath = "data/lab/labBoxscores.json";
const boxes = fs.existsSync(boxPath) && fs.readFileSync(boxPath, "utf8").trim() ? JSON.parse(fs.readFileSync(boxPath, "utf8")) : {};
function argentinaDate(date) {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function isRecentCandidate(match, now = new Date()) {
  const today = argentinaDate(now), yesterday = argentinaDate(new Date(now.getTime()-86400000));
  if (!match.date || match.date < yesterday || match.date > today) return false;
  if (!/^\d{2}:\d{2}$/.test(match.time || "")) return true;
  const start = Date.parse(`${match.date}T${match.time}:00-03:00`);
  return Number.isFinite(start) && start <= now.getTime();
}
function hasCompleteBoxscore(box) {
  return box?.status === "finished" && Array.isArray(box.players) && box.players.length > 0 &&
    box.teamComparison?.home && box.teamComparison?.away;
}
function pollDecision(event, schedule, requestedMode = "", now = new Date()) {
  if (fixture.competition !== "Liga Argentina" || !Array.isArray(fixture.matches)) throw new Error("Fixture LAB inválido");
  if (event === "workflow_dispatch" && requestedMode === "backfill") return {run:true,mode:"backfill"};
  if (event === "schedule" && schedule !== "*/10 * * * *") return {run:true,mode:"full"};
  if (event === "workflow_dispatch" && requestedMode === "full") return {run:true,mode:"full"};
  const pending = fixture.matches.some(match => !hasCompleteBoxscore(boxes[match.id]) && isRecentCandidate(match, now));
  return {run:pending,mode:"recent"};
}
if (require.main === module) {
  const decision = pollDecision(process.env.GITHUB_EVENT_NAME, process.env.OFFICIAL_SCHEDULE, process.env.LAB_REQUESTED_MODE, new Date());
  const output = `run=${decision.run}\nmode=${decision.mode}\n`;
  console.log(output);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
}
module.exports = { argentinaDate, isRecentCandidate, hasCompleteBoxscore, pollDecision };
