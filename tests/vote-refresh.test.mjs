import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const winner = read("src/components/MatchVote.jsx");
const mvp = read("src/components/MvpPrediction.jsx");
const votingWorker = read("workers/votaciones/worker.js");

test("el voto ganador vuelve a consultar los totales porque el POST no los devuelve", () => {
  const start = winner.indexOf('await requestPrediction("winner", id, team)');
  const refresh = winner.indexOf('refreshed = await requestPrediction("winner", id)', start);
  assert.ok(start >= 0 && refresh > start);
  assert.match(winner.slice(start, refresh), /El POST confirma el guardado/);
  const postResponse = votingWorker.slice(votingWorker.indexOf('// Tras guardar un voto sí devolvemos'), votingWorker.indexOf('} catch (error)', votingWorker.indexOf('// Tras guardar un voto sí devolvemos')));
  assert.match(postResponse, /points: rewards\.points/);
  assert.doesNotMatch(postResponse, /home:\s*\{|away:\s*\{/);
});

test("el ranking MVP se refresca después de confirmar el voto", () => {
  const start = mvp.indexOf('const saved = await requestPrediction("mvp", id, playerId)');
  const refresh = mvp.indexOf('body = await requestPrediction("mvp", id)', start);
  assert.ok(start >= 0 && refresh > start);
  assert.match(mvp.slice(start, refresh), /const saved/);
  assert.match(mvp.slice(refresh), /setRanking\(Array\.isArray\(body\.ranking\)/);
});
