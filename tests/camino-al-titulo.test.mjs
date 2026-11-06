import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SCENARIOS, ACTIONS, ROUNDS, ROUND_SHORT, ROUND_DIFFICULTY, createMatch, getScenario, playAction, randomOpponentIds } from "../src/games/caminoEngine.js";

test("Camino al Título tiene octavos, cuartos, semifinal y final", () => {
  assert.deepEqual(ROUNDS, ["OCTAVOS DE FINAL", "CUARTOS DE FINAL", "SEMIFINAL", "GRAN FINAL"]);
  assert.deepEqual(ROUND_SHORT, ["OCTAVOS", "CUARTOS", "SEMIFINAL", "FINAL"]);
  assert.equal(SCENARIOS.length, 3);
  assert.ok(SCENARIOS.every(group => group.length >= 8));
  assert.ok(ACTIONS.every(group => group.length >= 24));
  assert.ok(SCENARIOS.every(group => group.every(scenario => scenario.options.length === 3)));
});

test("No enfrenta al equipo seleccionado consigo mismo ni repite rivales en las cuatro rondas", () => {
  const ids = ["boca", "quimsa", "atenas", "regatas", "ferro", "lanus"];
  const opponents = randomOpponentIds("boca", ids, () => .33);
  assert.equal(opponents.length, 4);
  assert.equal(new Set(opponents).size, 4);
  assert.ok(!opponents.includes("boca"));
});

test("Partidos nuevos pueden presentar situaciones diferentes", () => {
  const a = createMatch(0, "boca", "quimsa", () => .01);
  const b = createMatch(0, "boca", "quimsa", () => .99);
  assert.notEqual(getScenario(a).id, getScenario(b).id);
  assert.equal(a.scenarioIds.length, 3);
  assert.equal(b.scenarioIds.length, 3);
});

test("Tres decisiones resuelven un partido y guardan impacto, acción y animación", () => {
  let match = createMatch(0, "boca", "quimsa", () => .01);
  for (let i = 0; i < 3; i++) {
    const choice = getScenario(match).options[0];
    match = playAction(match, choice.id, () => 0);
    assert.equal(match.moment, i + 1);
    assert.ok(match.log[i].visual);
    assert.ok(Number.isFinite(match.log[i].score));
    assert.ok(Number.isFinite(match.log[i].opponentScore));
  }
  assert.equal(match.done, true);
  assert.equal(match.log.length, 3);
  assert.deepEqual(playAction(match, "arbitrary", () => 0), match);
});

test("Una jugada desconocida no altera el partido", () => {
  const match = createMatch(2, "boca", "ferro", () => .32);
  assert.equal(playAction(match, "no-existe", () => 0), match);
});

test("Un partido perdido termina sin revancha", () => {
  let match = createMatch(0, "boca", "quimsa", () => .99);
  for (let i = 0; i < 3; i++) {
    match = playAction(match, getScenario(match).options[0].id, () => .99);
  }
  assert.equal(match.done, true);
  assert.equal(match.won, false);
  assert.ok(match.opponentScore > match.score);
});

test("La placa incorpora octavos y el ganador debe superar cuatro rondas", () => {
  const game = readFileSync(new URL("../src/pages/CaminoAlTitulo.jsx", import.meta.url), "utf8");
  assert.match(game, /CUATRO VICTORIAS. UNA COPA/);
  assert.match(game, /ROUND_SHORT\[i\]/);
  assert.match(game, /round === ROUNDS.length - 1/);
  assert.match(game, /animateMotion/);
  assert.match(game, /ct-court-flash/);
});

test("La dificultad escala por ronda y el rival puede responder tras nuestro ataque", () => {
  assert.equal(ROUND_DIFFICULTY.length, 4);
  assert.ok(ROUND_DIFFICULTY.every((entry, i) => i === 0 ||
    entry.shotPenalty > ROUND_DIFFICULTY[i - 1].shotPenalty &&
    entry.rivalCounter > ROUND_DIFFICULTY[i - 1].rivalCounter));
  const match = createMatch(3, "boca", "quimsa", () => .99);
  const first = getScenario(match).options[0];
  const outcome = playAction(match, first.id, () => .2);
  assert.equal(outcome.moment, 1);
  assert.equal(outcome.opponentScore - match.opponentScore, 2);
  assert.match(outcome.log[0].message, /rival responde rápido/);
});

test("Simulación reproducible: el campeonato no se regala ni resulta imposible", () => {
  // Estrategia razonable: elegir la opción de mayor probabilidad, salvo
  // cuando hacen falta tres puntos para alcanzar al rival.
  let state = 20261106;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const tries = 25000;
  const wins = [0, 0, 0, 0];
  let champions = 0;
  for (let t = 0; t < tries; t++) {
    let champion = true;
    for (let round = 0; round < ROUNDS.length; round++) {
      let match = createMatch(round, "boca", ["quimsa", "atenas", "ferro", "regatas"][round], random);
      while (!match.done) {
        const options = getScenario(match).options;
        const gap = match.opponentScore - match.score;
        const remaining = 3 - match.moment;
        const needsThree = match.moment === 2 && gap >= 3;
        const chosen = [...options].sort((a, b) => {
          const value = option => {
            const gain = option.gain || 0;
            return (needsThree && gain < 3 ? -1 : option.chance) +
              (remaining === 1 && gap > 0 && gain > gap ? .1 : 0);
          };
          return value(b) - value(a);
        })[0];
        match = playAction(match, chosen.id, random);
      }
      if (!match.won) { champion = false; break; }
      wins[round]++;
    }
    if (champion) champions++;
  }
  const championshipRate = champions / tries;
  console.log("Camino al Título: " + tries + " campañas, " + champions +
    " campeones (" + (championshipRate * 100).toFixed(2) + "%), victorias por ronda " + wins.join("/"));
  assert.ok(championshipRate > .015, "La dificultad no debería hacer imposible el campeonato");
  assert.ok(championshipRate < .30, "El campeonato debe ser un desafío real");
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
