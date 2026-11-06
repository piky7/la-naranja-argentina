import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home=readFileSync(new URL("../src/pages/Home.jsx",import.meta.url),"utf8");

test("Los tres popups se importan bajo demanda y se preparan en inactividad",()=>{
  for(const [name,loader] of [["UpcomingMatchModal","loadUpcomingModal"],["FinishedMatchModal","loadFinishedModal"],["PlayerModal","loadPlayerModal"]]){
    assert.ok(home.includes(`const ${loader} = () => import("../components/${name}");`));
    assert.ok(home.includes(`const ${name} = lazy(${loader});`));
    assert.doesNotMatch(home,new RegExp('import '+name+' from'));
    assert.ok(home.includes("<"+name),name);
  }
  assert.match(home,/<Suspense fallback=\{<PopupLoading \/>\}>/);
  assert.match(home,/requestIdleCallback\(prepare/);
  assert.match(home,/connection\?\.saveData/);
  assert.match(home,/Cargando partido/);
  assert.doesNotMatch(home,/import "\.\.\/components\/UpcomingHeader\.css"/);
  assert.doesNotMatch(home,/import MatchStatsTabs from/);
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
