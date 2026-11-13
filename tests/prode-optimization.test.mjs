import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchProdeRead, invalidateProdeReads, notifyProdeDataUpdated } from "../src/utils/prodeRequestCache.js";

// Verifica la lógica real utilizada por el Worker (no una copia de sus reglas).
// Se extraen sólo los helpers puros, anteriores a los secretos y rutas HTTP.
const source = readFileSync(new URL("../workers/prode/worker.js", import.meta.url), "utf8");
const begin = source.indexOf("function compareStreakGames(");
const end = source.indexOf('const PROJECT_ID =', begin);
assert.ok(begin >= 0 && end > begin, "No se pudieron localizar los helpers de rachas del Worker");
class FixedDate extends Date {
  static now() { return Date.parse("2026-11-30T00:00:00Z"); }
}
const timeline = new Function("Date", source.slice(begin, end) + "\nreturn unifiedStreakTimeline;")(FixedDate);
const game = (id, startsAt, correct, voted = true) => ({ id, startsAt, correct, voted, finished: true });
const old = n => Array.from({ length: n }, (_, i) => game("old-" + i, `2026-11-04T${String(10+i).padStart(2,"0")}:00:00-03:00`, true));
const next = n => Array.from({ length: n }, (_, i) => game("new-" + i, `2026-11-${String(6+Math.floor(i/8)).padStart(2,"0")}T${String(10+i%8).padStart(2,"0")}:00:00-03:00`, true));
const bonuses = games => [...timeline(games).byGame.values()].filter(g => g.bonus).length;

test("se conservan tres aciertos previos y dos nuevos completan el bono", () => {
  const games = [...old(3), ...next(2)];
  assert.equal(bonuses(games), 1);
  assert.equal(timeline(games).current, 0);
});

test("se acumulan dos bonos al completar diez aciertos nuevos", () => {
  assert.equal(bonuses(next(10)), 2);
  assert.equal(timeline(next(10)).current, 0);
});

test("un error rompe el progreso global de la racha", () => {
  const games = [...old(3), game("fail","2026-11-05T19:00:00-03:00",false), ...next(2)];
  assert.equal(bonuses(games), 0);
  assert.equal(timeline(games).current, 2);
});

test("un partido sin votar también corta la racha", () => {
  const games = [...old(3), game("miss","2026-11-05T19:00:00-03:00",false,false)];
  assert.equal(bonuses(games), 0);
  assert.equal(timeline(games).current, 0);
});

test("peticiones simultáneas se deduplican y caché distingue cuentas", async () => {
  invalidateProdeReads();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ ok: true, ranking: [] }) };
  };
  const userA = { uid: "A", getIdToken: async () => "token-a" };
  const userB = { uid: "B", getIdToken: async () => "token-b" };
  try {
    const [a, b] = await Promise.all([
      fetchProdeRead("/api/prode/ranking/historical", userA),
      fetchProdeRead("/api/prode/ranking/historical", userA),
    ]);
    assert.deepEqual(a, b);
    assert.equal(calls, 1);
    await fetchProdeRead("/api/prode/ranking/historical", userA);
    assert.equal(calls, 1);
    await fetchProdeRead("/api/prode/ranking/historical", userB);
    assert.equal(calls, 2);
    invalidateProdeReads();
    await fetchProdeRead("/api/prode/ranking/historical", userA);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
    invalidateProdeReads();
  }
});

test("una consulta fallida no queda en caché", async () => {
  invalidateProdeReads();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return { ok: false, json: async () => ({ ok: false, error: "Servidor no disponible" }) };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  try {
    await assert.rejects(fetchProdeRead("/api/prode/ranking/weekly", null));
    assert.deepEqual(await fetchProdeRead("/api/prode/ranking/weekly", null), { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
    invalidateProdeReads();
  }
});

test("un cambio de datos invalida todas las lecturas compartidas de Prode", async () => {
  invalidateProdeReads();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ ok: true, version: calls }) };
  };
  try {
    const user = { uid: "cache-user", getIdToken: async () => "token" };
    const first = await fetchProdeRead("/api/prode/groups/mine", user);
    assert.equal(first.version, 1);
    notifyProdeDataUpdated();
    const second = await fetchProdeRead("/api/prode/groups/mine", user);
    assert.equal(second.version, 2);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
    invalidateProdeReads();
  }
});

test("la precarga de secciones no consulta APIs autenticadas antes de abrirlas", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /Promise\.allSettled\(\[loadLiga\(\), loadEstadisticas\(\), loadProde\(\), loadMiCarrera\(\)\]\)/);
  assert.doesNotMatch(app, /watchProdeUser|fetchProdeRead|fetchCareerData/);
  assert.match(app, /requestIdleCallback\(preload/);
});

test("Firebase comparte un solo observador de estado entre los componentes", () => {
  const auth = readFileSync(new URL("../src/auth/prodeAuth.js", import.meta.url), "utf8");
  assert.equal((auth.match(/onAuthStateChanged\(/g) || []).length, 1);
  assert.match(auth, /const authSubscribers = new Set\(\)/);
  assert.match(auth, /deliveredAuthVersions/);
});

test("la migración Prode crea las tablas operativas y preserva membresías existentes", () => {
  const migration = readFileSync(new URL("../database/prode/002_runtime_tables.sql", import.meta.url), "utf8");
  for (const table of [
    "prode_membership_periods", "prode_career_links", "prode_vote_sources",
    "prode_user_crest_styles", "prode_user_crest_fonts", "prode_user_crest_symbols",
    "prode_crest_texts", "prode_user_crests", "prode_group_crests",
    "prode_career_jerseys", "prode_league_starts", "prode_initial_points", "prode_season_archives",
  ]) assert.match(migration, new RegExp("CREATE TABLE IF NOT EXISTS " + table));
  assert.match(migration, /INSERT OR IGNORE INTO prode_membership_periods/);
  assert.match(migration, /SELECT m\.group_id,m\.user_id,m\.joined_at FROM prode_memberships m/);
});

test("la migración de votaciones prepara las tablas auxiliares de Mi Carrera", () => {
  const migration = readFileSync(new URL("../database/votaciones/002_runtime_tables.sql", import.meta.url), "utf8");
  for (const table of ["partidos_final_detectado", "carrera_partidos", "votos_mvp", "voto_limites"]) {
    assert.match(migration, new RegExp("CREATE TABLE IF NOT EXISTS " + table));
  }
});

test("los votos y cambios de ligas invalidan también sus snapshots en memoria", () => {
  const groups = readFileSync(new URL("../src/components/ProdeGroups.jsx", import.meta.url), "utf8");
  const cache = readFileSync(new URL("../src/utils/prodeRequestCache.js", import.meta.url), "utf8");
  const career = readFileSync(new URL("../src/auth/careerAccount.js", import.meta.url), "utf8");
  assert.match(groups, /addEventListener\("lna-vote-updated", refreshAfterVote\)/);
  assert.match(groups, /leagueCache\.current\.clear\(\)/);
  assert.match(groups, /notifyProdeDataUpdated\(\)/);
  assert.match(cache, /addEventListener\("lna-vote-updated", invalidateProdeReads\)/);
  assert.match(career, /entry\.expiresAt = Date\.now\(\) \+ CAREER_READ_TTL/);
});
