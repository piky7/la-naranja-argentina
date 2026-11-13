import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("La portada permanece disponible como ruta inicial directa",()=>{
  assert.match(source,/import Home from "\.\/pages\/Home";/);
  assert.match(source,/<Route path="\/" element=\{<Home \/>\}/);
});

test("Las páginas secundarias se descargan solo cuando se navega a ellas",()=>{
  for(const name of ["Equipos","Equipo","Jugadores","Privacidad","Acerca","Admin"]){
    assert.match(source,new RegExp("const "+name+" = lazy\\(\\(\\) => import\\(\\\"\\.\\/pages/"+name+"\\\"\\)\\);"));
    assert.doesNotMatch(source,new RegExp("import "+name+" from "));
  }
  assert.match(source,/const loadProde = \(\) => import\("\.\/pages\/Prode"\);/);
  assert.match(source,/const Prode = lazy\(loadProde\);/);
  assert.doesNotMatch(source,/import Prode from /);
});

test("La precarga de secciones solo se inicia desde Inicio",()=>{
  assert.match(source,/const location = useLocation\(\)/);
  assert.match(source,/location\.pathname !== "\/"/);
  assert.match(source,/const preloadStarted = useRef\(false\)/);
  assert.match(source,/preloadStarted\.current = true/);
  assert.match(source,/\}, \[location\.pathname\]\)/);
  assert.match(source,/connection\?\.saveData/);
  assert.match(source,/requestIdleCallback/);
  assert.match(source,/const Liga = lazy\(loadLiga\)/);
  assert.match(source,/const Estadisticas = lazy\(loadEstadisticas\)/);
});

test("La precarga inicial descarga solo módulos en inactividad y no consulta datos autenticados",()=>{
  assert.match(source,/const preload = \(\) => \{/);
  assert.match(source,/Promise\.allSettled\(\[loadLiga\(\), loadEstadisticas\(\), loadProde\(\), loadMiCarrera\(\)\]\)/);
  assert.match(source,/}, 3600\)/);
  assert.match(source,/requestIdleCallback\(preload, \{ timeout: 10000 \}\)/);
  assert.doesNotMatch(source,/watchProdeUser|fetchProdeRead|fetchCareerData/);
});
test("Prode se mantiene montado tras primera visita, con Suspense propio",()=>{
  assert.match(source,/prodeVisited && <div/);
  assert.match(source,/display: isProde \? undefined : "none"/);
  assert.match(source,/<Suspense fallback=\{isProde \? <RouteLoading \/> : null\}>/);
  assert.match(source,/<Prode \/>/);
  assert.match(source,/prode-page-reopened/);
});

test("Las fuentes externas de Prode se cargan de forma diferida al abrir la página",async()=>{
  const page=await import("node:fs").then(({readFileSync})=>readFileSync(new URL("../src/pages/Prode.jsx",import.meta.url),"utf8"));
  const styles=readFileSync(new URL("../src/pages/Prode.css",import.meta.url),"utf8");
  assert.match(page,/id = "lna-prode-fonts"/);
  assert.match(page,/fonts\.googleapis\.com\/css2\?family=Orbitron/);
  assert.match(page,/link\.media = "print"/);
  assert.match(page,/link\.onload = \(\) => \{ link\.media = "all"; \}/);
  assert.doesNotMatch(styles,/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com/);
});


test("Mi jugador muestra el trofeo de la categoría actual",()=>{
  const page=readFileSync(new URL("../src/components/FanLevel.jsx",import.meta.url),"utf8");
  const styles=readFileSync(new URL("../src/components/FanLevel.css",import.meta.url),"utf8");
  assert.match(page,/<small className="lna-fan-player-display-league"><img src=\{TROPHY_IMAGES\[index\]\}/);
  assert.match(page,/alt=\{\x60Trofeo \$\{displayLevel\(level\.name\)\}\x60\}/);
  assert.match(styles,/\.lna-fan-player-display-league img\{[^}]*object-fit:contain/);
});


test("Los tres popups se precargan juntos durante inactividad",()=>{
  const home=readFileSync(new URL("../src/pages/Home.jsx",import.meta.url),"utf8");
  assert.match(home,/Promise\.allSettled\(\[loadUpcomingModal\(\), loadFinishedModal\(\), loadPlayerModal\(\)\]\)/);
  assert.match(home,/requestIdleCallback\(prepare, \{ timeout: 12000 \}\)/);
  assert.match(home,/}, 2800\)/);
  assert.doesNotMatch(home,/void loadUpcomingModal\(\);/);
});
