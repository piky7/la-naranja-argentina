const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { argentinaDate, isCandidate, pollDecision } = require("../scripts/official-poll-window.cjs");
const now = new Date("2026-10-22T03:15:00Z"); // 00:15 ART
const match = { date: "2026-10-21", time: "22:00", officialUrl: "official-game" };
const fixture = { source: "Liga Nacional", matches: [match] };
const history = { source: "Liga Nacional", matches: [] };

test("ART midnight, recent candidates and future starts", () => {
  assert.equal(argentinaDate(new Date("2026-10-22T02:59:00Z")), "2026-10-21");
  assert.equal(argentinaDate(now), "2026-10-22");
  assert.equal(isCandidate(match, now, true), true);
  assert.equal(isCandidate({ ...match, date: "2026-10-20" }, now, true), false);
  assert.equal(isCandidate({ ...match, date: "2026-10-20" }, now), true);
  assert.equal(isCandidate({ ...match, date: "2026-10-23" }, now), false);
  assert.equal(isCandidate({ ...match, date: "2026-10-22", time: "20:00" }, now, true), false);
  assert.equal(isCandidate({ ...match, time: null }, now, true), true);
});

test("frequent runs skip completed games and idle days; daily and manual always reconcile", () => {
  const schedule = "*/15 0-4,14-17,21-23 * * *";
  assert.deepEqual(pollDecision(fixture, history, "schedule", schedule, now), { run: true, mode: "recent" });
  assert.equal(pollDecision(fixture, { ...history, matches: [match] }, "schedule", schedule, now).run, false);
  assert.equal(pollDecision({ ...fixture, matches: [] }, history, "schedule", schedule, now).run, false);
  for (const [event, cron] of [["schedule", "30 6 * * *"], ["workflow_dispatch", ""], ["push", ""]]) {
    assert.deepEqual(pollDecision(fixture, history, event, cron, now), { run: true, mode: "full" });
  }
  assert.throws(() => pollDecision({}, history, "schedule", schedule, now));
});

test("same-day extraction rejects partials, admits confirmed finals and preserves history", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lna-poll-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "scripts"));
  for (const file of ["sync-liga-history.cjs", "scripts/official-poll-window.cjs", "scripts/official-final.cjs", "scripts/audited-official-finals.json"]) {
    fs.copyFileSync(path.join(__dirname, "..", file), path.join(dir, file));
  }
  const today = argentinaDate(new Date());
  const game = { ...match, date: today, time: "00:00", homeScore: 80, awayScore: 70,
    home: { name: "Home", officialTeamId: 1 }, away: { name: "Away", officialTeamId: 2 } };
  const old = { officialUrl: "old-game", historical: true };
  const write = (file, value) => fs.writeFileSync(path.join(dir, file), JSON.stringify(value));
  write("liga-events.json", { ...fixture, matches: [game] });
  write("liga-history.json", { ...history, matches: [old] });
  const data = { status: "unverified", homeScore: 80, awayScore: 70,
    teams: [{ officialTeamId: 1, players: [{ points: 80 }] }, { officialTeamId: 2, players: [{ points: 70 }] }] };
  fs.writeFileSync(path.join(dir, "extractor-liga.cjs"), 'require("node:fs").copyFileSync("stub.json", process.argv[3]);');
  const run = () => spawnSync(process.execPath, ["sync-liga-history.cjs"], { cwd: dir, encoding: "utf8", env: { ...process.env, OFFICIAL_SYNC_MODE: "recent" } });
  write("stub.json", data);
  assert.equal(run().status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "liga-history.json"))).matches, [old]);
  data.status = "finished";
  data.finalEvidence = { type: "official-final-status", officialUrl: game.officialUrl };
  write("stub.json", data);
  assert.equal(run().status, 0);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, "liga-history.json"))).matches;
  assert.deepEqual(saved[0], old);
  assert.equal(saved.length, 2);
  assert.equal(saved[1].status, "finished");
  assert.equal(run().status, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "liga-history.json"))).matches.length, 2);
});
