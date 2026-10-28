// LNA: Worker independiente de votaciones. Binding D1 requerido: DB.
// Publicar este archivo en el Worker lna-votaciones-api (no en lna-live).
const SITE = "https://lanaranjaargentina.com.ar";
const FIXTURE = SITE + "/voting-fixture.json";
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


async function calculateRewards(db, fixture, visitorId) {
  const votes = await db.prepare("SELECT partido_id, equipo_votado FROM votos WHERE visitante_id=?").bind(visitorId).all();
  const voteMap = new Map((votes.results || []).map(v => [v.partido_id, v.equipo_votado]));
  // Las reglas se aplican retroactivamente desde el primer partido con votos registrados.
  const firstVote = await db.prepare("SELECT MIN(partido_id) AS first_id FROM votos").first();
  const firstDate = firstVote?.first_id?.slice(0, 10) || "9999-12-31";
  const games = [...fixture.games].filter(g => g?.id && g.id.slice(0,10) >= firstDate && Number.isFinite(Date.parse(g.startsAt)))
    .sort((a,b) => Date.parse(a.startsAt)-Date.parse(b.startsAt) || a.id.localeCompare(b.id));
  let points = 0, wins = 0, losses = 0, missed = 0, mvps = 0, bestStreak = 0;
  const perGame = new Map();
  const now = Date.now();
  for (const g of games) {
    const vote = voteMap.get(g.id);
    // Los puntos se acreditan solo al finalizar el partido.
    // No evaluar rachas ni ausencias antes del inicio del partido.
    if (Date.parse(g.startsAt) > now) continue;
    const completed = g.finished === true && Number.isFinite(g.homeScore) && Number.isFinite(g.awayScore);
    if (!completed) {
      // Un partido sin resultado confirmado no puede alterar rachas todavía.
      wins=0; losses=0; missed=0;
      continue;
    }
    if (g.homeScore === g.awayScore) { wins=0; losses=0; missed=0; continue; }
    if (!vote) {
      wins=0; losses=0; missed++;
      continue;
    }
    missed=0;
    const winner = g.homeScore > g.awayScore ? g.homeTeam : g.awayTeam;
    if (vote === winner) {
      wins++; losses=0; points+=15;
      bestStreak=Math.max(bestStreak,wins);
      if (wins === 3) points+=15;
      if (wins === 5) points+=30;
      if (wins % 10 === 0) mvps++;
      perGame.set(g.id,{earned:wins === 3 ? 30 : wins === 5 ? 45 : 15,medal:wins % 10 === 0 ? "gold" : wins === 5 ? "silver" : wins === 3 ? "bronze" : null, streak:wins});
    } else {
      wins=0; losses++; points+=5;
      if (losses % 3 === 0) points-=5;
      perGame.set(g.id,{earned:losses % 3 === 0 ? 0 : 5,medal:null,streak:losses});
    }
  }
  // Los partidos ausentes del calendario no se puntúan hasta recuperar su resultado oficial.
  return {points:Math.max(0,points),mvps,bestStreak,winStreak:wins,lossStreak:losses,missedStreak:missed,perGame:Object.fromEntries(perGame)};
}
async function getRewards(db, visitorId) {
  const response=await fetch(FIXTURE,{headers:{accept:"application/json"},cf:{cacheTtl:60,cacheEverything:true}});
  if(!response.ok) throw new Error("Fixture no disponible");
  const fixture=await response.json();
  if(!Array.isArray(fixture.games)) throw new Error("Fixture inválido");
  return calculateRewards(db,fixture,visitorId);
}

async function voteCounts(db, id) {
  const rows = await db.prepare("SELECT equipo_votado, COUNT(*) AS total FROM votos WHERE partido_id = ? GROUP BY equipo_votado")
    .bind(id).all();
  return Object.fromEntries((rows.results || []).map(r => [r.equipo_votado, Number(r.total)]));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, servicio: "LNA Votaciones", database: "conectada" }, 200, cors);
      } catch { return fail("Base de datos no disponible", 503); }
    }
    if (url.pathname === "/api/mis-pronosticos" && request.method === "GET") {
      const visitorId = url.searchParams.get("visitanteId");
      if (!visitorId || !visitorPattern.test(visitorId)) return fail("Identificador inválido", 400);
      if (!env.DB) return fail("Base de datos no configurada", 503);
      try {
        const [votes, fixtureResponse] = await Promise.all([
          env.DB.prepare("SELECT partido_id, equipo_votado FROM votos WHERE visitante_id=? ORDER BY partido_id DESC LIMIT 200").bind(visitorId).all(),
          fetch(FIXTURE, { headers: { accept: "application/json" }, cf: { cacheTtl: 60, cacheEverything: true } }),
        ]);
        if (!fixtureResponse.ok) throw new Error("Fixture no disponible");
        const fixture = await fixtureResponse.json();
        if (!Array.isArray(fixture.games)) throw new Error("Fixture inválido");
        const byId = new Map(fixture.games.map(game => [game.id, game]));
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
            selected: row.equipo_votado,
            homeTeam, awayTeam,
            homeScore: confirmed ? homeScore : null,
            awayScore: confirmed ? awayScore : null,
            status: !winner ? "pending" : winner === row.equipo_votado ? "correct" : "incorrect",
          };
        });
        const rewards = await calculateRewards(env.DB, fixture, visitorId);
        for (const p of predictions) {
          const detail = rewards.perGame[p.partidoId];
          p.earned = detail?.earned ?? (p.status === "pending" ? null : 0);
          p.medal = detail?.medal ?? null;
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
        // Protección adicional básica por IP: máximo 30 votos por día
        // en partidos distintos; no se almacena la dirección IP.
        const ip = request.headers.get("CF-Connecting-IP") || "";
        const day = new Date().toISOString().slice(0, 10);
        if (ip) {
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(day + ":" + ip));
          const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
          await env.DB.prepare("CREATE TABLE IF NOT EXISTS voto_limites (hash TEXT PRIMARY KEY, cantidad INTEGER NOT NULL)").run();
          const limit = await env.DB.prepare("INSERT INTO voto_limites(hash,cantidad) VALUES (?,1) ON CONFLICT(hash) DO UPDATE SET cantidad=cantidad+1 WHERE cantidad<30 RETURNING cantidad").bind(hash).first();
          if (!limit) return fail("Demasiadas solicitudes", 429);
        }
        try {
          await env.DB.prepare("INSERT INTO votos (partido_id,equipo_votado,visitante_id) VALUES (?,?,?)").bind(id, team, visitorId).run();
        } catch (error) {
          if (!String(error).includes("UNIQUE")) throw error;
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
