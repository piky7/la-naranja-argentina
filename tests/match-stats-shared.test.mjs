import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getMatchStats } from "../src/utils/getMatchStats.js";

const match = {
  id: "2026-11-06-boca-san-martin-1",
  date: "2026-11-06",
  homeTeam: "boca",
  awayTeam: "san-martin",
  officialUrl: "https://www.laliganacional.com.ar/laliga/partido/example",
};
const idKey = match.id;
const dateKey = "2026-11-06-boca-san-martin";
const legacyKey = "boca-san-martin";

test("Sin partido, no se buscan planillas", () => {
  assert.equal(getMatchStats(null, { [dateKey]: {source:"Liga Nacional"} }), null);
  assert.equal(getMatchStats(undefined, {}), null);
});

test("Prioriza la clave exacta del fixture sobre la clave de fecha", () => {
  const idRecord = { source: "Liga Nacional", name: "partido-ID" };
  const dateRecord = { source: "Liga Nacional", name: "partido-fecha" };
  assert.equal(getMatchStats(match, {[idKey]:idRecord,[dateKey]:dateRecord}),idRecord);
});

test("Encuentra el partido por fecha y equipos cuando el ID difiere", () => {
  const official = {source:"Liga Nacional",name:"partido-oficial"};
  assert.equal(getMatchStats(match,{[dateKey]:official}),official);
});

test("Un partido oficial nunca hereda planillas ambiguas de otro encuentro", () => {
  assert.equal(getMatchStats(match,{[legacyKey]:{source:"Flashscore"}}),null);
});

test("El fixture histórico sin enlace oficial conserva su respaldo legado", () => {
  const fallback = {source:"Flashscore",name:"registro-legado"};
  assert.equal(getMatchStats({...match,officialUrl:null},{[legacyKey]:fallback}),fallback);
});

test("Para partidos no oficiales también prevalece la fecha sobre el legado", () => {
  const first={name:"por-fecha"},second={name:"legado"};
  assert.equal(getMatchStats({...match,officialUrl:null},{[dateKey]:first,[legacyKey]:second}),first);
});

test("Las cuatro páginas importan la misma función sin redefinirla", () => {
  for(const page of ["Home","Liga","Equipo","Estadisticas"]){
    const code=readFileSync(new URL("../src/pages/"+page+".jsx",import.meta.url),"utf8");
    assert.match(code,/import \{ getMatchStats \} from "\.\.\/utils\/getMatchStats";/);
    assert.doesNotMatch(code,/(?:function\s+getMatchStats|const\s+getMatchStats\s*=)/);
  }
});
