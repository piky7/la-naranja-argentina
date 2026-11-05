import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchProdeRead, invalidateProdeReads } from "../src/utils/prodeRequestCache.js";

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
