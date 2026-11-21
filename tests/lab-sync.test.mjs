import test from "node:test";
import assert from "node:assert/strict";
import { isLabMatchFinished } from "../src/utils/labMatchStatus.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isOfficialFinal, parseScore, validateCompletedBoxscore } = require("../scripts/sync-lab-boxscores.cjs");
const { parseFixtureRows } = require("../scripts/parse-fixture-lab.cjs");

test("LAB reconoce únicamente estados oficiales de partido finalizado", () => {
  assert.equal(isOfficialFinal("Finalizado"), true);
  assert.equal(isOfficialFinal("FINAL"), true);
  assert.equal(isOfficialFinal("Final del partido"), true);
  assert.equal(isOfficialFinal("En juego"), false);
  assert.equal(isOfficialFinal("Descanso"), false);
  assert.equal(isOfficialFinal("Programado"), false);
  assert.equal(isOfficialFinal(""), false);
});

test("LAB interpreta el marcador oficial y rechaza valores vacíos", () => {
  assert.equal(parseScore("87"), 87);
  assert.equal(parseScore(" 102 "), 102);
  assert.equal(parseScore(""), null);
  assert.equal(parseScore("87-85"), null);
});

test("LAB solo valida una planilla completa con ambos equipos y puntos consistentes", () => {
  const match = {homeTeam:{teamId:11},awayTeam:{teamId:22}};
  const players = [
    ...Array.from({length:5},(_,i)=>({teamId:11,points:2,minutes:"10:00"})),
    ...Array.from({length:5},(_,i)=>({teamId:22,points:3,minutes:"10:00"}))
  ];
  const comparison = {home:{},away:{}};
  assert.equal(validateCompletedBoxscore(match,"Finalizado",10,15,players,comparison),null);
  assert.match(validateCompletedBoxscore(match,"En juego",10,15,players,comparison),/FINAL/);
  assert.match(validateCompletedBoxscore(match,"Finalizado",11,15,players,comparison),/suma de puntos/);
  assert.match(validateCompletedBoxscore(match,"Finalizado",10,15,players.slice(0,8),comparison),/cinco jugadores/);
  assert.match(validateCompletedBoxscore(match,"Finalizado",10,15,players,null),/comparativa/);
});

test("LAB no interpreta el 0-0 del fixture como resultado final", () => {
  const html = `
    <table><tbody><tr class="fila-tabla-calendarios datos-estadisticos">
      <td></td>
      <td><a href="/laligaargentina/equipo/1/11/home"><img alt="HOME"/></a></td>
      <td class="resultados"><strong>0</strong></td>
      <td class="resultados"><strong>0</strong></td>
      <td><a href="/laligaargentina/equipo/2/22/away"><img alt="AWAY"/></a></td>
      <td></td>
      <td class="fecha-campo"><strong>20/11/2026 20:30</strong></td>
      <td><a href="/laligaargentina/partido/abc/home-vs-away">Planilla</a></td>
    </tr></tbody></table>`;
  const [match] = parseFixtureRows(html);
  assert.ok(match);
  assert.equal(match.status,"scheduled");
  assert.equal(match.homeScore,0);
  assert.equal(match.awayScore,0);
});

test("LAB conserva como jugados los resultados históricos score_available", () => {
  const yesterday = new Date(Date.now() - 86400000);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(yesterday);
  assert.equal(isLabMatchFinished({status:"score_available",date,homeScore:83,awayScore:78}), true);
  assert.equal(isLabMatchFinished({status:"score_available",date,homeScore:0,awayScore:0}), false);
  assert.equal(isLabMatchFinished({status:"score_available",date:"2999-01-01",homeScore:83,awayScore:78}), false);
  assert.equal(isLabMatchFinished({status:"finished",date:"2999-01-01",homeScore:83,awayScore:78}), true);
});
