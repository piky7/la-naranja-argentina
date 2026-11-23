const test = require("node:test");
const assert = require("node:assert/strict");
const { analizarCierreOficial } = require("./detectar-cierre-oficial.cjs");

const finalDos = '<li class="FINAL-PERIODO"><strong>FINAL-PERIODO <span>2</span></strong></li>';
const inicioTres = '<li class="INICIO-PERIODO"><strong>INICIO-PERIODO <span>3</span></strong></li>';
const marcador = '<div class="marcador-box">24</div><div class="marcador-box">36</div>';

test("detecta evento de cierre y lee marcador, sin atribuirlo automáticamente al cierre", () => {
  const r = analizarCierreOficial(finalDos, marcador);
  assert.equal(r.periodo, 2);
  assert.deepEqual(r.marcadorActual, { local: 24, visitante: 36 });
  assert.equal(r.registrable, false);
  assert.equal(r.marcadorSincronizado, false);
});
test("rechaza marcador posterior al comienzo del siguiente cuarto", () => {
  const r = analizarCierreOficial(inicioTres + finalDos, marcador);
  assert.equal(r.inicioSiguientePeriodo, true);
  assert.equal(r.registrable, false);
});
test("no registra sin evento de cierre ni con marcador incompleto", () => {
  assert.equal(analizarCierreOficial("", marcador).cierreDetectado, false);
  assert.equal(analizarCierreOficial(finalDos, '<div class="marcador-box">24</div>').marcadorActual, null);
});
