// Prode LNA API · Etapa 1. Worker independiente de Mi Carrera.
// Los tokens Firebase se verifican criptográficamente antes de cualquier escritura.
const SITE = "https://lanaranjaargentina.com.ar";
const PROJECT_ID = "lna-prode";
const ISSUER = "https://securetoken.google.com/" + PROJECT_ID;
const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": SITE,
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "vary": "Origin",
};
const reply = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers });
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

// Mantener el historial de afiliación sin borrar la membresía ni los puntos iniciales.
// Las membresías existentes se registran una sola vez al migrar.
async function ensureMembershipPeriods(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_membership_periods (group_id TEXT NOT NULL REFERENCES prode_groups(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES prode_users(id) ON DELETE CASCADE, entered_at TEXT NOT NULL, exited_at TEXT, PRIMARY KEY(group_id,user_id,entered_at))").run();
  await db.prepare("INSERT OR IGNORE INTO prode_membership_periods(group_id,user_id,entered_at) SELECT m.group_id,m.user_id,m.joined_at FROM prode_memberships m").run();
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.headers.get("origin") && request.headers.get("origin") !== SITE)
      return reply({ ok: false, error: "Origen no permitido" }, 403);
    if (url.pathname === "/api/prode/health" && request.method === "GET")
      return reply({ ok: true, service: "prode-lna", stage: "profiles", authEnabled: true });
    if (url.pathname === "/api/prode/me" && (request.method === "GET" || request.method === "POST")) {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión inválida" }, 401);
      try {
        const id = "firebase:" + identity.uid;
        if (request.method === "POST") {
          const name = (identity.name.trim().slice(0, 32) || "Usuario LNA");
          await env.DB.prepare(
            "INSERT INTO prode_users (id, auth_subject, display_name) VALUES (?, ?, ?) ON CONFLICT(auth_subject) DO NOTHING"
          ).bind(id, identity.uid, name).run();
        }
        const user = await env.DB.prepare(
          "SELECT u.id, n.username, u.created_at FROM prode_users u LEFT JOIN prode_usernames n ON n.user_id = u.id WHERE u.auth_subject = ?"
        ).bind(identity.uid).first();
        return reply({ ok: true, user: user || null, linkedToMiCarrera: false });
      } catch {
        return reply({ ok: false, error: "No se pudo consultar el perfil" }, 503);
      }
    }
    if (url.pathname === "/api/prode/profile/username" && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión inválida" }, 401);
      try {
        const body = await request.json();
        const username = typeof body.username === "string" ? body.username.trim() : "";
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
          return reply({ ok: false, error: "Usá entre 3 y 20 letras, números o guiones bajos, sin espacios" }, 400);
        const userId = "firebase:" + identity.uid;
        const exists = await env.DB.prepare("SELECT id FROM prode_users WHERE id = ?").bind(userId).first();
        if (!exists) return reply({ ok: false, error: "Primero registrá tu perfil Prode" }, 409);
        const taken = await env.DB.prepare("SELECT user_id FROM prode_usernames WHERE username = ? COLLATE NOCASE AND user_id <> ?").bind(username, userId).first();
        if (taken) return reply({ ok: false, error: "Ese nombre de usuario ya está en uso" }, 409);
        await env.DB.prepare(
          "INSERT INTO prode_usernames (user_id, username) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET username = excluded.username"
        ).bind(userId, username).run();
        return reply({ ok: true, username });
      } catch (error) {
        if (String(error).includes("UNIQUE")) return reply({ ok: false, error: "Ese nombre de usuario ya está en uso" }, 409);
        return reply({ ok: false, error: "No se pudo guardar el nombre de usuario" }, 503);
      }
    }
    // Clasificación histórica: consulta en vivo los puntos de Mi Carrera de las cuentas vinculadas.
    if (url.pathname === "/api/prode/ranking/historical" && request.method === "GET") {
      if (!env.DB || !env.VOTACIONES) return reply({ ok: false, error: "Ranking no disponible" }, 503);
      try {
        const rows = await env.DB.prepare("SELECT l.visitor_id, n.username FROM prode_career_links l JOIN prode_usernames n ON n.user_id = l.user_id WHERE n.username IS NOT NULL AND n.username <> '' ORDER BY l.linked_at ASC LIMIT 100").all();
        const linked = rows.results || [];
        const results = [];
        for (let i = 0; i < linked.length; i += 8) {
          const chunk = linked.slice(i, i + 8);
          const batch = await Promise.all(chunk.map(async item => {
            try {
              const response = await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev/api/puntos?visitanteId=" + encodeURIComponent(item.visitor_id));
              if (!response.ok) return null;
              const data = await response.json();
              if (!data.ok || !Number.isFinite(data.points)) return null;
              return { username: item.username, points: data.points };
            } catch { return null; }
          }));
          results.push(...batch.filter(Boolean));
        }
        results.sort((a,b) => b.points-a.points || a.username.localeCompare(b.username, "es"));
        return reply({ ok: true, total: results.length, ranking: results.slice(0, 20).map((entry,index) => ({ ...entry, position: index === 0 ? 1 : results[index-1].points === entry.points ? results.findIndex(x => x.points === entry.points)+1 : index+1 })) });
      } catch (error) {
        return reply({ ok: false, error: "No se pudo cargar el ranking histórico" }, 503);
      }
    }
    // Vinculación voluntaria desde el mismo navegador de Mi Carrera.
    // No otorga puntos ni importa votos; se impide compartir un visitante entre cuentas.
    if (url.pathname === "/api/prode/career-link" && ["GET", "POST"].includes(request.method)) {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      const userId = "firebase:" + identity.uid;
      try {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_career_links (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, visitor_id TEXT NOT NULL UNIQUE, linked_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
        const profile = await env.DB.prepare("SELECT id FROM prode_users WHERE id = ?").bind(userId).first();
        if (!profile) return reply({ ok: false, error: "Primero registrá tu perfil Prode" }, 409);
        const linked = await env.DB.prepare("SELECT visitor_id, linked_at FROM prode_career_links WHERE user_id = ?").bind(userId).first();
        if (request.method === "GET") return reply({ ok: true, linked: Boolean(linked), linkedAt: linked?.linked_at || null });
        const body = await request.json();
        const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId))
          return reply({ ok: false, error: "No encontramos una identidad válida de Mi Carrera en este navegador" }, 400);
        if (body.confirm !== true) return reply({ ok: false, error: "Confirmá la vinculación" }, 400);
        if (linked) return reply({ ok: linked.visitor_id === visitorId, linked: true, error: linked.visitor_id === visitorId ? undefined : "Esta cuenta ya está vinculada a otra carrera" }, linked.visitor_id === visitorId ? 200 : 409);
        // Verificar que la carrera existe en el servicio oficial antes de guardar el enlace.
        const careerRes = await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev/api/puntos?visitanteId=" + encodeURIComponent(visitorId));
        if (!careerRes.ok) return reply({ ok: false, error: "No se pudo verificar Mi Carrera (servicio de votaciones: " + careerRes.status + ")" }, 503);
        const career = await careerRes.json();
        if (!career.ok) return reply({ ok: false, error: "Mi Carrera no está disponible" }, 409);
        await env.DB.prepare("INSERT INTO prode_career_links (user_id, visitor_id) VALUES (?, ?)").bind(userId, visitorId).run();
        return reply({ ok: true, linked: true });
      } catch (error) {
        if (String(error).includes("UNIQUE")) return reply({ ok: false, error: "Esta carrera ya está vinculada a otra cuenta Prode" }, 409);
        return reply({ ok: false, error: "No se pudo vincular Mi Carrera" }, 503);
      }
    }
    // Pronósticos de prueba: calendario generado desde los datos oficiales de LNA.
    // La validación se realiza en el servidor; nunca se confía en el fixture del cliente.
    if (url.pathname === "/api/prode/votes" && request.method === "POST") return reply({ ok: false, error: "Los pronósticos se realizan desde el popup de Mi Carrera; la vinculación con Prode está en preparación" }, 409);
    if (url.pathname === "/api/prode/votes" && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      const userId = "firebase:" + identity.uid;
      try {
        const profile = await env.DB.prepare("SELECT id FROM prode_users WHERE id = ?").bind(userId).first();
        if (!profile) return reply({ ok: false, error: "Primero registrá tu perfil Prode" }, 409);
        if (request.method === "GET") {
          const votes = await env.DB.prepare("SELECT match_id, winner_team_id, submitted_at FROM prode_vote_links WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 300").bind(userId).all();
          return reply({ ok: true, votes: votes.results || [] });
        }
        const body = await request.json();
        const matchId = typeof body.matchId === "string" ? body.matchId : "";
        const winner = typeof body.winnerTeamId === "string" ? body.winnerTeamId : "";
        if (!matchId || matchId.length > 180 || !winner || winner.length > 80)
          return reply({ ok: false, error: "Pronóstico inválido" }, 400);
        const fixtureResponse = await fetch(SITE + "/voting-fixture.json", { cf: { cacheTtl: 0 } });
        if (!fixtureResponse.ok) return reply({ ok: false, error: "Calendario temporalmente no disponible" }, 503);
        const fixture = await fixtureResponse.json();
        const game = Array.isArray(fixture.games) ? fixture.games.find(g => g.id === matchId) : null;
        if (!game || ![game.homeTeam, game.awayTeam].includes(winner))
          return reply({ ok: false, error: "Partido o equipo no válido" }, 400);
        const kickoff = Date.parse(game.startsAt);
        if (!Number.isFinite(kickoff) || game.finished || Date.now() >= kickoff)
          return reply({ ok: false, error: "La votación de este partido está cerrada" }, 409);
        const result = await env.DB.prepare(
          "INSERT INTO prode_vote_links (user_id, match_id, winner_team_id) VALUES (?, ?, ?) ON CONFLICT(user_id, match_id) DO NOTHING"
        ).bind(userId, matchId, winner).run();
        if (!result.meta?.changes) return reply({ ok: false, error: "Ya registraste un pronóstico para este partido" }, 409);
        return reply({ ok: true, matchId, winnerTeamId: winner }, 201);
      } catch {
        return reply({ ok: false, error: "No se pudo procesar el pronóstico" }, 503);
      }
    }
    if (url.pathname === "/api/prode/groups" && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión para crear una liga" }, 401);
      try {
        const body = await request.json();
        const name = typeof body.name === "string" ? body.name.trim().replace(/\\s+/g, " ") : "";
        const description = typeof body.description === "string" ? body.description.trim() : "";
        const visibility = body.visibility;
        if (name.length < 3 || name.length > 60 || description.length > 240 || !["public", "private"].includes(visibility))
          return reply({ ok: false, error: "Revisá el nombre, la descripción y la privacidad" }, 400);
        const ownerId = "firebase:" + identity.uid;
        const owner = await env.DB.prepare("SELECT id FROM prode_users WHERE auth_subject = ?").bind(identity.uid).first();
        if (!owner) return reply({ ok: false, error: "Primero registrá tu perfil Prode" }, 409);
        const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM prode_groups WHERE owner_id = ?").bind(ownerId).first();
        if (Number(count?.total || 0) >= 5) return reply({ ok: false, error: "Podés crear hasta cinco ligas" }, 409);
        const id = crypto.randomUUID();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_league_starts (group_id TEXT PRIMARY KEY REFERENCES prode_groups(id) ON DELETE CASCADE, starts_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
        await ensureMembershipPeriods(env.DB);
        await env.DB.batch([
          env.DB.prepare("INSERT INTO prode_groups (id, name, description, visibility, owner_id) VALUES (?, ?, ?, ?, ?)").bind(id, name, description, visibility, ownerId),
          env.DB.prepare("INSERT INTO prode_memberships (group_id, user_id, role) VALUES (?, ?, 'owner')").bind(id, ownerId),
          env.DB.prepare("INSERT INTO prode_membership_periods(group_id,user_id,entered_at) VALUES (?,?,?)").bind(id,ownerId,new Date().toISOString()),
          env.DB.prepare("INSERT INTO prode_league_starts(group_id) VALUES (?)").bind(id),
        ]);
        return reply({ ok: true, group: { id, name, description, visibility, season: "2026/27", role: "owner" } }, 201);
      } catch {
        return reply({ ok: false, error: "No se pudo crear la liga. Intentá de nuevo" }, 503);
      }
    }
    if (url.pathname === "/api/prode/groups/mine" && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión inválida" }, 401);
      try {
        await ensureMembershipPeriods(env.DB);
        const groups = await env.DB.prepare(
          "SELECT g.id, g.name, g.description, g.visibility, g.season, g.created_at, m.role FROM prode_groups g JOIN prode_memberships m ON m.group_id = g.id WHERE m.user_id = ? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL) ORDER BY g.created_at DESC LIMIT 50"
        ).bind("firebase:" + identity.uid).all();
        return reply({ ok: true, groups: groups.results || [] });
      } catch {
        return reply({ ok: false, error: "No se pudieron cargar tus ligas" }, 503);
      }
    }
    if (url.pathname === "/api/prode/groups/public" && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      try {
        const result = await env.DB.prepare(
          "SELECT id, name, description, season, created_at FROM prode_groups WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 30"
        ).all();
        return reply({ ok: true, groups: result.results || [] });
      } catch {
        return reply({ ok: false, error: "Grupos no disponibles" }, 503);
      }
    }
    // Invitaciones: token aleatorio de 256 bits; solo se guarda su SHA-256.
    const inviteCreate = /^\/api\/prode\/groups\/([0-9a-f-]{36})\/invite$/.exec(url.pathname);
    if (inviteCreate && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión inválida" }, 401);
      try {
        const groupId = inviteCreate[1], userId = "firebase:" + identity.uid;
        const owner = await env.DB.prepare("SELECT id FROM prode_groups WHERE id = ? AND owner_id = ?").bind(groupId, userId).first();
        if (!owner) return reply({ ok: false, error: "Solo el administrador puede invitar" }, 403);
        const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
        const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, "0")).join("");
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        const expires = new Date(Date.now() + 7 * 86400000).toISOString();
        await env.DB.prepare("INSERT INTO prode_invitations (id, group_id, token_hash, created_by, expires_at, max_uses) VALUES (?, ?, ?, ?, ?, 100)")
          .bind(crypto.randomUUID(), groupId, hash, userId, expires).run();
        return reply({ ok: true, token, expiresAt: expires }, 201);
      } catch {
        return reply({ ok: false, error: "No se pudo generar la invitación" }, 503);
      }
    }
    if (url.pathname === "/api/prode/invitations/join" && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const body = await request.json();
        const token = typeof body.token === "string" ? body.token.trim().toLowerCase() : "";
        if (!/^[0-9a-f]{64}$/.test(token)) return reply({ ok: false, error: "Código de invitación inválido" }, 400);
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        const userId = "firebase:" + identity.uid;
        const user = await env.DB.prepare("SELECT id FROM prode_users WHERE id = ?").bind(userId).first();
        if (!user) return reply({ ok: false, error: "Primero registrá tu perfil Prode" }, 409);
        const invite = await env.DB.prepare(
          "SELECT i.id, i.group_id, g.name FROM prode_invitations i JOIN prode_groups g ON g.id = i.group_id WHERE i.token_hash = ? AND i.revoked_at IS NULL AND i.expires_at > ? AND i.used_count < i.max_uses"
        ).bind(hash, new Date().toISOString()).first();
        if (!invite) return reply({ ok: false, error: "Invitación vencida o inválida" }, 404);
        await ensureMembershipPeriods(env.DB);
        const existing = await env.DB.prepare("SELECT 1 AS present FROM prode_memberships WHERE group_id = ? AND user_id = ?").bind(invite.group_id, userId).first();
        const active = await env.DB.prepare("SELECT 1 AS present FROM prode_membership_periods WHERE group_id=? AND user_id=? AND exited_at IS NULL").bind(invite.group_id,userId).first();
        if (active) return reply({ ok: true, groupId: invite.group_id, name: invite.name, alreadyMember: true });
        const updated = await env.DB.prepare(
          "UPDATE prode_invitations SET used_count = used_count + 1 WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND used_count < max_uses RETURNING id"
        ).bind(invite.id, new Date().toISOString()).first();
        if (!updated) return reply({ ok: false, error: "Invitación agotada" }, 409);
        try {
          if (!existing) await env.DB.prepare("INSERT INTO prode_memberships (group_id, user_id, role) VALUES (?, ?, 'member')").bind(invite.group_id, userId).run();
          await env.DB.prepare("INSERT INTO prode_membership_periods(group_id,user_id,entered_at) VALUES (?,?,?)").bind(invite.group_id, userId, new Date().toISOString()).run();
        } catch (error) {
          await env.DB.prepare("UPDATE prode_invitations SET used_count = MAX(0, used_count - 1) WHERE id = ?").bind(invite.id).run();
          throw error;
        }
        return reply({ ok: true, groupId: invite.group_id, name: invite.name });
      } catch {
        return reply({ ok: false, error: "No se pudo aceptar la invitación" }, 503);
      }
    }
    // Diagnóstico de cierre: operación estrictamente de solo lectura.
    // No existe ruta de cierre; un fixture parcial nunca habilita un archivo definitivo.
    const closeCheck = new RegExp("^/api/prode/groups/([0-9a-f-]{36})/seasons/close-check$").exec(url.pathname);
    if (closeCheck && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const groupId = closeCheck[1], userId = "firebase:" + identity.uid;
        await ensureMembershipPeriods(env.DB);
        const group = await env.DB.prepare(
          "SELECT g.season, m.role FROM prode_groups g JOIN prode_memberships m ON m.group_id=g.id WHERE g.id=? AND m.user_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL)"
        ).bind(groupId,userId).first();
        if (!group) return reply({ ok: false, error: "Liga no encontrada o sin acceso" }, 404);
        if (group.role !== "owner") return reply({ ok: false, error: "Solo el administrador puede consultar la validación" }, 403);
        const blockers = ["No existe todavía un cierre autorizado ni una confirmación oficial de fin de temporada."];
        const season = group.season || "2026/27";
        let fixture = { available: false, complete: false, total: 0, pending: null };
        try {
          const response = await fetch(SITE + "/voting-fixture.json", { headers: { accept: "application/json" }, cf: { cacheTtl: 0 } });
          if (!response.ok) throw Error("Fixture no disponible");
          const data = await response.json();
          if (!Array.isArray(data.games) || !Number.isFinite(Date.parse(data.generatedAt))) throw Error("Fixture incompleto");
          // El archivo publicado puede omitir encuentros aplazados: es informativo, nunca prueba de cierre.
          const games = data.games.filter(game => game && typeof game.id === "string");
          const pending = games.filter(game => !(game.finished === true && Number.isFinite(game.homeScore) && Number.isFinite(game.awayScore) && game.homeScore !== game.awayScore));
          const fresh = Date.now() - Date.parse(data.generatedAt) <= 14*86400000 && Date.now() >= Date.parse(data.generatedAt) - 300000;
          fixture = { available: true, complete: fresh, total: games.length, pending: pending.length, generatedAt: data.generatedAt };
          if (!fresh) blockers.push("El fixture publicado no está actualizado.");
          if (pending.length) blockers.push("El fixture publicado todavía contiene " + pending.length + " partidos sin resultado confirmado.");
        } catch {
          blockers.push("No se pudo verificar el fixture publicado.");
        }
        // Una comprobación de fixture vacío no autoriza el cierre, porque pueden faltar aplazados.
        return reply({ ok: true, season, canClose: false, mode: "read-only", fixture, blockers });
      } catch (error) {
        console.error("Prode close check:", error);
        return reply({ ok: false, error: "No se pudo validar el cierre" }, 503);
      }
    }
    // Archivo histórico de temporadas. Solo lectura; nunca cierra ni modifica una temporada.
    // Una futura operación de cierre deberá verificar todos los partidos oficiales pendientes
    // y guardar de forma atómica el resumen y las filas antes de declarar un campeón.
    const seasonHistory = new RegExp("^/api/prode/groups/([0-9a-f-]{36})/seasons$").exec(url.pathname);
    if (seasonHistory && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const groupId = seasonHistory[1], userId = "firebase:" + identity.uid;
        await ensureMembershipPeriods(env.DB);
        const member = await env.DB.prepare("SELECT 1 AS allowed FROM prode_memberships m WHERE group_id=? AND user_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL)").bind(groupId, userId).first();
        if (!member) return reply({ ok: false, error: "No pertenecés a esta liga" }, 403);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_season_archives (group_id TEXT NOT NULL, season TEXT NOT NULL, closed_at TEXT NOT NULL DEFAULT (datetime('now')), champion_user_ids TEXT NOT NULL, standings_json TEXT NOT NULL, medals_json TEXT NOT NULL, weekly_history_json TEXT NOT NULL, PRIMARY KEY(group_id,season), FOREIGN KEY(group_id) REFERENCES prode_groups(id) ON DELETE RESTRICT)").run();
        const archives = await env.DB.prepare("SELECT season, closed_at, champion_user_ids, standings_json, medals_json, weekly_history_json FROM prode_season_archives WHERE group_id=? ORDER BY season DESC LIMIT 30").bind(groupId).all();
        return reply({ ok: true, seasons: (archives.results || []).map(row => ({
          season: row.season, closedAt: row.closed_at,
          champions: JSON.parse(row.champion_user_ids),
          ranking: JSON.parse(row.standings_json),
          medalTable: JSON.parse(row.medals_json),
          weeklyHistory: JSON.parse(row.weekly_history_json),
        })) });
      } catch (error) {
        console.error("Prode season history:", error);
        return reply({ ok: false, error: "No se pudo consultar el historial de temporadas" }, 503);
      }
    }
    // Clasificación por liga. Los votos se leen de Mi Carrera; nunca se duplican.
    // El primer acceso activa la liga para partidos futuros (no importa puntos anteriores).
    const leagueRanking = /^\/api\/prode\/groups\/([0-9a-f-]{36})\/ranking$/.exec(url.pathname);
    if (leagueRanking && (request.method === "GET" || request.method === "POST")) {
      if (!env.DB || !env.VOTACIONES) return reply({ ok: false, error: "Clasificación no disponible" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const groupId = leagueRanking[1], userId = "firebase:" + identity.uid;
        await ensureMembershipPeriods(env.DB);
        const membership = await env.DB.prepare("SELECT m.role FROM prode_memberships m WHERE m.group_id=? AND m.user_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL)").bind(groupId,userId).first();
        if (!membership) return reply({ ok: false, error: "No pertenecés a esta liga" }, 403);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_league_starts (group_id TEXT PRIMARY KEY REFERENCES prode_groups(id) ON DELETE CASCADE, starts_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
        await env.DB.prepare("INSERT OR IGNORE INTO prode_league_starts(group_id) VALUES (?)").bind(groupId).run();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_initial_points (group_id TEXT NOT NULL, user_id TEXT NOT NULL, points INTEGER NOT NULL CHECK(points >= 0), assigned_by TEXT NOT NULL, assigned_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(group_id,user_id), FOREIGN KEY(group_id,user_id) REFERENCES prode_memberships(group_id,user_id))").run();
        const initialRows = await env.DB.prepare("SELECT user_id, points FROM prode_initial_points WHERE group_id=?").bind(groupId).all();
        const initialPoints = new Map((initialRows.results || []).map(row => [row.user_id, Number(row.points)]));
        const start = await env.DB.prepare("SELECT starts_at FROM prode_league_starts WHERE group_id=?").bind(groupId).first();
        const members = await env.DB.prepare(
          "SELECT m.user_id, m.joined_at, COALESCE(n.username,'Jugador sin alias') AS username, l.visitor_id FROM prode_memberships m LEFT JOIN prode_usernames n ON n.user_id=m.user_id LEFT JOIN prode_career_links l ON l.user_id=m.user_id WHERE m.group_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL) ORDER BY m.joined_at ASC LIMIT 200"
        ).bind(groupId).all();
        const periodsResult = await env.DB.prepare("SELECT user_id, entered_at, exited_at FROM prode_membership_periods WHERE group_id=? ORDER BY entered_at").bind(groupId).all();
        const periodsByUser = new Map();
        for (const period of periodsResult.results || []) {
          if (!periodsByUser.has(period.user_id)) periodsByUser.set(period.user_id, []);
          periodsByUser.get(period.user_id).push({ start: Date.parse(period.entered_at.replace(" ","T") + (period.entered_at.includes("Z") ? "" : "Z")), end: period.exited_at ? Date.parse(period.exited_at.replace(" ","T") + (period.exited_at.includes("Z") ? "" : "Z")) : Infinity });
        }
        const time = value => Date.parse(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
        const leagueStart = time(start.starts_at);
        const rows = [];
        // Semanas de lunes a domingo según la fecha del partido en Argentina.
        // Las claves son medianoches UTC de la fecha civil argentina, no del instante UTC del encuentro.
        const argentinaDateKey = value => {
          const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
          const field = type => Number(parts.find(part => part.type === type)?.value);
          return Date.UTC(field("year"), field("month") - 1, field("day"));
        };
        const mondayOf = dateKey => dateKey - ((new Date(dateKey).getUTCDay()+6)%7)*86400000;
        const weekStart = mondayOf(argentinaDateKey(Date.now()));
        const allMembers = members.results || [];
        for (let i=0; i<allMembers.length; i+=6) {
          const batch = await Promise.all(allMembers.slice(i,i+6).map(async member => {
            const base = { username: member.username, userId: member.user_id, points: initialPoints.get(member.user_id) || 0, initialPoints: initialPoints.get(member.user_id) ?? null, joinedLate: time(member.joined_at) > leagueStart, correct: 0, wrong: 0, played: 0, mvpHits: 0, mvpVotes: 0, weeks: {}, weekly: { points: 0, correct: 0, wrong: 0, mvpHits: 0, mvpVoted: 0, played: 0 } };
            if (!member.visitor_id) return base;
            const response = await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev/api/prode-results?visitanteId=" + encodeURIComponent(member.visitor_id));
            if (!response.ok) throw Error("Servicio de votaciones no disponible");
            const data = await response.json();
            if (!data.ok || !Array.isArray(data.games)) throw Error("Historial de votaciones no disponible");
            const since = Math.max(leagueStart, time(member.joined_at));
            const periods = periodsByUser.get(member.user_id) || [];
            let streak = 0, lastPeriod = -1;
            const chronologicalGames = [...data.games].sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || String(a.id || "").localeCompare(String(b.id || "")));
            for (const game of chronologicalGames) {
              const kickoff = Date.parse(game.startsAt);
              if (!Number.isFinite(kickoff) || kickoff < since || !game.finished || kickoff > Date.now()) continue;
              const periodIndex = periods.findIndex(p => kickoff >= p.start && kickoff < p.end);
              if (periodIndex < 0) continue; // No se suman partidos disputados durante la ausencia.
              if (lastPeriod !== periodIndex) { streak = 0; lastPeriod = periodIndex; }
              const gameWeek = mondayOf(argentinaDateKey(kickoff));
              const weekly = gameWeek === weekStart;
              const week = base.weeks[gameWeek] ||= { points: 0, correct: 0, wrong: 0, mvpHits: 0, played: 0, mvpVoted: 0 };
              if (game.mvpVoted) { week.mvpVoted++; base.mvpVotes++; if (weekly) base.weekly.mvpVoted++; }
              if (game.mvpCorrect) { week.mvpHits++; week.points += 20; base.points += 20; base.mvpHits++; if (weekly) { base.weekly.points += 20; base.weekly.mvpHits++; } }
              if (!game.voted) { streak = 0; continue; }
              base.played++; week.played++; if (weekly) base.weekly.played++;
              if (game.correct) {
                base.correct++; base.points += 15; week.correct++; week.points += 15; streak++;
                if (weekly) { base.weekly.correct++; base.weekly.points += 15; }
                if (streak === 5) { base.points += 45; week.points += 45; if (weekly) base.weekly.points += 45; }
              } else {
                base.wrong++; base.points += 5; week.wrong++; week.points += 5; streak = 0;
                if (weekly) { base.weekly.wrong++; base.weekly.points += 5; }
              }
            }
            return base;
          }));
          rows.push(...batch);
        }
        if (request.method === "POST") {
          if (membership.role !== "owner") return reply({ ok: false, error: "Solo el administrador puede asignar puntos" }, 403);
          const body = await request.json().catch(() => ({}));
          const targetId = body.userId;
          const amount = body.points;
          if (typeof targetId !== "string" || !Number.isSafeInteger(amount) || amount < 0)
            return reply({ ok: false, error: "Puntos inválidos" }, 400);
          const target = rows.find(row => row.userId === targetId);
          if (!target || targetId === userId) return reply({ ok: false, error: "Seleccioná otro participante de la liga" }, 400);
          if (!target.joinedLate) return reply({ ok: false, error: "Solo se pueden asignar puntos a integrantes que ingresaron después del inicio de la liga" }, 403);
          if (target.initialPoints !== null) return reply({ ok: false, error: "Los puntos iniciales ya fueron asignados" }, 409);
          const leaderPoints = Math.max(0, ...rows.map(row => row.points));
          if (amount > leaderPoints) return reply({ ok: false, error: "El máximo permitido es " + leaderPoints + " puntos" }, 400);
          // No se permiten ajustes retroactivos cuando el integrante ya sumó puntos propios.
          if (target.played || target.mvpHits || Object.values(target.weeks).some(w => w.mvpVoted > 0)) return reply({ ok: false, error: "El participante ya comenzó a puntuar en la liga" }, 409);
          const saved = await env.DB.prepare("INSERT INTO prode_initial_points(group_id,user_id,points,assigned_by) VALUES(?,?,?,?) ON CONFLICT(group_id,user_id) DO NOTHING")
            .bind(groupId,targetId,amount,userId).run();
          if (!saved.meta?.changes) return reply({ ok: false, error: "Los puntos iniciales ya fueron asignados" }, 409);
          return reply({ ok: true, userId: targetId, points: amount, maxPoints: leaderPoints });
        }
        // Estadísticas históricas de perfil calculadas únicamente a partir de partidos elegibles en esta liga.
        const profileFirstWeek = mondayOf(argentinaDateKey(leagueStart));
        for (const row of rows) {
          row.accuracy = row.played ? Math.round(row.correct * 1000 / row.played) / 10 : 0;
          const weeksPlayed = Object.entries(row.weeks).filter(([,w]) => w.played > 0 || w.mvpVoted > 0);
          const best = weeksPlayed.sort((a,b) => b[1].points-a[1].points || Number(a[0])-Number(b[0]))[0];
          row.bestWeek = best ? { number: Math.floor((Number(best[0])-profileFirstWeek)/(7*86400000))+1, points: best[1].points } : null;
        }
        rows.sort((a,b) => b.points-a.points || b.correct-a.correct || a.username.localeCompare(b.username,"es"));
        let rank = 0, previousPoints = null;
        const ranking = rows.map(row => {
          if (!row.played && !row.mvpVotes && row.initialPoints === null) return { ...row, position: null };
          if (row.points !== previousPoints) { rank++; previousPoints = row.points; }
          return { ...row, position: rank };
        });
        let weeklyRank = 0, previousWeekly = null;
        const weeklyRanking = [...rows].sort((a,b) => b.weekly.points-a.weekly.points || b.weekly.correct-a.weekly.correct || a.username.localeCompare(b.username,"es")).map(row => {
          const pts = row.weekly.points;
          if (!row.weekly.played && !row.weekly.mvpVoted) return { ...row.weekly, userId: row.userId, username: row.username, position: null };
          if (pts !== previousWeekly) { weeklyRank++; previousWeekly = pts; }
          return { ...row.weekly, userId: row.userId, username: row.username, position: weeklyRank };
        });
        // Historial numerado desde la semana de inicio de la liga, incluyendo semanas sin partidos.
        const firstWeek = mondayOf(argentinaDateKey(leagueStart));
        const weeklyHistory = [];
        for (let startMs = firstWeek, number = 1; startMs <= weekStart && number <= 110; startMs += 7*86400000, number++) {
          const participants = rows.filter(row => argentinaDateKey(time(allMembers.find(m => m.user_id === row.userId)?.joined_at)) < startMs + 7*86400000).map(row => {
            const w = row.weeks[startMs] || { points: 0, correct: 0, wrong: 0, mvpHits: 0, played: 0, mvpVoted: 0 };
            return { username: row.username, userId: row.userId, points: w.points, correct: w.correct, wrong: w.wrong, mvpHits: w.mvpHits, played: w.played, participated: w.played > 0 || w.mvpVoted > 0 };
          });
          participants.sort((a,b) => b.points-a.points || b.correct-a.correct || a.username.localeCompare(b.username,"es"));
          let place = 0, last = null;
          const ranked = participants.map(row => {
            if (!row.participated) return { ...row, position: null };
            if (row.points !== last) { place++; last = row.points; }
            return { ...row, position: place };
          });
          weeklyHistory.push({ number, startsAt: new Date(startMs).toISOString(), finished: startMs < weekStart, eligibleForMedals: startMs < weekStart && ranked.filter(row => row.participated).length >= 3, ranking: ranked });
        }
        // Medallas de semanas cerradas con al menos tres pronosticadores.
        const medals = new Map(rows.map(row => [row.userId, { userId: row.userId, username: row.username, gold: 0, silver: 0, bronze: 0, history: [] }]));
        const weeks = [...new Set(rows.flatMap(row => Object.keys(row.weeks).map(Number)))].filter(week => week < weekStart).sort((a,b)=>a-b);
        for (const week of weeks) {
          const participants = rows.filter(row => (row.weeks[week]?.played || 0) + (row.weeks[week]?.mvpVoted || 0) > 0);
          if (participants.length < 3) continue;
          participants.sort((a,b) => b.weeks[week].points-a.weeks[week].points);
          let place = 0, lastPoints = null;
          for (const row of participants) {
            const pts = row.weeks[week].points;
            if (pts !== lastPoints) { place++; lastPoints = pts; }
            const entry = medals.get(row.userId);
            const weekNumber = Math.floor((week - firstWeek) / (7*86400000)) + 1;
            if (place <= 3) entry.history.push({ week: weekNumber, position: place, points: pts });
            if (place === 1) entry.gold++;
            else if (place === 2) entry.silver++;
            else if (place === 3) entry.bronze++;
          }
        }
        const medalTable = [...medals.values()].sort((a,b)=>b.gold-a.gold || b.silver-a.silver || b.bronze-a.bronze || a.username.localeCompare(b.username,"es"));
        return reply({ ok: true, ranking, weeklyRanking, weeklyHistory, medalTable, canAssignInitialPoints: membership.role === "owner", weekStartsAt: new Date(weekStart).toISOString(), startedAt: start.starts_at });
      } catch (error) {
        console.error("Prode league ranking:", error);
        return reply({ ok: false, error: "No se pudo calcular la clasificación de esta liga" }, 503);
      }
    }
    // Gestión de liga: abandonar, expulsar o eliminar; solo miembros autorizados.
    const manageGroup = /^\/api\/prode\/groups\/([0-9a-f-]{36})\/(leave|members|delete)$/.exec(url.pathname);
    if (manageGroup && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const [, groupId, action] = manageGroup, actorId = "firebase:" + identity.uid;
        const group = await env.DB.prepare("SELECT owner_id FROM prode_groups WHERE id=?").bind(groupId).first();
        if (!group) return reply({ ok: false, error: "Liga no encontrada" }, 404);
        await ensureMembershipPeriods(env.DB);
        const membership = await env.DB.prepare("SELECT m.role FROM prode_memberships m WHERE m.group_id=? AND m.user_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL)").bind(groupId,actorId).first();
        if (!membership) return reply({ ok: false, error: "No pertenecés a esta liga" }, 403);
        if (action === "leave") {
          if (group.owner_id === actorId) return reply({ ok: false, error: "El creador debe eliminar la liga; no puede abandonarla" }, 403);
          await env.DB.prepare("UPDATE prode_membership_periods SET exited_at=? WHERE group_id=? AND user_id=? AND exited_at IS NULL").bind(new Date().toISOString(),groupId,actorId).run();
          return reply({ ok: true });
        }
        if (group.owner_id !== actorId) return reply({ ok: false, error: "Solo el administrador puede hacer esto" }, 403);
        if (action === "members") {
          const body = await request.json().catch(() => ({}));
          const targetId = body.userId;
          if (typeof targetId !== "string" || targetId === actorId || !targetId.startsWith("firebase:")) return reply({ ok: false, error: "Participante inválido" }, 400);
          const deleted = await env.DB.prepare("UPDATE prode_membership_periods SET exited_at=? WHERE group_id=? AND user_id=? AND exited_at IS NULL AND EXISTS (SELECT 1 FROM prode_memberships m WHERE m.group_id=? AND m.user_id=? AND m.role != 'owner')").bind(new Date().toISOString(),groupId,targetId,groupId,targetId).run();
          if (!deleted.meta?.changes) return reply({ ok: false, error: "Participante no encontrado" }, 404);
          return reply({ ok: true });
        }
        const body = await request.json().catch(() => ({}));
        if (body.confirmName !== (await env.DB.prepare("SELECT name FROM prode_groups WHERE id=?").bind(groupId).first())?.name)
          return reply({ ok: false, error: "Confirmá el nombre exacto de la liga" }, 400);
        await env.DB.batch([
          env.DB.prepare("DELETE FROM prode_membership_periods WHERE group_id=?").bind(groupId),
          env.DB.prepare("DELETE FROM prode_initial_points WHERE group_id=?").bind(groupId),
          env.DB.prepare("DELETE FROM prode_league_starts WHERE group_id=?").bind(groupId),
          env.DB.prepare("DELETE FROM prode_invitations WHERE group_id=?").bind(groupId),
          env.DB.prepare("DELETE FROM prode_memberships WHERE group_id=?").bind(groupId),
          env.DB.prepare("DELETE FROM prode_groups WHERE id=? AND owner_id=?").bind(groupId,actorId)
        ]);
        return reply({ ok: true });
      } catch (error) {
        console.error("Prode management:", error);
        return reply({ ok: false, error: "No se pudo completar la operación" }, 503);
      }
    }
    const groupDetail = /^\/api\/prode\/groups\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (groupDetail && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión inválida" }, 401);
      try {
        const groupId = groupDetail[1], userId = "firebase:" + identity.uid;
        await ensureMembershipPeriods(env.DB);
        const group = await env.DB.prepare(
          "SELECT g.id, g.name, g.description, g.visibility, g.season, g.created_at, m.role FROM prode_groups g JOIN prode_memberships m ON m.group_id = g.id WHERE g.id = ? AND m.user_id = ? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL)"
        ).bind(groupId, userId).first();
        if (!group) return reply({ ok: false, error: "Liga no encontrada o sin acceso" }, 404);
        const members = await env.DB.prepare(
          "SELECT m.user_id AS userId, COALESCE(n.username, 'Jugador sin alias') AS username, m.role, m.joined_at FROM prode_memberships m LEFT JOIN prode_usernames n ON n.user_id = m.user_id WHERE m.group_id = ? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL) ORDER BY CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END, m.joined_at ASC LIMIT 200"
        ).bind(groupId).all();
        return reply({ ok: true, group, members: members.results || [] });
      } catch {
        return reply({ ok: false, error: "No se pudieron cargar los participantes" }, 503);
      }
    }
    return reply({ ok: false, error: "Ruta no encontrada" }, 404);
  },
};
