import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("src/pages/Liga.jsx", "utf8");
const popupStart = source.indexOf("{/* POPUP PRÓXIMO PARTIDO */}");
const popupEnd = source.indexOf("{/* =========================\n          MODAL EQUIPO", popupStart);
assert(popupStart >= 0 && popupEnd > popupStart, "No se encontró el popup de próximo partido");
const popup = source.slice(popupStart, popupEnd);
assert(popup.includes("createPortal("), "El popup debe abrirse mediante portal");
assert(popup.includes("LiveMatchInfo"), "Falta información LIVE del popup");

for (const name of ["selectedUpcomingHomeTeam", "selectedUpcomingAwayTeam"]) {
  if (popup.includes(name)) {
    const declaration = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`);
    assert(declaration.test(source.slice(0, popupStart)), `Variable sin definir en popup: ${name}`);
  }
}

console.log("OK: estructura y referencias de equipos del popup de Liga verificadas.");
