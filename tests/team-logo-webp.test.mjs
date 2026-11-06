import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const teams = readFileSync(new URL("../src/data/teams.js", import.meta.url), "utf8");
const script = readFileSync(new URL("../scripts/optimize-team-logos.mjs", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Los 18 escudos de LNA se importan como WebP manteniendo sus identificadores", () => {
  assert.equal((teams.match(/from "\.\.\/assets\/teams-webp\/[^"]+\.webp";/g) || []).length, 18);
  assert.doesNotMatch(teams, /from "\.\.\/assets\/teams\/[^"]+\.png";/);
  assert.match(teams, /id: "quimsa"/);
  assert.match(teams, /id: "lanus"/);
});

test("Las versiones nuevas se generan antes del build y el modo desarrollo", () => {
  for (const scriptName of ["prebuild", "predev"]) {
    assert.match(pkg.scripts[scriptName], /node scripts\/optimize-team-logos\.mjs/);
  }
  assert.match(script, /quality: 88/);
  assert.match(script, /alphaQuality: 95/);
  assert.match(script, /converted !== 18/);
  assert.match(script, /optimizedBytes >= originalBytes/);
});
