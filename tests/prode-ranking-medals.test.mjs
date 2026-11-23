import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../workers/prode/worker.js",import.meta.url),"utf8");
const range=(a,b)=>{
  const start=source.indexOf(a),end=source.indexOf(b,start);
  assert.ok(start>=0&&end>start,"Faltan reglas de ranking en Worker: "+a);
  return source.slice(start,end);
};
const rankingCode=range("        rows.sort((a,b) => b.points-a.points", "        // Historial numerado desde la semana");
const medalsCode=range("        // Medallas de semanas cerradas con al menos tres pronosticadores.", "        // Vista semanal de partidos finalizados");
const rank=new Function("rows","weekStart",rankingCode+"\nreturn {ranking,weeklyRanking};");
const medal=new Function("rows","weekStart","firstWeek",medalsCode+"\nreturn medalTable;");
const monday=Date.parse("2026-11-02T00:00:00Z");
const entrant=(id,points,weekly=points,played=1,weekPoints=weekly)=>({
  userId:id,username:id,points,played,correct:played,mvpVotes:0,
  initialPoints:null,currentStreak:0,
  weekly:{points:weekly,played,mvpVoted:0},
  weeks:{[monday]:{points:weekPoints,played,mvpVoted:0}}
});

test("General de Prode usa ranking denso: 1°, 1°, 2°, 3°",()=>{
  const rows=[entrant("a",75),entrant("b",75),entrant("c",50),entrant("d",35)];
  const ranked=rank(rows,monday).ranking;
  assert.deepEqual(ranked.map(x=>x.position),[1,1,2,3]);
});

test("Ranking semanal conserva empates por puntos, sin contar no participantes",()=>{
  const rows=[entrant("a",40,50),entrant("b",30,50),entrant("c",10,25),entrant("d",0,0,0)];
  const ranking=rank(rows,monday).weeklyRanking;
  assert.deepEqual(ranking.map(x=>x.position),[1,1,2,null]);
});

test("No da medallas si solo dos participantes jugaron en la semana",()=>{
  const rows=[entrant("a",40),entrant("b",25),entrant("c",0,0,0)];
  const standings=medal(rows,monday+7*86400000,monday);
  assert.equal(standings.reduce((sum,row)=>sum+row.gold+row.silver+row.bronze,0),0);
});

test("Tres participantes activos habilitan oro, plata y bronce al cerrar semana",()=>{
  const rows=[entrant("a",75),entrant("b",50),entrant("c",25)];
  const standings=medal(rows,monday+7*86400000,monday);
  assert.equal(standings.find(x=>x.userId==="a").gold,1);
  assert.equal(standings.find(x=>x.userId==="b").silver,1);
  assert.equal(standings.find(x=>x.userId==="c").bronze,1);
  assert.equal(standings.find(x=>x.userId==="a").history[0].week,1);
});

test("Medallero usa posiciones densas: dos primeros reciben oro y el siguiente plata",()=>{
  const rows=[entrant("a",75),entrant("b",75),entrant("c",50),entrant("d",25)];
  const standings=medal(rows,monday+7*86400000,monday);
  assert.equal(standings.find(x=>x.userId==="a").gold,1);
  assert.equal(standings.find(x=>x.userId==="b").gold,1);
  assert.equal(standings.find(x=>x.userId==="c").silver,1);
  assert.equal(standings.find(x=>x.userId==="d").bronze,1);
});

test("La semana abierta no entrega medallas de forma anticipada",()=>{
  const rows=[entrant("a",75),entrant("b",50),entrant("c",25)];
  const standings=medal(rows,monday,monday);
  assert.ok(standings.every(x=>x.gold+x.silver+x.bronze===0));
});
