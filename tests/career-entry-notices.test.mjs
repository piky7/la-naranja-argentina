import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = read("src/App.jsx");
const notices = read("src/components/CareerEntryNotices.jsx");
const fanLevel = read("src/components/FanLevel.jsx");
const upcomingHeader = read("src/components/UpcomingHeader.css");

test("Los avisos de Mi Carrera se montan desde la aplicación y no desde la página", () => {
  assert.match(app, /const CareerEntryNotices = lazy\(\(\) => import\("\.\/components\/CareerEntryNotices"\)\)/);
  assert.match(app, /<Suspense fallback=\{null\}><CareerEntryNotices \/><\/Suspense>/);
  assert.doesNotMatch(fanLevel, /rewardNotice/);
  assert.doesNotMatch(fanLevel, /setRewardNotice/);
});

test("Los avisos globales requieren una sesión Google confirmada", () => {
  assert.match(notices, /const \{ user, loading \} = useCareerSession\(\)/);
  assert.match(notices, /if \(loading \|\| !user\)/);
  assert.match(notices, /if \(!user \|\| !queue\.length\) return null/);
  assert.match(notices, /fetchCareerData\("predictions"\)/);
});

test("El aviso de puntos conserva el seguimiento de recompensas y su desglose", () => {
  assert.match(notices, /lna-career-rewards-seen-v1/);
  assert.match(notices, /Number\(p\.earned\) > Number\(previous\[p\.partidoId\] \|\| 0\)/);
  assert.match(notices, /buildRewardGames\(changes, previous\)/);
  assert.match(notices, /lna-entry-notice-points/);
  assert.match(notices, /PUNTUACIÓN TOTAL/);
});

test("El recordatorio de pronósticos consulta la fecha argentina y se muestra una sola vez por día y usuario", () => {
  assert.match(notices, /America\/Argentina\/Buenos_Aires/);
  assert.match(notices, /match\.date === today/);
  assert.match(notices, /requestPrediction\("winner", gameId\)/);
  assert.match(notices, /requestPrediction\("mvp", gameId\)/);
  assert.match(notices, /winnerPending \|\| mvpPending/);
  assert.match(notices, /lna-vote-entry-notice-seen-v1/);
  assert.match(notices, /user\.uid/);
  assert.match(notices, /Todavía no completaste tus pronósticos de hoy/);
  assert.match(notices, /lna-vote-updated/);
});

test("El popup de próximo partido respeta el área segura del iPhone", () => {
  assert.match(upcomingHeader, /safe-area-inset-top/);
  assert.match(upcomingHeader, /height:100dvh/);
  assert.match(upcomingHeader, /\.match-modal-upcoming > \.match-modal-close/);
  assert.match(upcomingHeader, /top:10px!important/);
});
