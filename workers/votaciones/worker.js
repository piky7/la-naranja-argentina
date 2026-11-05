// LNA: Worker independiente de votaciones. Binding D1 requerido: DB.
// Publicar este archivo en el Worker lna-votaciones-api (no en lna-live).
const SITE = "https://lanaranjaargentina.com.ar";
const FIXTURE = SITE + "/voting-fixture.json";
// Verificación de Firebase compartida con Prode; necesaria para permitir votos
// exclusivamente a jugadores con sesión Google (incluso ante llamadas directas).
const PROJECT_ID = "lna-prode";
const ISSUER = "https://securetoken.google.com/" + PROJECT_ID;
const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const decode = (segment) => {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(bytes, c => c.charCodeAt(0));
};
const parseSegment = (segment) => JSON.parse(new TextDecoder().decode(decode(segment)));

async function verifiedFirebaseUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization);
  if (!match || match[1].length > 8192) return null;
  try {
    const parts = match[1].split(".");
    if (parts.length !== 3) return null;
    const head = parseSegment(parts[0]);
    const body = parseSegment(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (head.alg !== "RS256" || typeof head.kid !== "string" || !head.kid) return null;
    if (body.aud !== PROJECT_ID || body.iss !== ISSUER ||
        typeof body.sub !== "string" || !body.sub || body.sub.length > 128 ||
        !Number.isFinite(body.exp) || body.exp <= now ||
        !Number.isFinite(body.iat) || body.iat > now ||
        !Number.isFinite(body.auth_time) || body.auth_time > now) return null;
    const certResponse = await fetch(CERTS_URL);
    if (!certResponse.ok) return null;
    const certs = await certResponse.json();
    const pem = certs[head.kid];
    if (typeof pem !== "string") return null;
    const base64 = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, "");
    const certBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    // X.509 DER: importar la clave pública RSA mediante SubjectPublicKeyInfo.
    // Cloudflare WebCrypto no importa certificados X.509 directamente.
    const spki = extractSpkiFromCertificate(certBytes);
    const key = await crypto.subtle.importKey("spki", spki, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
    if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]), signed)) return null;
    return { uid: body.sub, name: typeof body.name === "string" ? body.name : "" };
  } catch {
    return null;
  }
}

// Lector DER mínimo: obtiene SubjectPublicKeyInfo de un certificado X.509.
function extractSpkiFromCertificate(bytes) {
  const read = (offset) => {
    const tag = bytes[offset++];
    let length = bytes[offset++];
    if (length & 0x80) {
      const n = length & 0x7f;
      if (n < 1 || n > 4) throw Error("DER length");
      length = 0;
      for (let i = 0; i < n; i++) length = length * 256 + bytes[offset++];
    }
    const end = offset + length;
    if (end > bytes.length) throw Error("DER bounds");
    return { tag, start: offset, end, next: end };
  };
  const certificate = read(0);
  const tbs = read(certificate.start);
  let pos = tbs.start;
  let item = read(pos);
  if (item.tag === 0xa0) { pos = item.next; item = read(pos); }
  // serialNumber, signature, issuer, validity, subject
  for (let i = 0; i < 5; i++) { item = read(pos); pos = item.next; }
  const spki = read(pos);
  if (spki.tag !== 0x30) throw Error("Missing SPKI");
  return bytes.slice(pos, spki.next);
}



const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});
const cors = {
  "access-control-allow-origin": SITE,
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "vary": "Origin",
};
const fail = (message, status) => json({ ok: false, error: message }, status, cors);
const visitorPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fixtureGame(id) {
  // Sin calendario oficial disponible, las votaciones quedan cerradas.
  const response = await fetch(FIXTURE, { headers: { accept: "application/json" }, cf: { cacheTtl: 60, cacheEverything: true } });
  if (!response.ok) throw new Error("Fixture no disponible");
  const data = await response.json();
  if (!Array.isArray(data.games) || typeof data.generatedAt !== "string") throw new Error("Fixture inválido");
  // No aceptar un calendario desactualizado más de 14 días.
  const age = Date.now() - Date.parse(data.generatedAt);
  if (!Number.isFinite(age) || age < -300000 || age > 14 * 24 * 3600000) throw new Error("Fixture desactualizado");
  return data.games.find(g => g.id === id) || null;
}



// Primer momento en que LNA detecta y confirma el final en el fixture.
// NO es la hora exacta de la chicharra: se conserva como orden de
// finalización observado para desempatar partidos con igual inicio.
async function ensureFinishObservations(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS partidos_final_detectado (partido_id TEXT PRIMARY KEY, detectado_en TEXT NOT NULL)").run();
}
async function captureFinishObservations(db, games) {
  await ensureFinishObservations(db);
  const now = new Date().toISOString();
  const confirmed = (games || []).filter(game =>
    typeof game?.id === "string" && game.id.length <= 120 &&
    game.finished === true && Number.isFinite(game.homeScore) &&
    Number.isFinite(game.awayScore) && game.homeScore !== game.awayScore);
  for (let i=0; i<confirmed.length; i+=50) {
    const batch = confirmed.slice(i,i+50).map(game =>
      db.prepare("INSERT OR IGNORE INTO partidos_final_detectado(partido_id,detectado_en) VALUES (?,?)").bind(game.id,now));
    if(batch.length) await db.batch(batch);
  }
}
// Una observación histórica incorporada horas después del partido no prueba
// que dos encuentros hayan terminado juntos. Sólo se acepta como desempate
// si el final fue detectado dentro de las 6 horas posteriores al inicio.
// Así evitamos que la primera sincronización masiva altere rachas anteriores.
function timelyFinishObservation(game, observedAt) {
  const start = Date.parse(game?.startsAt || "");
  const end = Date.parse(observedAt || "");
  return Number.isFinite(start) && Number.isFinite(end) &&
    end >= start && end - start <= 6 * 60 * 60 * 1000 ? observedAt : null;
}
async function getFinishObservations(db) {
  await ensureFinishObservations(db);
  const rows = await db.prepare("SELECT partido_id, detectado_en FROM partidos_final_detectado").all();
  return new Map((rows.results || []).map(row => [row.partido_id,row.detectado_en]));
}

// Orden único para Mi Carrera y Prode: inicio ascendente y, si empatan,
// primer final observado ascendente. Sin registro comparable, se usa ID.
function comparePredictionGames(a,b) {
  const kickoff = Date.parse(a.startsAt)-Date.parse(b.startsAt);
  if (kickoff) return kickoff;
  const endA = Date.parse(a.finishedObservedAt || "");
  const endB = Date.parse(b.finishedObservedAt || "");
  if (Number.isFinite(endA) && Number.isFinite(endB) && endA !== endB) return endA-endB;
  return String(a.id).localeCompare(String(b.id));
}

// Archivo permanente de partidos en D1: permite recalcular carreras aunque roten los fixtures.
// Se conserva el resultado confirmado; una versión futura sin resultado no puede borrarlo.
async function archiveFixture(db, fixture) {
  await db.prepare("CREATE TABLE IF NOT EXISTS carrera_partidos (partido_id TEXT PRIMARY KEY, datos TEXT NOT NULL, confirmado INTEGER NOT NULL DEFAULT 0)").run();
  const saved = await db.prepare("SELECT partido_id, datos, confirmado FROM carrera_partidos").all();
  const existing = new Map((saved.results || []).map(row => [row.partido_id, row]));
  const updates = [];
  for (const game of fixture.games || []) {
    if (typeof game?.id !== "string" || game.id.length > 120) continue;
    const confirmed = Number(game.finished === true && Number.isFinite(game.homeScore) && Number.isFinite(game.awayScore) && game.homeScore !== game.awayScore);
    const previous = existing.get(game.id);
    if (previous && (Number(previous.confirmado) > confirmed || previous.datos === JSON.stringify(game))) continue;
    updates.push(db.prepare("INSERT INTO carrera_partidos(partido_id,datos,confirmado) VALUES (?,?,?) ON CONFLICT(partido_id) DO UPDATE SET datos=excluded.datos, confirmado=excluded.confirmado WHERE excluded.confirmado>=carrera_partidos.confirmado")
      .bind(game.id, JSON.stringify(game), confirmed));
  }
  for (let i = 0; i < updates.length; i += 50) await db.batch(updates.slice(i, i + 50));
  await captureFinishObservations(db,fixture.games);
}

// Lectura sin escrituras: el cron archiva y las consultas solo combinan datos.
async function loadCareerFixture(db, fixture) {
  const saved = await db.prepare("SELECT datos FROM carrera_partidos").all();
  const byId = new Map();
  for (const row of saved.results || []) {
    try { const game = JSON.parse(row.datos); if (game?.id) byId.set(game.id, game); } catch {}
  }
  for (const game of fixture.games || []) {
    if (!game?.id) continue;
    const previous = byId.get(game.id);
    const previousConfirmed = previous?.finished === true && Number.isFinite(previous.homeScore) && Number.isFinite(previous.awayScore) && previous.homeScore !== previous.awayScore;
    const currentConfirmed = game.finished === true && Number.isFinite(game.homeScore) && Number.isFinite(game.awayScore) && game.homeScore !== game.awayScore;
    if (!previousConfirmed || currentConfirmed) byId.set(game.id, game);
  }
  return { ...fixture, games: [...byId.values()] };
}

async function calculateRewards(db, fixture, visitorId) {
  const votes = await db.prepare("SELECT partido_id, equipo_votado FROM votos WHERE visitante_id=?").bind(visitorId).all();
  const voteMap = new Map((votes.results || []).map(v => [v.partido_id, v.equipo_votado]));
  await db.prepare("CREATE TABLE IF NOT EXISTS votos_mvp (partido_id TEXT NOT NULL, visitante_id TEXT NOT NULL, jugador_id TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(partido_id, visitante_id))").run();
  const mvpVotes = await db.prepare("SELECT partido_id,jugador_id FROM votos_mvp WHERE visitante_id=?").bind(visitorId).all();
  const mvpMap = new Map((mvpVotes.results || []).map(v => [v.partido_id, v.jugador_id]));
  // Las reglas se aplican retroactivamente desde el primer partido con votos registrados.
  const firstVote = await db.prepare("SELECT MIN(partido_id) AS first_id FROM votos").first();
  const firstMvp = await db.prepare("SELECT MIN(partido_id) AS first_id FROM votos_mvp").first();
  const firstDate = [firstVote?.first_id, firstMvp?.first_id].filter(Boolean).sort()[0]?.slice(0,10) || "9999-12-31";
  const finishTimes = await getFinishObservations(db);
  const games = [...fixture.games].filter(g => g?.id && g.id.slice(0,10) >= firstDate && Number.isFinite(Date.parse(g.startsAt)))
    .sort((a,b) => {
      const aFinish = timelyFinishObservation(a,finishTimes.get(a.id));
      const bFinish = timelyFinishObservation(b,finishTimes.get(b.id));
      const base = comparePredictionGames(
        {...a,finishedObservedAt:aFinish},
        {...b,finishedObservedAt:bFinish}
      );
      // Si iniciaron juntos y ambos finales se detectaron en la misma
      // consulta, procesar el pronóstico errado antes que el acertado.
      // La decisión es individual: el orden puede variar por usuario.
      const sameStart = Date.parse(a.startsAt) === Date.parse(b.startsAt);
      const sameDetection = aFinish && bFinish && aFinish === bFinish;
      const confirmed = game => game.finished === true &&
        Number.isFinite(game.homeScore) && Number.isFinite(game.awayScore) &&
        game.homeScore !== game.awayScore;
      if (sameStart && sameDetection && confirmed(a) && confirmed(b)) {
        const acertado = game => {
          const vote = voteMap.get(game.id);
          return Boolean(vote) && vote === (game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam);
        };
        const correctA = acertado(a), correctB = acertado(b);
        if (correctA !== correctB) return correctA ? 1 : -1;
      }
      return base;
    });
  // Transición: el histórico anterior conserva exactamente sus puntos y bonos.
  // La nueva racha es única, continua entre categorías y reinicia al completar 5.
  const UNIFIED_STREAK_START = Date.parse("2026-11-05T15:00:00-03:00");
  let unifiedStarted = false, globalProgress = 0;
  let points = 0, wins = 0, losses = 0, missed = 0, legacyMvps = 0, mvpHits = 0, bestStreak = 0;
  const categories = [{name:"Liga de Desarrollo",goal:50},{name:"Liga Federal",goal:100},{name:"Liga Argentina",goal:150},{name:"Liga Nacional",goal:200},{name:"Estrella LNB",goal:300},{name:"Leyenda LNA",goal:null}];
  // Cada categoría tiene su propio puntaje desde cero; el histórico nunca se reinicia.
  let seasonPoints=0, categoryIndex=0, cups=0, descents=0, bestCategory=0;
  const cupCounts=Array(categories.length).fill(0);
  const records=Array(categories.length).fill(0);
  const gamesPlayed=Array(categories.length).fill(0);
  let currentStay=0, categoryWinStreak=0;
  const moves=[];
  const updateCareer=(g,wasWrong,wasCorrect=false,hasVote=false)=>{
    if(hasVote) gamesPlayed[categoryIndex]++;
    categoryWinStreak=wasCorrect ? categoryWinStreak+1 : 0;
    const before=categoryIndex;
    const directLimit=categoryIndex===5?2:categoryIndex===4?3:categoryIndex===3?4:categoryIndex===2?5:Infinity;
    if(wasWrong && losses===directLimit && categoryIndex>0){
      categoryIndex--;
      seasonPoints=0;
      losses=0; // Nueva categoría: la racha de descenso comienza de cero.
    }else if(categoryIndex<categories.length-1 && (seasonPoints>=categories[categoryIndex].goal || (categoryIndex===2 && categoryWinStreak>=3) || (categoryIndex===3 && categoryWinStreak>=4) || (categoryIndex===4 && categoryWinStreak>=5))){
      categoryIndex++;
      seasonPoints=0;
    }
    if(categoryIndex!==before){
      currentStay=0;
      if (!unifiedStarted) categoryWinStreak=0;
      if(categoryIndex>before){
        for(let i=before;i<categoryIndex;i++){cups++;cupCounts[i]++;moves.push({type:"promotion",category:categories[i].name,gameId:g.id});}
      }else{
        descents+=before-categoryIndex;
        for(let i=before-1;i>=categoryIndex;i--)moves.push({type:"descent",category:categories[i].name,gameId:g.id});
      }
    }
    // La permanencia comienza en el partido siguiente al ascenso.
    if(categoryIndex===before) currentStay++;
    if(categoryIndex===5 && currentStay>0 && currentStay%10===0){
      cups++;
      cupCounts[5]++;
      moves.push({type:"legend-cup",category:"Leyenda LNA",gameId:g.id});
    }
    records[categoryIndex]=Math.max(records[categoryIndex],currentStay);
    bestCategory=Math.max(bestCategory,categoryIndex);
  };
  const perGame = new Map();
  const now = Date.now();
  for (const g of games) {
    const vote = voteMap.get(g.id);
    const mvpChoice = mvpMap.get(g.id);
    // Los puntos se acreditan solo al finalizar el partido.
    // No evaluar rachas ni ausencias antes del inicio del partido.
    if (Date.parse(g.startsAt) > now) continue;
    const completed = g.finished === true && Number.isFinite(g.homeScore) && Number.isFinite(g.awayScore);
    if (!completed) {
      // Un partido sin resultado confirmado no puede alterar rachas todavía.
      continue;
    }
    if (g.homeScore === g.awayScore) { continue; }
    const unifiedGame = Date.parse(g.startsAt) >= UNIFIED_STREAK_START;
    if (unifiedGame && !unifiedStarted) {
      globalProgress = wins % 5;
      categoryWinStreak = globalProgress;
      unifiedStarted = true;
    }
    const mvpEarned = mvpChoice && Array.isArray(g.mvpWinners) && g.mvpWinners.includes(mvpChoice) ? 20 : 0;
    if (mvpEarned) { points += 20; seasonPoints += 20; mvpHits++; }
    if (!vote) {
      // No votar corta los aciertos, pero conserva la racha negativa sin incrementarla.
      // Solo un acierto o un descenso reinicia los errores consecutivos.
      wins=0; if (unifiedGame) globalProgress=0; missed++;
      if (mvpEarned) perGame.set(g.id,{earned:20,mvpEarned:20,medal:null,streak:0});
      updateCareer(g,false);
      continue;
    }
    missed=0;
    const winner = g.homeScore > g.awayScore ? g.homeTeam : g.awayTeam;
    if (vote === winner) {
      wins++; losses=0; points+=15; seasonPoints+=15;
      if (unifiedGame) globalProgress++;
      bestStreak=Math.max(bestStreak,wins);
      const earnedBonus = unifiedGame ? globalProgress===5 : wins===5;
      if (earnedBonus) {points+=45;seasonPoints+=45;}
      if (wins % 10 === 0) legacyMvps++;
      perGame.set(g.id,{earned:(earnedBonus ? 60 : 15)+mvpEarned,mvpEarned,medal:wins % 10 === 0 ? "gold" : earnedBonus ? "silver" : wins === 3 ? "bronze" : null, streak:unifiedGame ? (earnedBonus ? 0 : globalProgress) : wins});
      updateCareer(g,false,true,true);
      if (unifiedGame && earnedBonus) { globalProgress=0; categoryWinStreak=0; }
    } else {
      wins=0; if (unifiedGame) globalProgress=0; losses++; points+=5; seasonPoints+=5;
      perGame.set(g.id,{earned:5+mvpEarned,mvpEarned,medal:null,streak:losses});
      updateCareer(g,true,false,true);
    }
  }
  // Los partidos ausentes del calendario no se puntúan hasta recuperar su resultado oficial.
  return {points:Math.max(0,points),seasonPoints,mvps:legacyMvps+Math.floor(mvpHits/5),mvpHits,mvpProgress:mvpHits%5,bestStreak,winStreak:unifiedStarted ? globalProgress : wins % 5,lossStreak:losses,missedStreak:missed,career:{categoryIndex,bestCategory,cups,descents,cupCounts,records,gamesPlayed,currentStay,categoryWinStreak,goal:categories[categoryIndex].goal,moves:moves.slice(-20).reverse()},perGame:Object.fromEntries(perGame)};
}
async function getRewards(db, visitorId) {
  const response=await fetch(FIXTURE,{headers:{accept:"application/json"},cf:{cacheTtl:60,cacheEverything:true}});
  if(!response.ok) throw new Error("Fixture no disponible");
  const fixture=await response.json();
  if(!Array.isArray(fixture.games)) throw new Error("Fixture inválido");
  return calculateRewards(db,await loadCareerFixture(db,fixture),visitorId);
}

async function voteCounts(db, id) {
  const rows = await db.prepare("SELECT equipo_votado, COUNT(*) AS total FROM votos WHERE partido_id = ? GROUP BY equipo_votado")
    .bind(id).all();
  return Object.fromEntries((rows.results || []).map(r => [r.equipo_votado, Number(r.total)]));
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const response=await fetch(FIXTURE,{headers:{accept:"application/json"},cf:{cacheTtl:60,cacheEverything:true}});
      if(!response.ok) throw new Error("No se pudo archivar el fixture");
      const fixture=await response.json();
      if(!Array.isArray(fixture.games)) throw new Error("Fixture inválido");
      await archiveFixture(env.DB,fixture);
    })());
  },
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, servicio: "LNA Votaciones", database: "conectada" }, 200, cors);
      } catch { return fail("Base de datos no disponible", 503); }
    }
    // Historial de resultados para clasificaciones de Prode: solo lectura.
    // Incluye partidos sin voto para cortar correctamente las rachas por liga.
    if (url.pathname === "/api/prode-results" && request.method === "GET") {
      const visitorId = url.searchParams.get("visitanteId");
      if (!visitorId || !visitorPattern.test(visitorId)) return fail("Identificador inválido", 400);
      if (!env.DB) return fail("Base de datos no disponible", 503);
      try {
        const [votes, mvpVotes, fixtureResponse] = await Promise.all([
          env.DB.prepare("SELECT partido_id, equipo_votado FROM votos WHERE visitante_id=?").bind(visitorId).all(),
          env.DB.prepare("SELECT partido_id, jugador_id FROM votos_mvp WHERE visitante_id=?").bind(visitorId).all(),
          fetch(FIXTURE, { headers: { accept: "application/json" }, cf: { cacheTtl: 60, cacheEverything: true } }),
        ]);
        if (!fixtureResponse.ok) throw Error("Fixture no disponible");
        const fixture = await loadCareerFixture(env.DB, await fixtureResponse.json());
        const finalObservations = await getFinishObservations(env.DB);
        const byVote = new Map((votes.results || []).map(v => [v.partido_id, v.equipo_votado]));
        const byMvp = new Map((mvpVotes.results || []).map(v => [v.partido_id, v.jugador_id]));
        const games = fixture.games.filter(g => g?.id && Number.isFinite(Date.parse(g.startsAt)))
          .sort((a,b) => Date.parse(a.startsAt)-Date.parse(b.startsAt) || a.id.localeCompare(b.id))
          .map(g => {
            const finished = g.finished === true && Number.isFinite(g.homeScore) && Number.isFinite(g.awayScore) && g.homeScore !== g.awayScore;
            const winner = finished ? (g.homeScore > g.awayScore ? g.homeTeam : g.awayTeam) : null;
            const vote = byVote.get(g.id);
            const mvp = byMvp.get(g.id);
            return { id: g.id, startsAt: g.startsAt, finished, finishedObservedAt: finished ? timelyFinishObservation(g,finalObservations.get(g.id)) : null, voted: Boolean(vote),
              correct: finished && Boolean(vote) && vote === winner,
              mvpCorrect: finished && Boolean(mvp) && Array.isArray(g.mvpWinners) && g.mvpWinners.includes(mvp),
              mvpVoted: Boolean(mvp), mvpResolved: finished && Array.isArray(g.mvpWinners),
              // Solo los resultados terminados exponen selecciones para compararlas en una liga.
              homeTeam: finished ? g.homeTeam : null, awayTeam: finished ? g.awayTeam : null,
              homeScore: finished ? g.homeScore : null, awayScore: finished ? g.awayScore : null,
              winner: finished ? winner : null,
              selectedWinner: finished ? (vote || null) : null, selectedMvp: finished ? (mvp || null) : null,
              mvpWinners: finished && Array.isArray(g.mvpWinners) ? g.mvpWinners : [] };
          });
        return json({ ok: true, games }, 200, cors);
      } catch (error) {
        console.error("LNA prode-results:", error);
        return fail("No se pudo consultar el historial", 503);
      }
    }
    if (url.pathname === "/api/mis-pronosticos" && request.method === "GET") {
      const visitorId = url.searchParams.get("visitanteId");
      if (!visitorId || !visitorPattern.test(visitorId)) return fail("Identificador inválido", 400);
      if (!env.DB) return fail("Base de datos no configurada", 503);
      try {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS votos_mvp (partido_id TEXT NOT NULL, visitante_id TEXT NOT NULL, jugador_id TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(partido_id, visitante_id))").run();
        const [votes, mvpVotes, fixtureResponse] = await Promise.all([
          env.DB.prepare("SELECT partido_id, equipo_votado FROM votos WHERE visitante_id=? ORDER BY partido_id DESC LIMIT 200").bind(visitorId).all(),
          env.DB.prepare("SELECT partido_id,jugador_id FROM votos_mvp WHERE visitante_id=? ORDER BY partido_id DESC LIMIT 200").bind(visitorId).all(),
          fetch(FIXTURE, { headers: { accept: "application/json" }, cf: { cacheTtl: 60, cacheEverything: true } }),
        ]);
        if (!fixtureResponse.ok) throw new Error("Fixture no disponible");
        const fixture = await fixtureResponse.json();
        if (!Array.isArray(fixture.games)) throw new Error("Fixture inválido");
        const archivedFixture = await loadCareerFixture(env.DB, fixture);
        const byId = new Map(archivedFixture.games.map(game => [game.id, game]));
        const mvpById = new Map((mvpVotes.results || []).map(row => [row.partido_id,row.jugador_id]));
        const predictions = (votes.results || []).map(row => {
          const game = byId.get(row.partido_id);
          const homeTeam = game?.homeTeam || null;
          const awayTeam = game?.awayTeam || null;
          const homeScore = game?.homeScore;
          const awayScore = game?.awayScore;
          const confirmed = game?.finished === true && Number.isFinite(homeScore) && Number.isFinite(awayScore) && homeScore !== awayScore;
          const winner = confirmed ? (homeScore > awayScore ? homeTeam : awayTeam) : null;
          return {
            partidoId: row.partido_id,
            startsAt: game?.startsAt || null,
            selected: row.equipo_votado,
            mvpSelected: mvpById.get(row.partido_id) || null,
            mvpStatus: !mvpById.has(row.partido_id) ? "none" : !Array.isArray(game?.mvpWinners) ? "pending" : game.mvpWinners.includes(mvpById.get(row.partido_id)) ? "correct" : "incorrect",
            homeTeam, awayTeam,
            homeScore: confirmed ? homeScore : null,
            awayScore: confirmed ? awayScore : null,
            status: !winner ? "pending" : winner === row.equipo_votado ? "correct" : "incorrect",
            open: Boolean(game && !game.finished && Number.isFinite(Date.parse(game.startsAt)) && Date.now() < Date.parse(game.startsAt)),
          };
        });
        // Usar la MISMA secuencia individual que el cálculo de rachas:
        // hora de inicio, final observado válido y desempate por acierto.
        const finishTimes = await getFinishObservations(env.DB);
        const sequence = [...predictions].sort((a,b) => {
          const startA = Date.parse(a.startsAt || "");
          const startB = Date.parse(b.startsAt || "");
          if (Number.isFinite(startA) && Number.isFinite(startB) && startA !== startB) return startA-startB;
          const gameA = byId.get(a.partidoId);
          const gameB = byId.get(b.partidoId);
          const endA = timelyFinishObservation(gameA,finishTimes.get(a.partidoId));
          const endB = timelyFinishObservation(gameB,finishTimes.get(b.partidoId));
          const timeA = Date.parse(endA || "");
          const timeB = Date.parse(endB || "");
          if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) return timeA-timeB;
          if (endA && endB && endA===endB && a.status!=="pending" && b.status!=="pending" && a.status!==b.status)
            return a.status==="correct" ? 1 : -1;
          return String(a.partidoId).localeCompare(String(b.partidoId));
        });
        sequence.forEach((prediction,index) => { prediction.streakOrder = index; });
        predictions.sort((a,b) => b.streakOrder-a.streakOrder);
        const rewards = await calculateRewards(env.DB, archivedFixture, visitorId);
        for (const p of predictions) {
          const detail = rewards.perGame[p.partidoId];
          p.earned = detail?.earned ?? (p.status === "pending" ? null : 0);
          p.medal = detail?.medal ?? null;
          p.mvpEarned = detail?.mvpEarned ?? (p.mvpStatus === "pending" ? null : 0);
        }
        return json({ ok: true, predictions }, 200, cors);
      } catch (error) {
        console.error("LNA mis pronósticos:", error);
        return fail("No se pudo consultar el historial", 503);
      }
    }
    if (url.pathname === "/api/puntos" && request.method === "GET") {
      const visitorId = url.searchParams.get("visitanteId");
      if (!visitorId || !visitorPattern.test(visitorId)) return fail("Identificador inválido", 400);
      if (!env.DB) return fail("Base de datos no configurada", 503);
      try {
        const rewards = await getRewards(env.DB, visitorId);
        const {perGame, ...summary} = rewards;
        return json({ ok: true, ...summary }, 200, cors);
      } catch (error) {
        console.error("LNA puntos:", error);
        return fail("No se pudieron consultar los puntos", 503);
      }
    }
    if (url.pathname === "/api/mvp") {
      if (!["GET", "POST"].includes(request.method)) return fail("Método no permitido", 405);
      if (request.method === "POST" && request.headers.get("origin") !== SITE) return fail("Origen no permitido", 403);
    if (request.method === "POST" && !(await verifiedFirebaseUser(request))) return fail("Iniciá sesión con Google para votar", 401);
      if (request.method === "POST" && !(await verifiedFirebaseUser(request))) return fail("Iniciá sesión con Google para votar", 401);
      if (!env.DB) return fail("Base de datos no configurada", 503);
      let id, visitorId, playerId;
      if (request.method === "GET") {
        id = url.searchParams.get("partidoId");
        visitorId = url.searchParams.get("visitanteId");
      } else {
        if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return fail("Se requiere JSON", 415);
        const body = await request.text();
        if (body.length > 2048) return fail("Solicitud demasiado grande", 413);
        let payload;
        try { payload = JSON.parse(body); } catch { return fail("JSON inválido", 400); }
        id = payload.partidoId; visitorId = payload.visitanteId; playerId = payload.jugadorId;
      }
      if (typeof id !== "string" || id.length > 120 || !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(id) || !visitorPattern.test(visitorId)) return fail("Identificador inválido", 400);
      try {
        const game = await fixtureGame(id);
        if (!game) return fail("Partido no disponible", 404);
        const start = Date.parse(game.startsAt);
        if (!Number.isFinite(start)) return fail("Horario sin confirmar", 409);
        const open = !game.finished && Date.now() < start;
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS votos_mvp (partido_id TEXT NOT NULL, visitante_id TEXT NOT NULL, jugador_id TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(partido_id, visitante_id))").run();
        if (request.method === "POST") {
          if (!open) return fail("Votación cerrada", 409);
          if (typeof playerId !== "string" || playerId.length > 120 || !Array.isArray(game.eligiblePlayers) || !game.eligiblePlayers.includes(playerId)) return fail("Jugador no habilitado para este partido", 400);
          await env.DB.prepare("INSERT INTO votos_mvp(partido_id,visitante_id,jugador_id) VALUES (?,?,?) ON CONFLICT(partido_id,visitante_id) DO UPDATE SET jugador_id=excluded.jugador_id").bind(id,visitorId,playerId).run();
        }
        const existing = await env.DB.prepare("SELECT jugador_id FROM votos_mvp WHERE partido_id=? AND visitante_id=?").bind(id,visitorId).first();
        const counts = await env.DB.prepare("SELECT jugador_id AS playerId, COUNT(*) AS votes FROM votos_mvp WHERE partido_id=? GROUP BY jugador_id ORDER BY votes DESC, jugador_id ASC").bind(id).all();
        return json({ok:true,open,voted:!!existing,selected:existing?.jugador_id || null,ranking:counts.results || []},200,cors);
      } catch (error) {
        console.error("LNA MVP:",error);
        return fail("No se pudo procesar el MVP",503);
      }
    }
    if (url.pathname !== "/api/votos") return fail("Ruta inexistente", 404);
    if (!["GET", "POST"].includes(request.method)) return fail("Método no permitido", 405);
    if (request.method === "POST" && request.headers.get("origin") !== SITE) return fail("Origen no permitido", 403);
    if (!env.DB) return fail("Base de datos no configurada", 503);

    let id, visitorId, team;
    if (request.method === "GET") {
      id = url.searchParams.get("partidoId");
      visitorId = url.searchParams.get("visitanteId");
    } else {
      if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return fail("Se requiere JSON", 415);
      const body = await request.text();
      if (body.length > 2048) return fail("Solicitud demasiado grande", 413);
      let payload;
      try { payload = JSON.parse(body); } catch { return fail("JSON inválido", 400); }
      id = payload.partidoId;
      visitorId = payload.visitanteId;
      team = payload.equipoVotado;
    }
    if (typeof id !== "string" || id.length > 120 || !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(id) ||
        typeof visitorId !== "string" || !visitorPattern.test(visitorId)) return fail("Identificador inválido", 400);

    try {
      const game = await fixtureGame(id);
      if (!game) return fail("Partido no disponible", 404);
      const start = Date.parse(game.startsAt);
      if (!Number.isFinite(start)) return fail("Horario sin confirmar", 409);
      const open = !game.finished && Date.now() < start;

      if (request.method === "POST") {
        if (!open) return fail("Votación cerrada", 409);
        if (team !== game.homeTeam && team !== game.awayTeam) return fail("Equipo inválido", 400);
        const previousVote = await env.DB.prepare("SELECT equipo_votado FROM votos WHERE partido_id=? AND visitante_id=?").bind(id,visitorId).first();
        if (previousVote?.equipo_votado === team) return fail("Ya elegiste ese equipo", 409);
        // Protección adicional básica por IP: máximo 30 votos nuevos por día
        // en partidos distintos; no se almacena la dirección IP.
        const ip = request.headers.get("CF-Connecting-IP") || "";
        const day = new Date().toISOString().slice(0, 10);
        if (ip && !previousVote) {
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(day + ":" + ip));
          const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
          await env.DB.prepare("CREATE TABLE IF NOT EXISTS voto_limites (hash TEXT PRIMARY KEY, cantidad INTEGER NOT NULL)").run();
          const limit = await env.DB.prepare("INSERT INTO voto_limites(hash,cantidad) VALUES (?,1) ON CONFLICT(hash) DO UPDATE SET cantidad=cantidad+1 WHERE cantidad<30 RETURNING cantidad").bind(hash).first();
          if (!limit) return fail("Demasiadas solicitudes", 429);
        }
        // Un único pronóstico por usuario y partido; se permite reemplazarlo antes del inicio.
        if (previousVote) {
          await env.DB.prepare("UPDATE votos SET equipo_votado=? WHERE partido_id=? AND visitante_id=?").bind(team,id,visitorId).run();
        } else {
          await env.DB.prepare("INSERT INTO votos (partido_id,equipo_votado,visitante_id) VALUES (?,?,?)").bind(id,team,visitorId).run();
        }
      }

      const existing = await env.DB.prepare("SELECT equipo_votado FROM votos WHERE partido_id=? AND visitante_id=?").bind(id, visitorId).first();
      // Los puntos se calculan desde votos realmente guardados en D1.
      // No se confía en puntos enviados por el navegador ni se duplica el saldo.
      const rewards = await getRewards(env.DB, visitorId);
      const points = rewards.points;
      if (!existing) return json({ ok: true, voted: false, open, points, mvps: rewards.mvps }, 200, cors);
      const counts = await voteCounts(env.DB, id);
      return json({
        ok: true, voted: true, open, points, mvps: rewards.mvps, selected: existing.equipo_votado,
        home: { id: game.homeTeam, votes: counts[game.homeTeam] || 0 },
        away: { id: game.awayTeam, votes: counts[game.awayTeam] || 0 },
      }, 200, cors);
    } catch (error) {
      console.error("LNA votos:", error);
      return fail("No se pudo procesar la votación", 503);
    }
  },
};
