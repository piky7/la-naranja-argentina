import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home=readFileSync(new URL("../src/pages/Home.jsx",import.meta.url),"utf8");

test("Los tres popups se importan bajo demanda, sin cargarlos al abrir Home",()=>{
  for(const name of ["UpcomingMatchModal","FinishedMatchModal","PlayerModal"]){
    assert.match(home,new RegExp('const '+name+' = lazy\\(\\(\\) => import\\("\\.\\./components/'+name+'"\\)\\)'));
    assert.doesNotMatch(home,new RegExp('import '+name+' from'));
    assert.ok(home.includes("<"+name),name);
  }
  assert.match(home,/<Suspense fallback=\{null\}>/);
});

test("En móvil Posiciones no calcula Máximos anotadores antes de seleccionarlos",()=>{
  assert.match(home,/homeStatsTab !== "anotadores" && !desktopScorersVisible\) return \[\]/);
  assert.match(home,/useMemo\(\(\) => \{/);
  assert.match(home,/\}, \[homeStatsTab, desktopScorersVisible\]\)/);
  assert.match(home,/\(min-width: 1100px\)/);
  assert.match(home,/media\.addEventListener\("change", update\)/);
  assert.match(home,/media\.removeEventListener\("change", update\)/);
});

test("No se altera la precisión de la clasificación ni estadísticas oficiales",()=>{
  assert.match(home,/const standings = useMemo/);
  assert.match(home,/record\?\.source !== "Liga Nacional"/);
  assert.match(home,/\bmatchPlayerStats\b/);
  assert.match(home,/UPCOMING_COLLECTIVE_RANKS/);
  assert.match(home,/selectedDayMatches\.map\(\(match, matchIndex\)/);
});
