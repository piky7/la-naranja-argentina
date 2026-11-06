import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/pages/Home.css",import.meta.url),"utf8");
const popup = readFileSync(new URL("../src/components/UpcomingMatchModal.jsx",import.meta.url),"utf8");

test("El pie del popup próximo partido conserva ambas leyendas",()=>{
  assert.match(popup,/<div className="match-modal-footer">\s*<span>LNA<\/span>\s*<strong>\s*PROMEDIOS DE TEMPORADA\s*<\/strong>/);
});

test("El pie tiene distribución, altura, padding y tipografía específica",()=>{
  const footer = css.slice(css.lastIndexOf("/* Popup de próximo partido: pie legible"));
  assert.match(footer,/\.match-modal\.match-modal-upcoming > \.match-modal-footer \{/);
  assert.match(footer,/display: flex/);
  assert.match(footer,/justify-content: space-between/);
  assert.match(footer,/padding: 8px 15px 10px/);
  assert.match(footer,/box-sizing: border-box/);
  assert.match(footer,/\.match-modal-footer > span/);
  assert.match(footer,/\.match-modal-footer > strong/);
  assert.match(footer,/@media \(max-width: 600px\)/);
  assert.match(footer,/text-align: right/);
});
