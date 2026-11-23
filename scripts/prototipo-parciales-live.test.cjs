const test = require("node:test");
const assert = require("node:assert/strict");
const { registrarCierre } = require("./prototipo-parciales-live.cjs");

test("calcula diferencias entre cierres confirmados", () => {
  let estado = registrarCierre({}, { periodo: 1, local: 16, visitante: 17, evento: "FINAL-PERIODO", marcadorSincronizado: true });
  assert.equal(estado.aceptado, true);
  estado = registrarCierre(estado, { periodo: 2, local: 24, visitante: 36, evento: "FINAL-PERIODO", marcadorSincronizado: true });
  assert.deepEqual(estado.cierres[1], { periodo: 2, local: 24, visitante: 36, puntosLocal: 8, puntosVisitante: 19 });
});

test("no inventa cierres si ya comenzó el siguiente cuarto", () => {
  const estado = registrarCierre({}, { periodo: 1, local: 18, visitante: 19, evento: "FINAL-PERIODO", marcadorSincronizado: true, inicioSiguientePeriodo: true });
  assert.equal(estado.aceptado, false);
  assert.equal(estado.cierres.length, 0);
});

test("rechaza saltos, duplicados y marcador sin sincronizar", () => {
  const base = registrarCierre({}, { periodo: 1, local: 10, visitante: 12, evento: "FINAL-PERIODO", marcadorSincronizado: true });
  assert.equal(registrarCierre(base, { periodo: 3, local: 30, visitante: 35, evento: "FINAL-PERIODO", marcadorSincronizado: true }).aceptado, false);
  assert.equal(registrarCierre(base, { periodo: 1, local: 10, visitante: 12, evento: "FINAL-PERIODO", marcadorSincronizado: true }).aceptado, false);
  assert.equal(registrarCierre(base, { periodo: 2, local: 20, visitante: 25, evento: "FINAL-PERIODO" }).aceptado, false);
});
