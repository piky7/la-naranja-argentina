import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css=readFileSync(new URL("../src/pages/Home.css",import.meta.url),"utf8");
const finished=readFileSync(new URL("../src/components/FinishedMatchModal.jsx",import.meta.url),"utf8");

test("El popup de resultados mantiene LNA y Estadísticas del partido",()=>{
  assert.match(finished,/<div className="match-modal-footer">\s*<span>LNA<\/span>\s*<strong>\s*ESTADÍSTICAS DEL PARTIDO\s*<\/strong>/);
});

test("El pie de resultados tiene estilos independientes del popup próximo",()=>{
  const footer=css.slice(css.lastIndexOf("/* Popup de resultados anteriores: pie separado"));
  assert.match(footer,/\.match-modal\.match-modal-finished \.match-modal-footer \{/);
  assert.match(footer,/display: flex/);
  assert.match(footer,/justify-content: space-between/);
  assert.match(footer,/box-sizing: border-box/);
  assert.match(footer,/padding: 8px 15px 10px/);
  assert.match(footer,/\.match-modal-footer > span/);
  assert.match(footer,/\.match-modal-footer > strong/);
  assert.match(footer,/text-align: right/);
  assert.match(footer,/@media \(max-width: 600px\)/);
});
