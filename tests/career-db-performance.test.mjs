import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker=readFileSync(new URL("../workers/votaciones/worker.js",import.meta.url),"utf8");
const migration=readFileSync(new URL("../database/votaciones/002_runtime_tables.sql",import.meta.url),"utf8");
const indexes=readFileSync(new URL("../database/votaciones/003_read_indexes.sql",import.meta.url),"utf8");
const start=worker.indexOf("async function calculateRewards(");
const end=worker.indexOf("async function getRewards(",start);
assert.ok(start>=0&&end>start);
const rewards=worker.slice(start,end);

test("Mi Carrera obtiene votos, MVP, fecha mínima y finales en un solo grupo concurrente",()=>{
  assert.match(rewards,/const \[votes, mvpVotes, firstVote, firstMvp, finishTimes\] = await Promise\.all\(\[/);
  const block=rewards.slice(rewards.indexOf("const [votes, mvpVotes"),rewards.indexOf("]);",rewards.indexOf("const [votes, mvpVotes"))+3);
  assert.match(block,/SELECT partido_id, equipo_votado FROM votos WHERE visitante_id=\?/);
  assert.match(block,/SELECT partido_id,jugador_id FROM votos_mvp WHERE visitante_id=\?/);
  assert.match(block,/SELECT MIN\(partido_id\) AS first_id FROM votos/);
  assert.match(block,/SELECT MIN\(partido_id\) AS first_id FROM votos_mvp/);
  assert.match(block,/getFinishObservations\(db\)/);
});
test("La tabla MVP se prepara en migración y las lecturas permanecen concurrentes",()=>{
  const migration=readFileSync(new URL("../database/votaciones/002_runtime_tables.sql",import.meta.url),"utf8");
  assert.match(migration,/CREATE TABLE IF NOT EXISTS votos_mvp/);
  assert.doesNotMatch(rewards,/CREATE TABLE IF NOT EXISTS/);
  const parallel=rewards.indexOf("Promise.all([");
  assert.ok(parallel>=0);
  assert.match(rewards,/const voteMap = new Map\(\(votes\.results \|\| \[\]\)\.map/);
  assert.match(rewards,/const mvpMap = new Map\(\(mvpVotes\.results \|\| \[\]\)\.map/);
  assert.match(rewards,/const firstDate = \[firstVote\?\.first_id, firstMvp\?\.first_id\]/);
});
test("No modifica reglas de aciertos, errores, MVP ni racha unificada",()=>{
  for(const term of ["points+=15","points+=5","points += 20","points+=45","UNIFIED_STREAK_START","timelyFinishObservation","currentStay","categoryIndex"]) {
    assert.ok(rewards.includes(term),term);
  }
});

test("Las tareas de esquema no se ejecutan durante las peticiones de votaciones",()=>{
  assert.doesNotMatch(worker,/CREATE TABLE IF NOT EXISTS/);
  for(const table of ["partidos_final_detectado","carrera_partidos","votos_mvp","voto_limites"]) {
    assert.match(migration,new RegExp("CREATE TABLE IF NOT EXISTS "+table));
  }
});

test("GET /api/votos no recalcula puntos ni barre el historial completo",()=>{
  const start=worker.indexOf('if (url.pathname !== "/api/votos")');
  const end=worker.indexOf('} catch (error) {\n      console.error("LNA votos:"',start);
  assert.ok(start>=0&&end>start);
  const route=worker.slice(start,end);
  const readBranch=route.slice(route.indexOf('if (request.method === "GET")'),route.indexOf("// Tras guardar un voto"));
  assert.match(readBranch,/SELECT equipo_votado/);
  assert.match(readBranch,/voteCounts\(env\.DB, id\)/);
  assert.doesNotMatch(readBranch,/getRewards|calculateRewards/);
  assert.match(route,/const rewards = await getRewards\(env\.DB, visitorId\)/);
});

test("Los índices cubren búsquedas por usuario y conteos por partido",()=>{
  for(const index of [
    "idx_votos_visitante_partido","idx_votos_partido_equipo",
    "idx_votos_mvp_visitante_partido","idx_votos_mvp_partido_jugador"
  ]) assert.match(indexes,new RegExp("CREATE INDEX IF NOT EXISTS "+index));
});
test("El cron archiva solo partidos del fixture y no relee toda la tabla histórica",()=>{
  const start=worker.indexOf("async function archiveFixture(");
  const end=worker.indexOf("// Lectura sin escrituras",start);
  assert.ok(start>=0&&end>start);
  const archive=worker.slice(start,end);
  assert.match(archive,/WHERE partido_id IN/);
  assert.match(archive,/slice\(i, i \+ 80\)/);
  assert.doesNotMatch(archive,/FROM carrera_partidos"\)\.all\(\)/);
});
