import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../"+file, import.meta.url),"utf8");
const home=read("src/pages/Home.jsx");
const header=read("src/components/Header.jsx");
const script=read("scripts/optimize-logo.mjs");
const pkg=JSON.parse(read("package.json"));
const lock=JSON.parse(read("package-lock.json"));

test("El logo de cabecera utiliza WebP y conserva el PNG original para metadatos",()=>{
  assert.ok(header.includes("/logo-lna.webp"));
  assert.ok(!header.includes("/logo-lna.png"));
  assert.match(read("index.html"),/favicon-lna-64\.png/);
  assert.match(script,/sharp\(fileURLToPath\(input\)\)\.resize\(\{ width: 512/);
  assert.match(script,/\.webp\(\{/);
  assert.match(script,/favicon-lna-64\.png/);
});

test("Logo optimizado se genera antes del desarrollo y del build con dependencia explícita",()=>{
  assert.equal(pkg.scripts.predev,"node scripts/optimize-logo.mjs");
  assert.equal(pkg.scripts.prebuild,"node scripts/optimize-logo.mjs");
  assert.equal(pkg.scripts.postbuild,"node scripts/optimize-legacy-logo.mjs");
  assert.ok(read("scripts/optimize-legacy-logo.mjs").includes("dist/logo-lna.png"));
  assert.equal(pkg.dependencies.sharp,lock.packages[""].dependencies.sharp);
  assert.ok(lock.packages["node_modules/sharp"]);
});

test("Home prioriza los escudos superiores sin cargar todos con prioridad alta",()=>{
  assert.ok(home.includes("selectedDayMatches.map((match, matchIndex) =>"));
  assert.equal((home.match(/fetchPriority=\{matchIndex < 3 \? "high" : "auto"\}/g)||[]).length,2);
  assert.equal((home.match(/loading=\{matchIndex < 3 \? "eager" : "lazy"\}/g)||[]).length,2);
});
