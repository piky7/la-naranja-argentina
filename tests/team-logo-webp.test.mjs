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



test("Los escudos de LAB se convierten a WebP local antes del build y desarrollo", () => {
  const home = readFileSync(new URL("../src/pages/HomeLigaArgentina.jsx", import.meta.url), "utf8");
  assert.ok(pkg.scripts.prebuild.includes("node scripts/optimize-lab-logos.mjs"));
  assert.ok(pkg.scripts.predev.includes("node scripts/optimize-lab-logos.mjs"));
  assert.ok(home.includes("/lab-team-logos/"));
  assert.ok(home.includes("labCrest(match.homeTeam)"));
  assert.ok(home.includes("labCrest(match.awayTeam)"));
  assert.ok(home.includes("src={labCrest(team)}"));
  assert.ok(home.includes("src={player.crestUrl}"));
  assert.ok(home.includes("crestUrl: labCrest(team)"));
  assert.match(home, /const LAB_TEAM_COLORS = \{/);
  assert.match(home, /"amancay-lr": "#c49a32"/);
  assert.match(home, /"villa-san-martin": "#bd303e"/);
  assert.match(home, /"--match-home-color":labMatchColor\(match.homeTeam\)/);
  assert.match(home, /"--match-away-color":labMatchColor\(match.awayTeam\)/);
  const optimizer = readFileSync(new URL("../scripts/optimize-lab-logos.mjs", import.meta.url), "utf8");
  assert.match(optimizer, /const removeBackground =/);
  assert.match(optimizer, /thresholdSquared/);
  assert.match(optimizer, /data\[i \* channels \+ 3\] = 0/);
  assert.match(optimizer, /alphaQuality: 100/);
});
