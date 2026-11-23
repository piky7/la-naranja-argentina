import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Home, Liga y los popups comparten el mismo estado LIVE", () => {
  const home = read("src/pages/Home.jsx");
  const liga = read("src/pages/Liga.jsx");
  const popup = read("src/hooks/useLiveMatch.js");
  assert.match(home, /useLiveSnapshot\(\)/);
  assert.match(liga, /useLiveSnapshot\(\)/);
  assert.match(popup, /useLiveSnapshot\(\)/);
  assert.doesNotMatch(home, /fetch\(LIVE_API_URL/);
  assert.doesNotMatch(liga, /setLiveSnapshot\(/);
  assert.doesNotMatch(popup, /setInterval\(/);
});

test("El estado compartido deduplica solicitudes y evita polling en segundo plano", () => {
  const store = read("src/hooks/useLiveSnapshot.js");
  assert.match(store, /useSyncExternalStore\(subscribe, getSnapshot/);
  assert.match(store, /if \(inFlight\) return inFlight/);
  assert.match(store, /listeners\.size === 1/);
  assert.match(store, /listeners\.size !== 0/);
  assert.match(store, /document\.hidden/);
  assert.match(store, /clearInterval\(timer\)/);
  assert.match(store, /visibilitychange/);
  assert.match(store, /POLL_MS = 60_000/);
});
