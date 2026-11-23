import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildSummary } = require("../scripts/build-lab-boxscore-summary.cjs");

test("el resumen LAB conserva comparativas y MVP empatados sin incluir planillas completas", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lna-lab-summary-"));
  const source = path.join(root, "labBoxscores.json");
  const output = path.join(root, "labBoxscoreSummary.json");
  const boxes = {
    "P-1": {
      players: [
        { id: 10, minutes: "30:00", valuation: 25, points: 20 },
        { id: 11, minutes: "28:00", valuation: 25, points: 18 },
        { id: 12, minutes: "00:00", valuation: 40, points: 0 }
      ],
      teamComparison: { home: { rebounds: 31 }, away: { rebounds: 29 } }
    }
  };
  fs.writeFileSync(source, JSON.stringify(boxes));
  const summary = buildSummary(source, output);
  assert.deepEqual(summary["P-1"].mvpPlayerIds, [10, 11]);
  assert.deepEqual(summary["P-1"].teamComparison, boxes["P-1"].teamComparison);
  assert.equal("players" in summary["P-1"], false);
  assert.deepEqual(JSON.parse(fs.readFileSync(output, "utf8")), summary);
  fs.rmSync(root, { recursive: true, force: true });
});
