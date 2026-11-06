import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const home = readFileSync("src/pages/Home.jsx", "utf8");
const liga = readFileSync("src/pages/Liga.jsx", "utf8");
const popup = readFileSync("src/components/UpcomingMatchModal.jsx", "utf8");

for (const [name, source] of [["Home", home], ["Liga", liga]]) {
  assert(source.includes("import UpcomingMatchModal"), `Falta importar popup común en ${name}`);
  assert(source.includes("<UpcomingMatchModal"), `Falta usar popup común en ${name}`);
  assert(!source.includes('{/* POPUP PRÓXIMO PARTIDO */}'),
    `Quedó una variante local antigua del popup en ${name}`);
  for (const team of ["selectedUpcomingHomeTeam", "selectedUpcomingAwayTeam"]) {
    assert(new RegExp(`\\b(?:const|let)\\s+${team}\\b`).test(source),
      `Variable sin definir en ${name}: ${team}`);
  }
}
assert(popup.includes("createPortal("), "El popup debe mostrarse en un portal");
assert(popup.includes("<LiveMatchInfo"), "Falta información LIVE");
assert(popup.includes("<MatchVote"), "Falta votación de ganador");
assert(popup.includes("<MvpPrediction"), "Falta votación del MVP");
assert(popup.includes("upcoming-tabs-three"), "Faltan pestañas unificadas");
console.log("OK: Home y Liga usan el mismo popup completo y sus referencias son válidas.");
