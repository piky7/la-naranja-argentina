import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const careerSource = readFileSync(new URL("../workers/votaciones/worker.js", import.meta.url),"utf8");
const prodeSource = readFileSync(new URL("../workers/prode/worker.js", import.meta.url),"utf8");
const careerStart = careerSource.indexOf("async function calculateRewards(");
const careerEnd = careerSource.indexOf("async function getRewards(",careerStart);
const pureStart = careerSource.indexOf("function timelyFinishObservation(");
const pureEnd = careerSource.indexOf("// Archivo permanente de partidos",pureStart);
const lookupStart = careerSource.indexOf("async function getFinishObservations(",pureStart);
const compareStart = careerSource.indexOf("function comparePredictionGames(",lookupStart);
assert.ok(lookupStart>pureStart && compareStart>lookupStart);
assert.ok(careerStart >= 0 && careerEnd > careerStart && pureStart >= 0 && pureEnd > pureStart);

class FixedDate extends Date {
  static now() { return Date.parse("2026-12-01T12:00:00Z"); }
}
const compute = new Function("Date","getFinishObservations",
  careerSource.slice(pureStart,lookupStart) + "\n" + careerSource.slice(compareStart,pureEnd) + "\n" +
  careerSource.slice(careerStart,careerEnd) + "\nreturn calculateRewards;"
)(FixedDate,async db => new Map(db.observations));

const prodeBegin=prodeSource.indexOf("function compareStreakGames(");
const prodeEnd=prodeSource.indexOf("const PROJECT_ID =",prodeBegin);
assert.ok(prodeBegin>=0 && prodeEnd>prodeBegin);
const { order, timeline }=new Function("Date",prodeSource.slice(prodeBegin,prodeEnd)+
  "\nreturn {order:compareUserStreakGames,timeline:unifiedStreakTimeline};")(FixedDate);

const START=Date.parse("2026-11-06T18:00:00-03:00");
function fixtureGame(i,options={}) {
  const startsAt=new Date(START + i*60*60*1000).toISOString();
  return {id:"2026-11-"+String(6+Math.floor(i/24)).padStart(2,"0")+"-game-"+i,
    startsAt,homeTeam:"local",awayTeam:"visitante",
    homeScore:90,awayScore:85,finished:true,mvpWinners:["mvp"],...options};
}
function makeDb(games,ballots,observations={}) {
  const votes=games.flatMap((game,i)=>ballots[i]===true?[{partido_id:game.id,equipo_votado:"local"}]:
    ballots[i]===false?[{partido_id:game.id,equipo_votado:"visitante"}]:[]);
  const first=votes.map(v=>v.partido_id).sort()[0] || null;
  const db={observations:Object.entries(observations),prepare(query) {
    const result={
      bind() { return result; },
      async all() {
        if(query.includes("FROM votos_mvp")) return {results:[]};
        if(query.includes("FROM votos WHERE")) return {results:votes};
        throw Error("Consulta no prevista: "+query);
      },
      async first() {
        if(query.includes("MIN(partido_id)")) return {first_id:query.includes("votos_mvp")?null:first};
        throw Error("Consulta no prevista: "+query);
      },
      async run() { if(!query.startsWith("CREATE TABLE")) throw Error("Escritura no prevista"); }
    };
    return result;
  }};
  return db;
}
async function career(games,ballots,observations) {
  return compute(makeDb(games,ballots,observations),{games},"usuario-test");
}

test("Cinco aciertos de Mi Carrera dan 120 puntos y bono solo en el quinto",async()=>{
  const games=Array.from({length:5},(_,i)=>fixtureGame(i));
  const result=await career(games,[true,true,true,true,true]);
  assert.equal(result.points,120);
  assert.equal(result.winStreak,0);
  assert.deepEqual(games.map(g=>result.perGame[g.id].earned),[15,15,15,15,60]);
});

test("Ascenso por puntos conserva histórico y reinicia puntos de categoría",async()=>{
  const games=Array.from({length:4},(_,i)=>fixtureGame(i));
  const result=await career(games,[true,true,true,true]);
  assert.equal(result.points,60);
  assert.equal(result.career.categoryIndex,1);
  assert.equal(result.career.cups,1);
  assert.equal(result.career.descents,0);
  assert.equal(result.seasonPoints,0);
  assert.equal(result.career.history[0].type,"promotion");
});

test("Cinco errores consecutivos descienden desde Liga Argentina",async()=>{
  const games=Array.from({length:13},(_,i)=>fixtureGame(i));
  const result=await career(games,[
    ...Array(8).fill(true),...Array(5).fill(false)
  ]);
  assert.ok(result.career.bestCategory>=2,"Debe haber alcanzado Liga Argentina");
  assert.equal(result.career.categoryIndex,1);
  assert.equal(result.career.descents,1);
  assert.equal(result.career.history[0].type,"descent");
});

test("No votar corta aciertos y no suma puntos ni aumenta errores",async()=>{
  const games=Array.from({length:4},(_,i)=>fixtureGame(i));
  const result=await career(games,[true,true,null,true]);
  assert.equal(result.points,45);
  assert.equal(result.winStreak,1);
  assert.equal(result.lossStreak,0);
  assert.equal(result.career.descents,0);
});

test("Partidos pendientes no afectan puntos ni rachas",async()=>{
  const games=[fixtureGame(0),fixtureGame(1),fixtureGame(2,{finished:false,homeScore:null,awayScore:null})];
  const result=await career(games,[true,true,false]);
  assert.equal(result.points,30);
  assert.equal(result.winStreak,2);
  assert.equal(result.lossStreak,0);
});

test("Dos simultáneos detectados juntos: error primero y acierto después",async()=>{
  const old=Array.from({length:3},(_,i)=>fixtureGame(i));
  const sameStart="2026-11-06T22:00:00-03:00";
  const miss=fixtureGame(4,{id:"2026-11-06-a",startsAt:sameStart});
  const hit=fixtureGame(5,{id:"2026-11-06-b",startsAt:sameStart});
  const observed="2026-11-06T23:50:00-03:00";
  const result=await career([...old,hit,miss],[true,true,true,true,false],{
    [hit.id]:observed,[miss.id]:observed
  });
  assert.equal(result.points,65);
  assert.equal(result.winStreak,1);
  assert.equal(result.perGame[miss.id].earned,5);
  assert.equal(result.perGame[hit.id].earned,15);
  const prodeGames=[
    {id:hit.id,startsAt:sameStart,finishedObservedAt:observed,finished:true,voted:true,correct:true},
    {id:miss.id,startsAt:sameStart,finishedObservedAt:observed,finished:true,voted:true,correct:false}
  ];
  assert.deepEqual([...prodeGames].sort(order).map(g=>g.id),[miss.id,hit.id]);
});

test("A igual inicio, se procesa antes el partido que terminó antes",async()=>{
  const startsAt="2026-11-06T22:00:00-03:00";
  const first=fixtureGame(1,{id:"2026-11-06-z",startsAt});
  const second=fixtureGame(2,{id:"2026-11-06-a",startsAt});
  const result=await career([second,first],[false,true],{
    [first.id]:"2026-11-06T23:00:00-03:00",
    [second.id]:"2026-11-06T23:30:00-03:00"
  });
  assert.equal(result.winStreak,0);
  assert.equal(result.points,20);
});

test("La racha unificada de Prode da bono cada cinco y preserva los tres previos",()=>{
  const games=Array.from({length:8},(_,i)=>({
    id:"g"+i,startsAt:new Date(START+i*3600000).toISOString(),
    finished:true,voted:true,correct:true
  }));
  const result=timeline(games);
  assert.equal([...result.byGame.values()].filter(x=>x.bonus).length,1);
  assert.equal(result.current,3);
});

test("Rachas distintas por usuario ante finales simultáneos",()=>{
  const startsAt="2026-11-06T22:00:00-03:00";
  const end="2026-11-06T23:10:00-03:00";
  const a={id:"a",startsAt,finishedObservedAt:end,finished:true,voted:true,correct:true};
  const b={id:"b",startsAt,finishedObservedAt:end,finished:true,voted:true,correct:false};
  assert.deepEqual([a,b].sort(order).map(x=>x.id),["b","a"]);
  assert.deepEqual([{...a,correct:false},{...b,correct:true}].sort(order).map(x=>x.id),["a","b"]);
});
