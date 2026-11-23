import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/preload-home-logos.mjs", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Las precargas de escudos se construyen con el calendario oficial y archivos generados", () => {
  assert.match(source, /import \{ officialSchedule \} from "\.\.\/src\/data\/officialSchedule\.js"/);
  assert.match(source, /import \{ matchResults \} from "\.\.\/src\/data\/matchResults\.js"/);
  assert.match(source, /readdir\(new URL\("\.\.\/dist\/assets\/"/);
  assert.match(source, /games\.sort\(\(a,b\) => a\.finished - b\.finished/);
  assert.match(source, /const game = games\[0\]/);
  assert.match(source, /\[findLogo\(game\.homeTeam\), findLogo\(game\.awayTeam\)\]/);
});

test("La precarga se limita al primer encuentro del día, en la fecha local", () => {
  assert.match(home, /selectedDayMatches\.map\(\(match, matchIndex\)/);
  assert.match(source, /new Date\(\)/);
  assert.match(source, /logos = .*\[date\] \|\| \[\]/);
  assert.match(source, /link\.rel = "preload"/);
  assert.match(source, /link\.as = "image"/);
  assert.match(source, /link\.fetchPriority = "high"/);
  assert.match(source, /if \(logos\.length\)/);
});

test("La generación de preloads es parte del build, sin agregar peticiones por cada equipo", () => {
  assert.match(packageJson.scripts.postbuild, /scripts\/preload-home-logos\.mjs/);
  assert.doesNotMatch(source, /for \(const team of /);
});
