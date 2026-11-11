import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const home=read("src/pages/Home.jsx");
const liga=read("src/pages/Liga.jsx");
const popup=read("src/components/UpcomingMatchModal.jsx");

test("Home y Liga usan un solo popup de próximos partidos",()=>{
  for(const [name,source] of [["Home",home],["Liga",liga]]) {
    assert.match(source,/const loadUpcomingModal = \(\) => import\("\.\.\/components\/UpcomingMatchModal"\)/,name);
    assert.match(source,/const UpcomingMatchModal = lazy\(loadUpcomingModal\)/,name);
    assert.match(source,/<UpcomingMatchModal\b/,name);
    assert.doesNotMatch(source,/className="match-modal-overlay"\s+onClick/,name);
    assert.doesNotMatch(source,/upcomingTab === "comparativa"/,name);
  }
});

test("Popup compartido conserva comparativa, jugadores y votación con MVP",()=>{
  for(const term of [
    "COMPARATIVA COLECTIVA · 2026/27",
    "ÚLTIMOS 2 PARTIDOS",
    "JUGADORES DESTACADOS",
    "Votación",
    "<MatchVote",
    "<MvpPrediction",
    "upcoming-career-status",
    "upcoming-tabs-three",
  ]) assert.ok(popup.includes(term),"Se perdió: "+term);
});

test("El popup compartido conserva quintetos y Mi voto durante partidos LIVE",()=>{
  for(const term of ["<LiveMatchInfo","<LiveStartingFive","<LiveRosters","<LiveMyVote","upcoming-live-tabs","formatLiveRemaining"]) {
    assert.ok(popup.includes(term),"Se perdió: "+term);
  }
});

test("Ambas pantallas pasan los mismos datos oficiales al popup",()=>{
  const props=[
    "selectedUpcomingMatch","getTeamPosition","getTeamRecord",
    "getTeamLastTwoMatches","getOfficialPlayerLeaders","getHighlightedPlayers",
    "getMatchStats","UPCOMING_COLLECTIVE_BY_TEAM","UPCOMING_COLLECTIVE_RANKS",
    "setSelectedMatch","setSelectedPlayer"
  ];
  for(const prop of props) {
    assert.ok(home.includes(prop+"={"),"Home: "+prop);
    assert.ok(liga.includes(prop+"={"),"Liga: "+prop);
  }
});

test("No se muestran ventanas duplicadas de votación al abrir el próximo partido desde Liga",()=>{
  assert.doesNotMatch(liga,/<MatchVote\s+match=\{selectedUpcomingMatch\}/);
  assert.match(popup,/<MatchVote match=\{selectedUpcomingMatch\}/);
});

test("El popup de próximo partido respeta el viewport dinámico y las áreas seguras del navegador móvil",()=>{
  const css=read("src/components/PopupDeferredOverrides.css");
  assert.match(css,/\.match-modal-overlay:has\(> \.match-modal-upcoming\)/);
  assert.match(css,/height:\s*100dvh/);
  assert.match(css,/env\(safe-area-inset-top/);
  assert.match(css,/env\(safe-area-inset-bottom/);
  assert.match(css,/max-height:\s*calc\(100dvh/);
});
