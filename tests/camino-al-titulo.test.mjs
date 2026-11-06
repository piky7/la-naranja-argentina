import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACTIONS, ROUNDS, createMatch, playAction, randomOpponentIds } from "../src/games/caminoEngine.js";

test("Camino al Título tiene tres partidos y tres decisiones por encuentro", () => {
  assert.deepEqual(ROUNDS, ["CUARTOS DE FINAL", "SEMIFINAL", "GRAN FINAL"]);
  assert.equal(ACTIONS.length, 3);
  assert.ok(ACTIONS.every(group => group.length === 3));
});

test("No enfrenta al equipo seleccionado consigo mismo ni repite rivales", () => {
  const ids = ["boca", "quimsa", "atenas", "regatas", "ferro"];
  const opponents = randomOpponentIds("boca", ids, () => .33);
  assert.equal(opponents.length, 3);
  assert.equal(new Set(opponents).size, 3);
  assert.ok(!opponents.includes("boca"));
});

test("Tres decisiones resuelven el partido sin revancha", () => {
  let match = createMatch(0, "boca", "quimsa", () => .5);
  match = playAction(match, "three", () => 0);
  assert.equal(match.moment, 1);
  assert.equal(match.done, false);
  match = playAction(match, "press", () => 0);
  assert.equal(match.moment, 2);
  match = playAction(match, "hero", () => 0);
  assert.equal(match.done, true);
  assert.equal(match.log.length, 3);
  assert.deepEqual(playAction(match, "hero", () => 0), match);
});

test("Un partido perdido termina en eliminación, sin ronda adicional automática", () => {
  let match = createMatch(0, "boca", "quimsa", () => .99);
  match = playAction(match, "inside", () => .99);
  match = playAction(match, "zone", () => .99);
  match = playAction(match, "quick", () => .99);
  assert.equal(match.done, true);
  assert.equal(match.won, false);
  assert.ok(match.opponentScore > match.score);
});

test("La ruta de pruebas exige autorización de administrador y no aparece en navegación", () => {
  const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const app = read("src/App.jsx");
  const game = read("src/pages/CaminoAlTitulo.jsx");
  const header = read("src/components/Header.jsx");
  assert.match(app, /path="\/camino-al-titulo-test" element=\{<CaminoAlTitulo \/>}/);
  assert.match(app, /lazy\(\(\) => import\("\.\/pages\/CaminoAlTitulo"\)\)/);
  assert.match(game, /\/api\/prode\/admin\/summary/);
  assert.match(game, /response\.status === 403/);
  assert.match(game, /status !== "allowed"/);
  assert.match(game, /noindex,nofollow/);
  assert.doesNotMatch(header, /camino-al-titulo-test/);
  assert.doesNotMatch(game, /localStorage|sessionStorage/);
});
