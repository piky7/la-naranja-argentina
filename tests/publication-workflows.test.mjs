import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("LNA separa el polling frecuente de la sincronización completa de respaldo", () => {
  const unified = read("../.github/workflows/actualizar-lna-completo.yml");
  const workerConfig = read("../worker/lna-sync/wrangler.toml");
  const worker = read("../worker/lna-sync/src/index.js");
  assert.match(workerConfig, /crons\s*=\s*\["\*\/5 \* \* \* \*"\]/);
  assert.match(unified, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(unified, /^\s{2}workflow_dispatch:/m);
  assert.match(worker, /minute === 5 && hour % 6 === 0/);
  assert.doesNotMatch(worker, /minute % 10 === 0/);
  assert.match(unified, /data\/lab\/backfill-request\.json/);
});

test("los procesos que publican datos LNA comparten un bloqueo global", () => {
  const unified = read("../.github/workflows/actualizar-lna-completo.yml");
  const punctual = read("../.github/workflows/publicar-estadisticas-partido.yml");
  const group = "group: lna-publicacion-datos-main";
  assert.ok(unified.includes(group));
  assert.ok(punctual.includes(group));
  assert.match(unified, /cancel-in-progress:\s*false/);
  assert.match(punctual, /cancel-in-progress:\s*false/);
});

test("la publicación puntual reintenta desde main y valida ambas competencias", () => {
  const workflow = read("../.github/workflows/publicar-estadisticas-partido.yml");
  assert.match(workflow, /for intento in 1 2 3/);
  assert.match(workflow, /git fetch origin main/);
  assert.match(workflow, /git reset --hard origin\/main/);
  assert.match(workflow, /sync-lab-boxscores\.cjs --match=/);
  assert.match(workflow, /sync-liga-history\.cjs/);
  assert.match(workflow, /public\/published-matches\.json/);
  assert.match(workflow, /Los datos ya estaban publicados; ejecución idempotente/);
});
