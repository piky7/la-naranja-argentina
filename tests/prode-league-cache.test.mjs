import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../workers/prode/worker.js",import.meta.url),"utf8");
const start=source.indexOf("const LEAGUE_RANKING_CACHE_SECONDS =");
const end=source.indexOf("export default {",start);
assert.ok(start>=0 && end>start,"Faltan helpers compartidos de rankings de liga");
let now=Date.parse("2026-11-06T12:00:00Z");
class Clock extends Date { static now(){return now;} }
const compare=(a,b)=>{
  const kickoff=Date.parse(a.startsAt)-Date.parse(b.startsAt);
  if(kickoff)return kickoff;
  const x=Date.parse(a.finishedObservedAt||"");
  const y=Date.parse(b.finishedObservedAt||"");
  if(Number.isFinite(x)&&Number.isFinite(y)&&x!==y)return x-y;
  return String(a.id||"").localeCompare(String(b.id||""));
};
const {read,store,invalidate,present}=new Function("Date","compareStreakGames","reply",
  source.slice(start,end)+"\nreturn {read:readLeagueRankingCache,store:storeLeagueRankingCache,invalidate:invalidateLeagueRankingCache,present:presentLeagueRanking};"
)(Clock,compare,payload=>payload);
function mockDb(){
  const entries=new Map(),queries=[];
  return {entries,queries,prepare(sql){
    queries.push(sql);
    return {bind(...args){
      return {
        async first(){
          const row=entries.get(args[0]);
          return row && row.expires_at>args[1]?{payload:row.payload}:null;
        },
        async run(){
          if(sql.startsWith("DELETE")){entries.delete(args[0]);return {};}
          entries.set(args[0],{payload:args[1],expires_at:args[2]});
          return {};
        },
      };
    }};
  }};
}
const match=(id,correctA,correctB)=>({
  id,startsAt:"2026-11-06T20:00:00-03:00",
  finishedObservedAt:"2026-11-06T22:30:00-03:00",
  participants:[
    {userId:"firebase:A",eligible:true,winnerCorrect:correctA},
    {userId:"firebase:B",eligible:true,winnerCorrect:correctB}
  ]
});
const shared=()=>({
  ranking:[{userId:"firebase:A",points:50},{userId:"firebase:B",points:40}],
  weeklyRanking:[],weeklyHistory:[],medalTable:[],
  matchesByWeek:{"1":[match("a",true,false),match("b",false,true)]},
  weekStartsAt:"2026-11-02T00:00:00.000Z",startedAt:"2026-11-01T00:00:00.000Z"
});
test("30 segundos de caché por liga: aislada entre diferentes grupos",async()=>{
  const db=mockDb();await store(db,"grupo-uno",shared());
  assert.equal((await read(db,"grupo-uno")).ranking[0].points,50);
  assert.equal(await read(db,"grupo-dos"),null);
  now+=31_000;
  assert.equal(await read(db,"grupo-uno"),null);
  now-=31_000;
});
test("El orden de finales simultáneos se personaliza por usuario y no muta la caché",()=>{
  const record=shared();
  const a=present(record,"firebase:A","owner");
  const b=present(record,"firebase:B","member");
  assert.deepEqual(a.matchesByWeek["1"].map(m=>m.id),["a","b"]);
  assert.deepEqual(b.matchesByWeek["1"].map(m=>m.id),["b","a"]);
  assert.deepEqual(record.matchesByWeek["1"].map(m=>m.id),["a","b"]);
  assert.equal(a.canAssignInitialPoints,true);
  assert.equal(b.canAssignInitialPoints,false);
  assert.equal("canAssignInitialPoints" in record,false);
});
test("Una baja de un grupo invalida solamente su ranking",async()=>{
  const db=mockDb();await store(db,"grupo-uno",shared());await store(db,"grupo-dos",shared());
  await invalidate(db,"grupo-uno");
  assert.equal(await read(db,"grupo-uno"),null);
  assert.ok(await read(db,"grupo-dos"));
});
test("Una falla en D1 nunca impide el cálculo normal",async()=>{
  const db={prepare(){throw Error("D1 fuera de servicio");}};
  assert.equal(await read(db,"grupo-uno"),null);
  await assert.doesNotReject(store(db,"grupo-uno",shared()));
  await assert.doesNotReject(invalidate(db,"grupo-uno"));
});
test("No reutilizar respuestas malformadas o antiguas",async()=>{
  const db=mockDb();
  db.entries.set("league-ranking:v1:grupo-uno",{payload:JSON.stringify({ranking:[]}),expires_at:Date.now()/1000+60});
  assert.equal(await read(db,"grupo-uno"),null);
});
test("El acceso sigue requiriendo autenticación y pertenencia antes de consultar caché",()=>{
  const route=source.slice(source.indexOf("const leagueRanking ="),source.indexOf("// Gestión de liga: abandonar"));
  const auth=route.indexOf("verifiedFirebaseUser(request)");
  const membership=route.indexOf("if (!membership) return reply");
  const cache=route.indexOf("readLeagueRankingCache(env.DB,groupId)");
  assert.ok(auth>=0 && membership>auth && cache>membership);
  assert.ok(route.includes('if (request.method === "GET")'));
  assert.ok(route.includes("await invalidateLeagueRankingCache(env.DB,groupId)"));
});
test("Se invalidan cambios de integrantes sin compartir permisos",()=>{
  const join=source.slice(source.indexOf("if (url.pathname === \"/api/prode/groups/join\""),source.indexOf("// Diagnóstico de cierre"));
  const management=source.slice(source.indexOf("// Gestión de liga: abandonar"),source.indexOf("const groupDetail ="));
  assert.match(join,/invalidateLeagueRankingCache\(env.DB,invite.group_id\)/);
  assert.ok((management.match(/invalidateLeagueRankingCache\(env.DB,groupId\)/g)||[]).length>=3);
});
