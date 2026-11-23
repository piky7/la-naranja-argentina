import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("el dataset LAB contiene fixture y equipos con IDs oficiales", () => {
  const data = JSON.parse(fs.readFileSync("data/lab/labSchedule.json", "utf8"));
  assert.equal(data.competition, "Liga Argentina");
  assert.equal(data.total, data.matches.length);
  assert.ok(data.total >= 500);
  assert.ok(data.teams.length >= 30);
  assert.equal(new Set(data.matches.map(match => match.id)).size, data.matches.length);
  for (const match of data.matches) {
    assert.ok(match.homeTeam.teamId);
    assert.ok(match.awayTeam.teamId);
    assert.ok(match.date);
    assert.ok(match.officialUrl.includes("/laligaargentina/partido/"));
  }
});

test("los partidos LAB conservan namespace y no mezclan equipos LNB", () => {
  const data = JSON.parse(fs.readFileSync("data/lab/labSchedule.json", "utf8"));
  assert.ok(data.matches.every(match => match.competition === "Liga Argentina"));
  assert.ok(data.teams.every(team => Number.isInteger(team.teamId)));
});
