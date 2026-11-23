import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { splitBoxscores } = require("../scripts/split-lab-boxscores.cjs");

test("la partición LAB conserva cada boxscore histórico sin alterar su contenido", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lna-lab-shards-"));
  const source = path.join(root, "labBoxscores.json");
  const output = path.join(root, "boxscores");
  const historical = {
    "LAB-001": { status: "finished", players: [{ id: 10, points: 21 }], teamComparison: { home: { rebounds: 30 }, away: { rebounds: 28 } } },
    "LAB-002": { status: "finished", players: [{ id: 11, points: 17 }], teamComparison: { home: { assists: 14 }, away: { assists: 12 } } }
  };
  fs.writeFileSync(source, JSON.stringify(historical));
  const result = splitBoxscores(source, output);
  assert.equal(result.matches, 2);
  assert.equal(result.files, 2);
  for (const [id, expected] of Object.entries(historical)) {
    const actual = JSON.parse(fs.readFileSync(path.join(output, encodeURIComponent(id) + ".json"), "utf8"));
    assert.deepEqual(actual, expected);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test("la partición elimina shards obsoletos y mantiene la cantidad exacta de partidos", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lna-lab-shards-clean-"));
  const source = path.join(root, "labBoxscores.json");
  const output = path.join(root, "boxscores");
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "ANTIGUO.json"), "{}");
  fs.writeFileSync(source, JSON.stringify({ "PARTIDO-1": { players: [] } }));
  splitBoxscores(source, output);
  assert.deepEqual(fs.readdirSync(output).sort(), ["PARTIDO-1.json"]);
  fs.rmSync(root, { recursive: true, force: true });
});
