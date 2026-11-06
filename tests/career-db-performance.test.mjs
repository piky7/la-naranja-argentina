import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker=readFileSync(new URL("../workers/votaciones/worker.js",import.meta.url),"utf8");
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
test("Antes de leer votos MVP se garantiza la tabla y se conservan los mapas",()=>{
  const create=rewards.indexOf("CREATE TABLE IF NOT EXISTS votos_mvp");
  const parallel=rewards.indexOf("Promise.all([");
  assert.ok(create>=0&&parallel>create);
  assert.match(rewards,/const voteMap = new Map\(\(votes\.results \|\| \[\]\)\.map/);
  assert.match(rewards,/const mvpMap = new Map\(\(mvpVotes\.results \|\| \[\]\)\.map/);
  assert.match(rewards,/const firstDate = \[firstVote\?\.first_id, firstMvp\?\.first_id\]/);
});
test("No modifica reglas de aciertos, errores, MVP ni racha unificada",()=>{
  for(const term of ["points+=15","points+=5","points += 20","points+=45","UNIFIED_STREAK_START","timelyFinishObservation","currentStay","categoryIndex"]) {
    assert.ok(rewards.includes(term),term);
  }
});
