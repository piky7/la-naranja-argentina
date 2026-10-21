const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const cheerio = require("cheerio");
const { parseOfficialFinal } = require("../scripts/parse-official-final.cjs");
const { assertPublishableResult } = require("../scripts/official-final.cjs");
const baseline = require("../scripts/audited-official-finals.json");
const root = path.resolve(__dirname, "..");
const url = "https://www.laliganacional.com.ar/laliga/partido/test/ferro-vs-platense";

test("only the explicit official completion marker proves a final", () => {
  for (const [css, text, expected] of [
    ["finalizado", "Finalizado", "finished"],
    ["en-vivo", "En juego", "unverified"],
    ["", "Finalizado", "unverified"],
    ["finalizado", "Suspendido", "unverified"],
  ]) {
    const $ = cheerio.load(`<div id="status-partido" class="${css}">${text}</div>
      <div id="score-local">46</div><div id="score-visitante">30</div>`);
    assert.equal(parseOfficialFinal($, url).status, expected);
  }
  assert.equal(parseOfficialFinal(cheerio.load(""), url).status, "unverified");
});

function sandbox(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lna-sync-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const file of ["package.json", "liga-events.json", "liga-history.json",
    "sync-official-stats-preview.cjs", "publish-official-stats.cjs", "merge-liga-events.cjs",
    "scripts/official-final.cjs", "scripts/audited-official-finals.json", "scripts/generate-published-matches.cjs",
    "src/data/players.js", "src/data/matchStats.js", "src/data/matchResults.js"]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  return {
    dir,
    read: file => JSON.parse(fs.readFileSync(path.join(dir, file))),
    write: (file, data) => fs.writeFileSync(path.join(dir, file), JSON.stringify(data)),
    run: file => spawnSync(process.execPath, [file], { cwd: dir, encoding: "utf8" }),
  };
}

test("past partials with matching player totals are never published; legacy history survives", t => {
  const box = sandbox(t);
  const fixture = box.read("liga-events.json");
  const history = box.read("liga-history.json");
  for (const match of history.matches.filter(m => m.date === "2026-10-20")) {
    delete match.status;
    delete match.finalEvidence;
  }
  box.write("liga-history.json", history);
  assert.equal(box.run("sync-official-stats-preview.cjs").status, 0);
  const preview = box.read("official-sync-preview.json");
  assert.equal(preview.verifiedMatches, 31);
  assert.equal(Object.keys(preview.matchResults).length, 31);
  assert.equal(preview.skippedMatches, 2);
  for (const [key, old] of Object.entries(baseline)) {
    const result = preview.matchResults[key];
    assert.equal(result.homeScore, old.homeScore);
    assert.equal(result.awayScore, old.awayScore);
    assertPublishableResult(key, result, preview.matchStats[key]);
  }
  // A new record cannot use the grandfathered evidence of an unrelated old game.
  const key = "2026-10-20-ferro-platense";
  const result = { ...preview.matchResults[Object.keys(baseline)[0]],
    homeTeam: "ferro", awayTeam: "platense" };
  assert.throws(() => assertPublishableResult(key, result, {}));
  assert.equal(fixture.matches.filter(m => m.date === "2026-10-20").length, 2);
});

test("publisher rejects stale partial previews before changing any published file", t => {
  const box = sandbox(t);
  assert.equal(box.run("sync-official-stats-preview.cjs").status, 0);
  const preview = box.read("official-sync-preview.json");
  const key = "2026-10-20-ferro-platense";
  preview.matchResults[key].homeScore = 46;
  preview.matchResults[key].awayScore = 30;
  delete preview.matchResults[key].finalEvidence;
  box.write("official-sync-preview.json", preview);
  const files = ["src/data/matchStats.js", "src/data/matchResults.js"];
  const before = files.map(file => fs.readFileSync(path.join(box.dir, file), "utf8"));
  assert.notEqual(box.run("publish-official-stats.cjs").status, 0);
  files.forEach((file, i) => assert.equal(fs.readFileSync(path.join(box.dir, file), "utf8"), before[i]));
});

test("confirmed finals pass the full preview and publishing pipeline", t => {
  const box = sandbox(t);
  assert.equal(box.run("sync-official-stats-preview.cjs").status, 0);
  const preview = box.read("official-sync-preview.json");
  assert.equal(preview.verifiedMatches, 33);
  for (const [key, result] of Object.entries(preview.matchResults)) {
    assertPublishableResult(key, result, preview.matchStats[key]);
  }
  assert.equal(box.run("publish-official-stats.cjs").status, 0);
  const key = "2026-10-20-ferro-platense";
  preview.matchResults[key].homeScore++;
  assert.throws(() => assertPublishableResult(key, preview.matchResults[key], preview.matchStats[key]));
});

test("fixture merge refreshes stale scores and preserves rotating historical URLs", t => {
  const box = sandbox(t);
  const fixture = box.read("liga-events.json");
  const match = fixture.matches.find(m => m.date === "2026-10-20");
  const originalUrl = match.officialUrl;
  box.write("liga-events-preview.json", { matches: [{ ...match, homeScore: 999, officialUrl: url }], dateTo: fixture.dateTo });
  assert.equal(box.run("merge-liga-events.cjs").status, 0);
  const updated = box.read("liga-events.json").matches.find(m => m.date === match.date);
  assert.equal(updated.homeScore, 999);
  assert.equal(updated.officialUrl, originalUrl);
});

test("published manifest excludes the two original partials even with matching live stats", t => {
  const box = sandbox(t);
  const readModule = file => {
    const source = fs.readFileSync(path.join(box.dir, file), "utf8");
    return JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
  };
  const results = readModule("src/data/matchResults.js");
  const stats = readModule("src/data/matchStats.js");
  for (const [key, homeScore, awayScore] of [
    ["2026-10-20-san-martin-olimpico", 60, 79],
    ["2026-10-20-ferro-platense", 46, 30],
  ]) {
    const result = results[key];
    delete result.finalEvidence;
    Object.assign(result, { homeScore, awayScore });
    Object.assign(stats[key], { homeScore, awayScore,
      [result.homeTeam]: [{ name: "Live player", points: homeScore, rebounds: 1, assists: 1 }],
      [result.awayTeam]: [{ name: "Live player", points: awayScore, rebounds: 1, assists: 1 }],
    });
  }
  for (const [file, name, data] of [
    ["src/data/matchResults.js", "matchResults", results],
    ["src/data/matchStats.js", "matchPlayerStats", stats],
  ]) fs.writeFileSync(path.join(box.dir, file), `export const ${name} = ${JSON.stringify(data)};`);
  assert.equal(box.run("scripts/generate-published-matches.cjs").status, 0);
  assert.equal(Object.keys(box.read("public/published-matches.json").matches).length, 31);
});
