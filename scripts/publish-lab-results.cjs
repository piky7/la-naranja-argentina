const fs = require("node:fs");
const fixturePath = "data/lab/labSchedule.json";
const boxesPath = "data/lab/labBoxscores.json";
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const boxes = fs.existsSync(boxesPath) && fs.readFileSync(boxesPath, "utf8").trim() ? JSON.parse(fs.readFileSync(boxesPath, "utf8")) : {};
let published = 0;
for (const match of fixture.matches) {
  const box = boxes[match.id];
  const valid = box?.status === "finished" && Array.isArray(box.players) && box.players.length > 0 &&
    box.teamComparison?.home && box.teamComparison?.away &&
    Number(box.homeTeamId) === Number(match.homeTeam.teamId) &&
    Number(box.awayTeamId) === Number(match.awayTeam.teamId) &&
    Number.isFinite(Number(box.homeScore)) && Number.isFinite(Number(box.awayScore)) &&
    Number(box.homeScore) !== Number(box.awayScore);
  if (!valid) continue;
  if (match.status !== "finished" || Number(match.homeScore) !== Number(box.homeScore) ||
      Number(match.awayScore) !== Number(box.awayScore)) published++;
  match.homeScore = Number(box.homeScore);
  match.awayScore = Number(box.awayScore);
  match.status = "finished";
  match.statusSource = "official-final-and-complete-boxscore";
  match.boxscoreImportedAt = box.importedAt || null;
}
fixture.importedAt = new Date().toISOString();
fixture.finished = fixture.matches.filter(match => match.status === "finished").length;
fixture.pending = fixture.matches.length - fixture.finished;
fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + "\n");
console.log("PUBLICACIÓN DE RESULTADOS LAB", JSON.stringify({
  partidos: fixture.matches.length, finalesVerificados: fixture.finished,
  pendientes: fixture.pending, nuevosOActualizados: published
}));
