import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPORTS_SHAPES, SPORTS_PATTERNS, SPORTS_PLACEMENTS, SPORTS_BORDERS,
  parseSportsDesign, serializeSportsDesign, isSportsDesign } from "../src/components/sportsCrestDesign.js";

test("El creador deportivo ofrece formas, franjas, ubicación y bordes", () => {
  assert.equal(SPORTS_SHAPES.length, 5);
  assert.equal(SPORTS_PATTERNS.length, 8);
  assert.equal(SPORTS_PLACEMENTS.length, 4);
  assert.equal(SPORTS_BORDERS.length, 3);
});

test("El diseño deportivo se serializa y recupera con nombre independiente", () => {
  const original = {shape:"pointed",pattern:"diagonal",placement:"bottom",border:"thick",label:"CLUB PIKY"};
  const saved = serializeSportsDesign(original);
  assert.equal(saved,"sport:pointed:diagonal:bottom:thick:CLUB PIKY");
  assert.deepEqual(parseSportsDesign(saved),original);
  assert.ok(isSportsDesign(saved));
  assert.equal(parseSportsDesign("ball").shape,"classic");
  assert.ok(isSportsDesign(serializeSportsDesign({...original,label:"ATLÉTICO ÑANDÚ"})));
});

test("Nunca acepta configuraciones extrañas o inyectadas como un diseño válido", () => {
  assert.equal(isSportsDesign("sport:pointed:diagonal:top:double:<script>"),false);
  assert.equal(isSportsDesign("sport:wrong:diagonal:top:double:CLUB"),false);
  assert.equal(isSportsDesign("sport:classic:vertical:top:double:PANTERA"),true);
});

test("Render de escudos deportivo y trofeo de liga permanecen separados", () => {
  const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const crest = read("src/components/ProdeCrest.jsx");
  const shield = read("src/components/ProdeSportsShield.jsx");
  const access = read("src/components/ProdeGoogleAccess.jsx");
  const worker = read("workers/prode/worker.js");
  assert.match(crest,/type !== "league"/);
  assert.match(crest,/ProdeSportsShield/);
  assert.match(shield,/clipPath/);
  assert.match(shield,/d.pattern === "diagonal"/);
  assert.match(access,/SPORTS_SHAPES/);
  assert.match(access,/SPORTS_PATTERNS/);
  assert.match(access,/SPORTS_PLACEMENTS/);
  assert.match(worker,/sportSymbolPattern/);
  assert.doesNotMatch(access,/PRODE_SYMBOL_CATEGORIES/);
});
