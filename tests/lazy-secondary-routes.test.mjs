import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("La portada permanece disponible como ruta inicial directa",()=>{
  assert.match(source,/import Home from "\.\/pages\/Home";/);
  assert.match(source,/<Route path="\/" element=\{<Home \/>\}/);
});

test("Las páginas secundarias se descargan solo cuando se navega a ellas",()=>{
  for(const name of ["Equipos","Equipo","Jugadores","Privacidad","Acerca","Prode","Admin"]){
    assert.match(source,new RegExp("const "+name+" = lazy\\(\\(\\) => import\\(\"\\./pages/"+name+"\\\"\\)\\);"));
    assert.doesNotMatch(source,new RegExp("import "+name+" from "));
  }
});

test("Liga y Estadísticas conservan precarga controlada sin bloquear la portada",()=>{
  assert.match(source,/const Liga = lazy\(loadLiga\)/);
  assert.match(source,/const Estadisticas = lazy\(loadEstadisticas\)/);
  assert.match(source,/connection\?\.saveData/);
  assert.match(source,/requestIdleCallback/);
});

test("Prode se mantiene montado tras primera visita, con Suspense propio",()=>{
  assert.match(source,/prodeVisited && <div/);
  assert.match(source,/display: isProde \? undefined : "none"/);
  assert.match(source,/<Suspense fallback=\{isProde \? <RouteLoading \/> : null\}>/);
  assert.match(source,/<Prode \/>/);
  assert.match(source,/prode-page-reopened/);
});
