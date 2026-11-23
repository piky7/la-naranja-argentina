import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Ejecuta los helpers reales, sin duplicar la lógica de caché del Worker.
const source = readFileSync(new URL("../workers/prode/worker.js", import.meta.url), "utf8");
const start = source.indexOf("const GLOBAL_RANKING_CACHE_SECONDS =");
const stop = source.indexOf("export default {", start);
assert.ok(start >= 0 && stop > start, "No se encontró la implementación real del caché");
let current = Date.parse("2026-11-06T12:00:00Z");
class Clock extends Date { static now() { return current; } }
const { read, store } = new Function("Date", source.slice(start, stop) +
  "\nreturn {read:getCachedGlobalRankingSources,store:storeGlobalRankingSources};")(Clock);

function createDb() {
  const entries = new Map();
  const batches = [];
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async all() {
              const prefix = params[0].slice(0, -1);
              const min = params[1];
              return { results: [...entries].filter(([key, value]) =>
                key.startsWith(prefix) && value.expires_at > min)
                .map(([cache_key, value]) => ({ cache_key, payload: value.payload })) };
            },
            async run() {
              const [key, payload, expires_at] = params;
              entries.set(key, { payload, expires_at });
            }
          };
        }
      };
    },
    async batch(operations) {
      batches.push(operations.length);
      for (const op of operations) await op.run();
    }
  };
  return { db, entries, batches };
}

test("Guarda puntos oficiales y reutiliza únicamente el tipo de consulta correcto", async () => {
  const { db } = createDb();
  await store(db, [{key:"historic:firebase:a",value:130},{key:"weekly:firebase:a",value:[{id:"partido"}]}]);
  const historical = await read(db,"historic");
  assert.equal(historical.get("historic:firebase:a"),130);
  assert.equal(historical.has("weekly:firebase:a"),false);
  assert.equal((await read(db,"weekly")).get("weekly:firebase:a")[0].id,"partido");
});

test("Las entradas vencen y dejan de usarse después de 60 segundos", async () => {
  const { db } = createDb();
  await store(db,[{key:"historic:firebase:a",value:15}]);
  assert.equal((await read(db,"historic")).get("historic:firebase:a"),15);
  current += 61_000;
  assert.equal((await read(db,"historic")).has("historic:firebase:a"),false);
  current -= 61_000;
});

test("Divide escrituras grandes en lotes pequeños", async () => {
  const { db, batches } = createDb();
  await store(db,Array.from({length:61},(_,i)=>({key:"historic:firebase:"+i,value:i})));
  assert.deepEqual(batches,[25,25,11]);
});

test("Si D1 no responde, se puede recalcular sin interrumpir el ranking", async () => {
  const failed = { prepare() { throw Error("D1 desconectado"); } };
  assert.equal((await read(failed,"historic")).size,0);
  await assert.doesNotReject(store(failed,[{key:"historic:firebase:a",value:4}]));
});

test("No se guardan nombres de usuario ni tokens en las claves", () => {
  const code = source.slice(start,stop);
  assert.match(code,/GLOBAL_RANKING_CACHE_SECONDS = 60/);
  assert.doesNotMatch(code,/getIdToken|Authorization|visitor_id/);
});
