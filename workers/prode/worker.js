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
        await env.DB.batch([
          env.DB.prepare("INSERT INTO prode_groups (id, name, description, visibility, owner_id) VALUES (?, ?, ?, ?, ?)").bind(id, name, description, visibility, ownerId),
          env.DB.prepare("INSERT INTO prode_memberships (group_id, user_id, role) VALUES (?, ?, 'owner')").bind(id, ownerId),
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
        const groups = await env.DB.prepare(
          "SELECT g.id, g.name, g.description, g.visibility, g.season, g.created_at, m.role FROM prode_groups g JOIN prode_memberships m ON m.group_id = g.id WHERE m.user_id = ? ORDER BY g.created_at DESC LIMIT 50"
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
        const existing = await env.DB.prepare("SELECT 1 AS present FROM prode_memberships WHERE group_id = ? AND user_id = ?").bind(invite.group_id, userId).first();
        if (existing) return reply({ ok: true, groupId: invite.group_id, name: invite.name, alreadyMember: true });
        const updated = await env.DB.prepare(
          "UPDATE prode_invitations SET used_count = used_count + 1 WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND used_count < max_uses RETURNING id"
        ).bind(invite.id, new Date().toISOString()).first();
        if (!updated) return reply({ ok: false, error: "Invitación agotada" }, 409);
        try {
          await env.DB.prepare("INSERT INTO prode_memberships (group_id, user_id, role) VALUES (?, ?, 'member')").bind(invite.group_id, userId).run();
        } catch (error) {
          await env.DB.prepare("UPDATE prode_invitations SET used_count = MAX(0, used_count - 1) WHERE id = ?").bind(invite.id).run();
          throw error;
        }
        return reply({ ok: true, groupId: invite.group_id, name: invite.name });
      } catch {
        return reply({ ok: false, error: "No se pudo aceptar la invitación" }, 503);
      }
    }
    const groupDetail = /^\/api\/prode\/groups\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (groupDetail && request.method === "GET") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión inválida" }, 401);
      try {
        const groupId = groupDetail[1], userId = "firebase:" + identity.uid;
        const group = await env.DB.prepare(
          "SELECT g.id, g.name, g.description, g.visibility, g.season, g.created_at, m.role FROM prode_groups g JOIN prode_memberships m ON m.group_id = g.id WHERE g.id = ? AND m.user_id = ?"
        ).bind(groupId, userId).first();
        if (!group) return reply({ ok: false, error: "Liga no encontrada o sin acceso" }, 404);
        const members = await env.DB.prepare(
          "SELECT COALESCE(n.username, 'Jugador sin alias') AS username, m.role, m.joined_at FROM prode_memberships m LEFT JOIN prode_usernames n ON n.user_id = m.user_id WHERE m.group_id = ? ORDER BY CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END, m.joined_at ASC LIMIT 200"
        ).bind(groupId).all();
        return reply({ ok: true, group, members: members.results || [] });
      } catch {
        return reply({ ok: false, error: "No se pudieron cargar los participantes" }, 503);
      }
    }
    return reply({ ok: false, error: "Ruta no encontrada" }, 404);
  },
};
