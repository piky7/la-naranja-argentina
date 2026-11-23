import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexFinishedLiveMatches, getFinishedLiveMatch } from "../src/utils/indexFinishedLiveMatches.js";

const match = { date: "2026-11-06", homeTeam: "boca", awayTeam: "san-martin" };

test("Solo indexa resultados finales confirmados, nunca entretiempos", () => {
  const liveMatches = [
    { ...match, status: "live", homeScore: 60, awayScore: 50 },
    { ...match, status: "finished", isHalftime: true, homeScore: 61, awayScore: 50 },
    { ...match, status: "finished", homeScore: null, awayScore: 80 },
  ];
  const indexed = indexFinishedLiveMatches({ date: match.date, liveMatches });
  assert.equal(getFinishedLiveMatch(indexed, match), null);
});

test("La clave fecha/equipos evita mezclar partidos de distintas jornadas", () => {
  const record = { ...match, status: "finished", homeScore: 91, awayScore: 86 };
  const indexed = indexFinishedLiveMatches({ date: match.date, liveMatches: [record] });
  assert.equal(getFinishedLiveMatch(indexed, match), record);
  assert.equal(getFinishedLiveMatch(indexed, { ...match, date: "2026-11-07" }), null);
  assert.equal(getFinishedLiveMatch(indexed, { ...match, awayTeam: "regatas" }), null);
});

test("Conserva el primer final elegible, igual que Array.find", () => {
  const older = { ...match, status: "finished", homeScore: 90, awayScore: 85 };
  const newer = { ...match, status: "finished", homeScore: 92, awayScore: 85 };
  const indexed = indexFinishedLiveMatches({ date: match.date, liveMatches: [older, newer] });
  assert.equal(getFinishedLiveMatch(indexed, match), older);
});

test("El índice es lineal: no vuelve a buscar en todo LIVE por cada partido", () => {
  const all = Array.from({length: 200}, (_,i) => ({
    date: "2026-11-06", homeTeam: "home-"+i, awayTeam: "away-"+i,
    status: "finished", homeScore: 80, awayScore: 75
  }));
  const index = indexFinishedLiveMatches({ date: "2026-11-06", liveMatches: all });
  assert.equal(index.size,200);
  for (const item of all) assert.equal(getFinishedLiveMatch(index,item),item);
});

test("Home memoriza fixture LIVE y módulos editoriales durante cambios de popup", () => {
  const home = readFileSync(new URL("../src/pages/Home.jsx",import.meta.url),"utf8");
  assert.match(home,/const standingsMatches = useMemo\(/);
  assert.match(home,/indexFinishedLiveMatches\(/);
  assert.match(home,/const \{ upcomingDesktop, recentDesktop \} = useMemo\(/);
});

test("Liga indexa el LIVE y Equipo conserva sus planteles por equipo", () => {
  const liga = readFileSync(new URL("../src/pages/Liga.jsx",import.meta.url),"utf8");
  const equipo = readFileSync(new URL("../src/pages/Equipo.jsx",import.meta.url),"utf8");
  assert.match(liga,/indexFinishedLiveMatches\(liveSnapshot\)/);
  assert.match(equipo,/TEAM_PLAYERS_CACHE\.set\(teamId, result\)/);
  assert.match(equipo,/TEAM_MATCHES_CACHE\.set\(teamId, result\)/);
});
