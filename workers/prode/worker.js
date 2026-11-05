// Prode LNA API · Etapa 1. Worker independiente de Mi Carrera.
// Los tokens Firebase se verifican criptográficamente antes de cualquier escritura.
const SITE = "https://lanaranjaargentina.com.ar";
// Una única cronología de resultados para puntuación, rachas y grilla.
// Primero ordena por inicio; a igual inicio, por primer final detectado.
function compareStreakGames(a,b) {
  const kickoff = Date.parse(a.startsAt)-Date.parse(b.startsAt);
  if (kickoff) return kickoff;
  const finishA = Date.parse(a.finishedObservedAt || "");
  const finishB = Date.parse(b.finishedObservedAt || "");
  if (Number.isFinite(finishA) && Number.isFinite(finishB) && finishA !== finishB) return finishA-finishB;
  return String(a.id || "").localeCompare(String(b.id || ""));
}

// Únicamente si los dos encuentros empezaron a la misma hora Y se
// detectaron finalizados en la misma consulta, los errores (y las
// ausencias de voto) se procesan antes de los aciertos de este usuario.
// Cada participante puede tener un orden distinto y correcto para su racha.
function compareUserStreakGames(a,b) {
  const base = compareStreakGames(a,b);
  const sameStart = Date.parse(a.startsAt) === Date.parse(b.startsAt);
  const sameFinish = a.finishedObservedAt && b.finishedObservedAt &&
    a.finishedObservedAt === b.finishedObservedAt;
  if (sameStart && sameFinish && a.finished && b.finished &&
      Boolean(a.correct) !== Boolean(b.correct)) {
    return a.correct ? 1 : -1;
  }
  return base;
}

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
const validCrest = color => typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
async function ensureCareerLinks(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_career_links (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, visitor_id TEXT NOT NULL UNIQUE, linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}
async function ensureVoteSources(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_vote_sources (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, visitor_id TEXT NOT NULL UNIQUE, registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}
async function ensureCrests(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_user_crest_styles (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, style TEXT NOT NULL DEFAULT 'pro')").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_user_crest_fonts (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, font TEXT NOT NULL DEFAULT 'sport')").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_user_crest_symbols (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, symbol TEXT NOT NULL DEFAULT 'ball')").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_crest_texts (kind TEXT NOT NULL, entity_id TEXT NOT NULL, color TEXT NOT NULL, PRIMARY KEY(kind,entity_id))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_user_crests (user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, primary_color TEXT NOT NULL, secondary_color TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS prode_group_crests (group_id TEXT PRIMARY KEY REFERENCES prode_groups(id) ON DELETE CASCADE, primary_color TEXT NOT NULL, secondary_color TEXT NOT NULL)").run();
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.headers.get("origin") && request.headers.get("origin") !== SITE)
      return reply({ ok: false, error: "Origen no permitido" }, 403);
    if (url.pathname === "/api/prode/health" && request.method === "GET")
      return reply({ ok: true, service: "prode-lna", stage: "profiles", authEnabled: true });
    // Confirmación liviana para mostrar el acceso administrativo dentro de la PWA.
    // No devuelve estadísticas ni información de otros usuarios.
    if (url.pathname === "/api/prode/admin/access" && request.method === "GET") {
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión requerida" }, 401);
      if (!env.ADMIN_FIREBASE_UID || identity.uid !== env.ADMIN_FIREBASE_UID)
        return reply({ ok: false, error: "Sin permiso" }, 403);
      return reply({ ok: true, admin: true });
    }
    if (url.pathname === "/api/prode/admin/summary" && request.method === "GET") {
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Sesión requerida" }, 401);
      if (!env.ADMIN_FIREBASE_UID || identity.uid !== env.ADMIN_FIREBASE_UID)
        return reply({ ok: false, error: "Sin permiso" }, 403);
      if (!env.DB) return reply({ ok: false, error: "Base de datos no disponible" }, 503);
      try {
        const reports = await env.DB.batch([
          env.DB.prepare("SELECT COUNT(*) AS total FROM prode_users"),
          env.DB.prepare("SELECT COUNT(*) AS total FROM prode_career_links"),
          env.DB.prepare("SELECT COUNT(*) AS total FROM prode_groups"),
          env.DB.prepare("SELECT COUNT(*) AS total FROM prode_users WHERE datetime(created_at) >= datetime('now','-7 days')"),
          env.DB.prepare("SELECT COUNT(*) AS total FROM prode_users WHERE datetime(created_at) >= datetime('now','-30 days')"),
          env.DB.prepare("SELECT COUNT(*) AS total FROM prode_memberships"),
          env.DB.prepare("SELECT date(created_at) AS day,COUNT(*) AS total FROM prode_users WHERE datetime(created_at) >= datetime('now','-6 days') GROUP BY date(created_at) ORDER BY day")
        ]);
        const total = index => Number(reports[index]?.results?.[0]?.total || 0);
        return reply({ ok: true, generatedAt: new Date().toISOString(),
          accounts: total(0), linkedCareers: total(1), leagues: total(2),
          new7Days: total(3), new30Days: total(4), memberships: total(5),
          daily: reports[6]?.results || [] });
      } catch {
        return reply({ ok: false, error: "Métricas no disponibles" }, 503);
      }
    }
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
        await ensureCrests(env.DB);
        const user = await env.DB.prepare(
          "SELECT u.id, n.username, u.display_name AS googleName, u.created_at, COALESCE(c.primary_color,\'#7de83d\') AS crestPrimary, COALESCE(c.secondary_color,\'#10283c\') AS crestSecondary FROM prode_users u LEFT JOIN prode_usernames n ON n.user_id = u.id LEFT JOIN prode_user_crests c ON c.user_id=u.id WHERE u.auth_subject = ?"
        ).bind(identity.uid).first();
        if (user) {
          const crestText = await env.DB.prepare("SELECT color FROM prode_crest_texts WHERE kind=? AND entity_id=?").bind("user",user.id).first();
          user.crestText = crestText?.color || "#ffffff";
          const styleRow = await env.DB.prepare("SELECT style FROM prode_user_crest_styles WHERE user_id=?").bind(user.id).first();
          user.crestStyle = styleRow?.style || "pro";
          const fontRow = await env.DB.prepare("SELECT font FROM prode_user_crest_fonts WHERE user_id=?").bind(user.id).first();
          user.crestFont = fontRow?.font || "sport";
          const symbolRow = await env.DB.prepare("SELECT symbol FROM prode_user_crest_symbols WHERE user_id=?").bind(user.id).first();
          user.crestSymbol = symbolRow?.symbol || ({elite:"eagle",pro:"ball",legend:"torch"})[user.crestStyle] || "ball";
        }
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
    if (url.pathname === "/api/prode/profile/crest" && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const body = await request.json();
        if (!validCrest(body.primary) || !validCrest(body.secondary) || !validCrest(body.textColor || "#ffffff")) return reply({ ok: false, error: "Colores inválidos" }, 400);
        if (body.style != null && !["pro","elite","legend"].includes(body.style)) return reply({ok:false,error:"Modelo inválido"},400);
        if (body.font != null && !["sport","college","gamer"].includes(body.font)) return reply({ok:false,error:"Tipografía inválida"},400);
        const allowedSymbols = ["eagle","lion","wolf","tiger","bear","shark","ball","hoop","jersey","court","torch","bolt","shield","diamond","storm","trident"];
        if (body.symbol != null && !allowedSymbols.includes(body.symbol)) return reply({ok:false,error:"Diseño inválido"},400);
        const userId = "firebase:" + identity.uid;
        await ensureCrests(env.DB);
        if (!(await env.DB.prepare("SELECT id FROM prode_users WHERE id=?").bind(userId).first())) return reply({ ok: false, error: "Primero registrá tu perfil" }, 409);
        await env.DB.prepare("INSERT INTO prode_user_crests(user_id,primary_color,secondary_color) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET primary_color=excluded.primary_color,secondary_color=excluded.secondary_color").bind(userId,body.primary,body.secondary).run();
        await env.DB.prepare("INSERT INTO prode_crest_texts(kind,entity_id,color) VALUES ('user',?,?) ON CONFLICT(kind,entity_id) DO UPDATE SET color=excluded.color").bind(userId,body.textColor || "#ffffff").run();
        await env.DB.prepare("INSERT INTO prode_user_crest_styles(user_id,style) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET style=excluded.style").bind(userId,body.style || "pro").run();
        await env.DB.prepare("INSERT INTO prode_user_crest_fonts(user_id,font) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET font=excluded.font").bind(userId,body.font || "sport").run();
        const symbol = body.symbol || ({elite:"eagle",pro:"ball",legend:"torch"})[body.style] || "ball";
        await env.DB.prepare("INSERT INTO prode_user_crest_symbols(user_id,symbol) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET symbol=excluded.symbol").bind(userId,symbol).run();
        return reply({ ok: true, crestPrimary: body.primary, crestSecondary: body.secondary, crestText: body.textColor || "#ffffff", crestStyle: body.style || "pro", crestFont: body.font || "sport", crestSymbol: symbol });
      } catch { return reply({ ok: false, error: "No se pudo guardar el escudo" }, 503); }
    }
    const crestRoute = new RegExp("^/api/prode/groups/([0-9a-f-]{36})/crest$").exec(url.pathname);
    if (crestRoute && request.method === "POST") {
      if (!env.DB) return reply({ ok: false, error: "Base de datos no configurada" }, 503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ ok: false, error: "Iniciá sesión con Google" }, 401);
      try {
        const body = await request.json();
        if (!validCrest(body.primary) || !validCrest(body.secondary) || !validCrest(body.textColor || "#ffffff")) return reply({ ok: false, error: "Colores inválidos" }, 400);
        const groupId = crestRoute[1];
        if (!(await env.DB.prepare("SELECT id FROM prode_groups WHERE id=? AND owner_id=?").bind(groupId,"firebase:"+identity.uid).first())) return reply({ ok: false, error: "Solo el administrador puede editar el trofeo" }, 403);
        await ensureCrests(env.DB);
        await env.DB.prepare("INSERT INTO prode_group_crests(group_id,primary_color,secondary_color) VALUES (?,?,?) ON CONFLICT(group_id) DO UPDATE SET primary_color=excluded.primary_color,secondary_color=excluded.secondary_color").bind(groupId,body.primary,body.secondary).run();
        await env.DB.prepare("INSERT INTO prode_crest_texts(kind,entity_id,color) VALUES ('league',?,?) ON CONFLICT(kind,entity_id) DO UPDATE SET color=excluded.color").bind(groupId,body.textColor || "#ffffff").run();
        return reply({ ok: true, crestPrimary: body.primary, crestSecondary: body.secondary, crestText: body.textColor || "#ffffff" });
      } catch { return reply({ ok: false, error: "No se pudo guardar el trofeo" }, 503); }
    }
    // Clasificación histórica: consulta en vivo los puntos de Mi Carrera de las cuentas vinculadas.
    if (url.pathname === "/api/prode/ranking/historical" && request.method === "GET") {
      const viewer = await verifiedFirebaseUser(request);
      const viewerId = viewer ? "firebase:" + viewer.uid : null;
      if (!env.DB || !env.VOTACIONES) return reply({ ok: false, error: "Ranking no disponible" }, 503);
      try {
        await ensureCrests(env.DB);
        await ensureVoteSources(env.DB);
        await ensureCareerLinks(env.DB);
        const rows = await env.DB.prepare("SELECT u.id AS user_id, COALESCE(l.visitor_id,vs.visitor_id) AS visitor_id, COALESCE(NULLIF(TRIM(n.username),''),NULLIF(TRIM(u.display_name),''),'Jugador sin alias') AS username, COALESCE(c.primary_color,'#7de83d') AS crestPrimary, COALESCE(c.secondary_color,'#10283c') AS crestSecondary, COALESCE((SELECT color FROM prode_crest_texts WHERE kind='user' AND entity_id=u.id),'#ffffff') AS crestText, COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=u.id),'pro') AS crestStyle, COALESCE((SELECT font FROM prode_user_crest_fonts WHERE user_id=u.id),'sport') AS crestFont, COALESCE((SELECT symbol FROM prode_user_crest_symbols WHERE user_id=u.id), CASE COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=u.id),'pro') WHEN 'elite' THEN 'eagle' WHEN 'legend' THEN 'torch' ELSE 'ball' END) AS crestSymbol FROM prode_users u LEFT JOIN prode_career_links l ON l.user_id=u.id LEFT JOIN prode_vote_sources vs ON vs.user_id=u.id LEFT JOIN prode_usernames n ON n.user_id = u.id LEFT JOIN prode_user_crests c ON c.user_id=u.id WHERE COALESCE(l.visitor_id,vs.visitor_id) IS NOT NULL ORDER BY u.created_at ASC LIMIT 100").all();
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
              return { userId: item.user_id, username: item.username, points: data.points, crestPrimary: item.crestPrimary, crestSecondary: item.crestSecondary, crestText: item.crestText, crestStyle: item.crestStyle, crestFont: item.crestFont, crestSymbol: item.crestSymbol };
            } catch { return null; }
          }));
          results.push(...batch.filter(Boolean));
        }
        results.sort((a,b) => b.points-a.points || a.username.localeCompare(b.username, "es"));
        const ranked = results.map((entry,index) => ({
          ...entry, position: results.findIndex(x => x.points === entry.points) + 1
        }));
        const myPosition = viewerId ? ranked.find(entry => entry.userId === viewerId)?.position ?? null : null;
        // Solo un integrante de una liga puede consultar los puntos históricos
        // y la posición global de otro integrante de esa misma liga.
        let memberProfile = null;
        const groupId = url.searchParams.get("groupId");
        const memberId = url.searchParams.get("memberId");
        if (groupId && memberId && /^[0-9a-f-]{36}$/i.test(groupId)
            && /^firebase:[A-Za-z0-9_-]{1,128}$/.test(memberId) && viewerId) {
          await ensureMembershipPeriods(env.DB);
          const membership = await env.DB.prepare(
            "SELECT 1 AS permitted FROM prode_memberships viewer JOIN prode_memberships target ON target.group_id=viewer.group_id AND target.user_id=? WHERE viewer.group_id=? AND viewer.user_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=viewer.group_id AND p.user_id=viewer.user_id AND p.exited_at IS NULL) AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=target.group_id AND p.user_id=target.user_id AND p.exited_at IS NULL)"
          ).bind(memberId, groupId, viewerId).first();
          if (membership) {
            const row = ranked.find(entry => entry.userId === memberId);
            memberProfile = row ? { points: row.points, position: row.position } : null;
          }
        }
        return reply({ ok: true, total: results.length, myPosition, memberProfile,
          ranking: ranked.slice(0,20).map(({userId,...entry}) => entry) });
      } catch (error) {
        return reply({ ok: false, error: "No se pudo cargar el ranking histórico" }, 503);
      }
    }
    // Ranking general semanal: puntos de Mi Carrera obtenidos en partidos iniciados
    // entre el lunes y el domingo en Argentina, independientemente de las ligas privadas.
    if (url.pathname === "/api/prode/ranking/weekly" && request.method === "GET") {
      const viewer = await verifiedFirebaseUser(request);
      const viewerId = viewer ? "firebase:" + viewer.uid : null;
      if (!env.DB || !env.VOTACIONES) return reply({ ok: false, error: "Ranking no disponible" }, 503);
      try {
        await ensureCrests(env.DB);
        await ensureVoteSources(env.DB);
        await ensureCareerLinks(env.DB);
        const rows = await env.DB.prepare("SELECT u.id AS user_id, COALESCE(l.visitor_id,vs.visitor_id) AS visitor_id, COALESCE(NULLIF(TRIM(n.username),''),NULLIF(TRIM(u.display_name),''),'Jugador sin alias') AS username, COALESCE(c.primary_color,'#7de83d') AS crestPrimary, COALESCE(c.secondary_color,'#10283c') AS crestSecondary, COALESCE((SELECT color FROM prode_crest_texts WHERE kind='user' AND entity_id=u.id),'#ffffff') AS crestText, COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=u.id),'pro') AS crestStyle, COALESCE((SELECT font FROM prode_user_crest_fonts WHERE user_id=u.id),'sport') AS crestFont, COALESCE((SELECT symbol FROM prode_user_crest_symbols WHERE user_id=u.id), CASE COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=u.id),'pro') WHEN 'elite' THEN 'eagle' WHEN 'legend' THEN 'torch' ELSE 'ball' END) AS crestSymbol FROM prode_users u LEFT JOIN prode_career_links l ON l.user_id=u.id LEFT JOIN prode_vote_sources vs ON vs.user_id=u.id LEFT JOIN prode_usernames n ON n.user_id=u.id LEFT JOIN prode_user_crests c ON c.user_id=u.id WHERE COALESCE(l.visitor_id,vs.visitor_id) IS NOT NULL ORDER BY u.created_at ASC LIMIT 100").all();
        const dayKey = value => {
          const parts = new Intl.DateTimeFormat("en-US",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
          const n = type => Number(parts.find(p => p.type === type)?.value);
          return Date.UTC(n("year"),n("month")-1,n("day"));
        };
        const startOfWeek = day => day - ((new Date(day).getUTCDay()+6)%7)*86400000;
        const thisWeek = startOfWeek(dayKey(Date.now()));
        const all = [];
        const linked = rows.results || [];
        for (let i=0;i<linked.length;i+=6) {
          const batch = await Promise.all(linked.slice(i,i+6).map(async item => {
            const response = await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev/api/prode-results?visitanteId="+encodeURIComponent(item.visitor_id));
            if (!response.ok) throw Error("Votaciones no disponibles");
            const data = await response.json();
            if (!data.ok || !Array.isArray(data.games)) throw Error("Historial no disponible");
            let streak=0, points=0, played=0, correct=0, wrong=0, mvpHits=0, mvpVoted=0;
            const ordered = [...data.games].sort(compareUserStreakGames);
            for (const game of ordered) {
              const ts = Date.parse(game.startsAt);
              if (!Number.isFinite(ts) || ts>Date.now() || !game.finished) continue;
              const week = startOfWeek(dayKey(ts));
              if (game.mvpCorrect && week===thisWeek) { points+=20; mvpHits++; }
              if (game.mvpVoted && week===thisWeek) mvpVoted++;
              if (!game.voted) { streak=0; continue; }
              if (week===thisWeek) played++;
              if (game.correct) {
                streak++;
                if (week===thisWeek) { points+=15; correct++; if (streak===5) points+=45; }
              } else {
                streak=0;
                if (week===thisWeek) { points+=5; wrong++; }
              }
            }
            return { userId:item.user_id,username:item.username,crestPrimary:item.crestPrimary,crestSecondary:item.crestSecondary,crestText:item.crestText,crestStyle:item.crestStyle,crestFont:item.crestFont, crestSymbol: item.crestSymbol,points,played,correct,wrong,mvpHits,participated: played>0||mvpVoted>0 };
          }));
          all.push(...batch);
        }
        all.sort((a,b)=>b.points-a.points || a.username.localeCompare(b.username,"es"));
        let rank=0,previous=null;
        const ranking=all.map(row=>{
          if (!row.participated) return {...row,position:null};
          if (row.points!==previous) {rank++;previous=row.points;}
          return {...row,position:rank};
        });
        const myPosition = viewerId ? ranking.find(row => row.userId === viewerId)?.position ?? null : null;
        return reply({ok:true,weekStartsAt:new Date(thisWeek).toISOString(),total:all.length,myPosition,
          ranking:ranking.slice(0,20).map(({userId,...row})=>row)});
      } catch (error) {
        console.error("Prode weekly ranking:",error);
        return reply({ok:false,error:"No se pudo calcular el ranking semanal"},503);
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
        await ensureVoteSources(env.DB);
        const voteOwner = await env.DB.prepare("SELECT user_id FROM prode_vote_sources WHERE visitor_id=?").bind(visitorId).first();
        if (voteOwner && voteOwner.user_id !== userId)
          return reply({ ok: false, error: "Esta carrera ya está asociada a los pronósticos de otra cuenta Prode" }, 409);
        await env.DB.prepare("INSERT INTO prode_career_links (user_id, visitor_id) VALUES (?, ?)").bind(userId, visitorId).run();
        return reply({ ok: true, linked: true });
      } catch (error) {
        if (String(error).includes("UNIQUE")) return reply({ ok: false, error: "Esta carrera ya está vinculada a otra cuenta Prode" }, 409);
        return reply({ ok: false, error: "No se pudo vincular Mi Carrera" }, 503);
      }
    }
    // Inicializa una sola carrera persistente por cuenta Google.
    if (url.pathname === "/api/prode/career/initialize" && request.method === "POST") {
      if (!env.DB || !env.VOTACIONES) return reply({ok:false,error:"Servicio no disponible"},503);
      const identity=await verifiedFirebaseUser(request);
      if (!identity) return reply({ok:false,error:"Iniciá sesión con Google"},401);
      const userId="firebase:"+identity.uid;
      const input=await request.json().catch(()=>({}));
      const localId=typeof input.visitorId==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.visitorId)?input.visitorId:null;
      try {
        await ensureCareerLinks(env.DB);
        await env.DB.prepare("INSERT INTO prode_users(id,auth_subject,display_name) VALUES (?,?,?) ON CONFLICT(auth_subject) DO NOTHING").bind(userId,identity.uid,identity.name.trim().slice(0,32)||"Usuario LNA").run();
        await ensureVoteSources(env.DB);
        const existing=await env.DB.prepare("SELECT visitor_id FROM prode_career_links WHERE user_id=?").bind(userId).first();
        if(existing?.visitor_id) return reply({ok:true,ready:true,existing:true});
        const source=await env.DB.prepare("SELECT visitor_id FROM prode_vote_sources WHERE user_id=?").bind(userId).first();
        let candidate=source?.visitor_id||localId||crypto.randomUUID();
        const otherCareer=await env.DB.prepare("SELECT user_id FROM prode_career_links WHERE visitor_id=? AND user_id<>?").bind(candidate,userId).first();
        const otherSource=await env.DB.prepare("SELECT user_id FROM prode_vote_sources WHERE visitor_id=? AND user_id<>?").bind(candidate,userId).first();
        if(otherCareer||otherSource){
          if(source?.visitor_id) return reply({ok:false,error:"El historial está asociado a otra cuenta"},409);
          candidate=crypto.randomUUID();
        }
        const verify=await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev/api/puntos?visitanteId="+encodeURIComponent(candidate));
        if(!verify.ok || !(await verify.json()).ok) throw Error("Carrera no disponible");
        await env.DB.prepare("INSERT OR IGNORE INTO prode_career_links(user_id,visitor_id) VALUES (?,?)").bind(userId,candidate).run();
        const linked=await env.DB.prepare("SELECT visitor_id FROM prode_career_links WHERE user_id=?").bind(userId).first();
        if(!linked) throw Error("Carrera no vinculada");
        return reply({ok:true,ready:true,existing:false});
      }catch(error){console.error("Career initialize",error);return reply({ok:false,error:"No se pudo preparar Mi Carrera"},503);}
    }
    if(url.pathname==="/api/prode/career/data" && request.method==="GET"){
      if(!env.DB||!env.VOTACIONES) return reply({ok:false,error:"Servicio no disponible"},503);
      const identity=await verifiedFirebaseUser(request);
      if(!identity) return reply({ok:false,error:"Iniciá sesión con Google"},401);
      const kind=url.searchParams.get("kind");
      if(!["points","predictions"].includes(kind)) return reply({ok:false,error:"Consulta inválida"},400);
      try{
        await ensureCareerLinks(env.DB);
        const linked=await env.DB.prepare("SELECT visitor_id FROM prode_career_links WHERE user_id=?").bind("firebase:"+identity.uid).first();
        if(!linked?.visitor_id) return reply({ok:false,error:"Mi Carrera todavía no está preparada"},409);
        const endpoint=kind==="points"?"/api/puntos":"/api/mis-pronosticos";
        const response=await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev"+endpoint+"?visitanteId="+encodeURIComponent(linked.visitor_id));
        return reply(await response.json(),response.status);
      }catch(error){console.error("Career data",error);return reply({ok:false,error:"No se pudo consultar Mi Carrera"},503);}
    }
    // Camiseta de Mi Carrera guardada por cuenta Google (sin depender del dispositivo).
    if(url.pathname==="/api/prode/career/jersey" && ["GET","POST"].includes(request.method)){
      if(!env.DB) return reply({ok:false,error:"Base de datos no disponible"},503);
      const identity=await verifiedFirebaseUser(request);
      if(!identity) return reply({ok:false,error:"Iniciá sesión con Google"},401);
      const userId="firebase:"+identity.uid;
      try{
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_career_jerseys(user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE, name TEXT NOT NULL, number TEXT NOT NULL)").run();
        if(request.method==="POST"){
          const body=await request.json().catch(()=>({}));
          const name=typeof body.name==="string"?body.name.trim().replace(/\s+/g," "):"";
          const number=typeof body.number==="string"?body.number:"";
          if(!name||name.length>24||!/^(?:[0-9]|[1-9][0-9])$/.test(number))
            return reply({ok:false,error:"Nombre o dorsal inválido"},400);
          await env.DB.prepare("INSERT INTO prode_career_jerseys(user_id,name,number) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, number=excluded.number").bind(userId,name,number).run();
        }
        const jersey=await env.DB.prepare("SELECT name,number FROM prode_career_jerseys WHERE user_id=?").bind(userId).first();
        return reply({ok:true,jersey:jersey||null});
      }catch(error){console.error("Career jersey",error);return reply({ok:false,error:"No se pudo guardar el jugador"},503);}
    }
    // Pronósticos autenticados: un único historial por cuenta Google en todos
    // los dispositivos, sin exponer el ID interno de votaciones al navegador.
    if (url.pathname === "/api/prode/ballot" && ["GET","POST"].includes(request.method)) {
      if (!env.DB || !env.VOTACIONES) return reply({ok:false,error:"Votaciones no disponibles"},503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ok:false,error:"Iniciá sesión en Prode"},401);
      const userId = "firebase:" + identity.uid;
      const body = request.method === "POST" ? await request.json().catch(() => ({})) : null;
      const partidoId = request.method === "POST" ? body?.partidoId : url.searchParams.get("partidoId");
      const kind = request.method === "POST" ? body?.kind : url.searchParams.get("kind");
      if (typeof partidoId !== "string" || partidoId.length > 120 || !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(partidoId) ||
          !["winner","mvp"].includes(kind)) return reply({ok:false,error:"Partido o pronóstico inválido"},400);
      if (request.method === "POST") {
        if (kind === "winner" && (typeof body?.equipoVotado !== "string" || body.equipoVotado.length > 90))
          return reply({ok:false,error:"Equipo inválido"},400);
        if (kind === "mvp" && (typeof body?.jugadorId !== "string" || body.jugadorId.length > 120))
          return reply({ok:false,error:"Jugador inválido"},400);
      }
      try {
        await ensureCareerLinks(env.DB);
        await env.DB.prepare("INSERT INTO prode_users(id,auth_subject,display_name) VALUES (?,?,?) ON CONFLICT(auth_subject) DO NOTHING").bind(userId,identity.uid,identity.name.trim().slice(0,32)||"Usuario LNA").run();
        await ensureVoteSources(env.DB);
        const [career,source] = await Promise.all([
          env.DB.prepare("SELECT visitor_id FROM prode_career_links WHERE user_id=?").bind(userId).first(),
          env.DB.prepare("SELECT visitor_id FROM prode_vote_sources WHERE user_id=?").bind(userId).first(),
        ]);
        let visitorId = career?.visitor_id || source?.visitor_id;
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          try {
            await env.DB.prepare("INSERT INTO prode_vote_sources(user_id,visitor_id) VALUES (?,?)").bind(userId,visitorId).run();
          } catch {
            const concurrent = await env.DB.prepare("SELECT visitor_id FROM prode_vote_sources WHERE user_id=?").bind(userId).first();
            if (!concurrent?.visitor_id) throw Error("No se pudo preparar el perfil de votación");
            visitorId = concurrent.visitor_id;
          }
        }
        const target = kind === "winner" ? "/api/votos" : "/api/mvp";
        const params = request.method === "GET"
          ? "?partidoId=" + encodeURIComponent(partidoId) + "&visitanteId=" + encodeURIComponent(visitorId)
          : "";
        const upstream = await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev" + target + params, {
          method: request.method,
          headers: { "Origin": SITE, "Content-Type": "application/json", "Authorization": request.headers.get("Authorization") || "" },
          ...(request.method === "POST" ? { body: JSON.stringify({
            partidoId, visitanteId:visitorId,
            ...(kind === "winner" ? {equipoVotado:body.equipoVotado} : {jugadorId:body.jugadorId}),
          }) } : {}),
        });
        const payload = await upstream.json();
        return reply(payload,upstream.status);
      } catch (error) {
        console.error("Prode authenticated ballot:",error);
        return reply({ok:false,error:"No se pudo consultar el pronóstico"},503);
      }
    }
    // Prode usa los votos de este navegador aunque Mi Carrera no esté vinculada.
    // Un visitante solo puede pertenecer a una cuenta Prode.
    if (url.pathname === "/api/prode/vote-source" && request.method === "POST") {
      if (!env.DB) return reply({ok:false,error:"Base de datos no disponible"},503);
      const identity = await verifiedFirebaseUser(request);
      if (!identity) return reply({ok:false,error:"Iniciá sesión con Google"},401);
      const userId = "firebase:" + identity.uid;
      const body = await request.json().catch(() => ({}));
      const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId))
        return reply({ok:false,error:"Identificador de votaciones inválido"},400);
      try {
        await ensureCareerLinks(env.DB);
        const profile = await env.DB.prepare("SELECT id FROM prode_users WHERE id=?").bind(userId).first();
        if (!profile) return reply({ok:false,error:"Primero registrá tu perfil Prode"},409);
        await ensureVoteSources(env.DB);
        const [careerOwner,sourceOwner,existing] = await Promise.all([
          env.DB.prepare("SELECT user_id FROM prode_career_links WHERE visitor_id=?").bind(visitorId).first(),
          env.DB.prepare("SELECT user_id FROM prode_vote_sources WHERE visitor_id=?").bind(visitorId).first(),
          env.DB.prepare("SELECT visitor_id FROM prode_vote_sources WHERE user_id=?").bind(userId).first(),
        ]);
        if ((careerOwner && careerOwner.user_id !== userId) || (sourceOwner && sourceOwner.user_id !== userId))
          return reply({ok:false,error:"Esta identidad de votaciones pertenece a otra cuenta"},409);
        if (existing && existing.visitor_id !== visitorId)
          return reply({ok:true,registered:true,alreadyAssociated:true});
        await env.DB.prepare("INSERT OR IGNORE INTO prode_vote_sources(user_id,visitor_id) VALUES (?,?)").bind(userId,visitorId).run();
        return reply({ok:true,registered:true});
      } catch (error) {
        console.error("Prode vote source:",error);
        return reply({ok:false,error:"No se pudo asociar la votación con Prode"},503);
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
        const visibility = "private";
        if (name.length < 3 || name.length > 60 || description.length > 240 || body.visibility === "public")
          return reply({ ok: false, error: "Revisá el nombre, la descripción y la privacidad" }, 400);
        const ownerId = "firebase:" + identity.uid;
        const owner = await env.DB.prepare("SELECT id FROM prode_users WHERE auth_subject = ?").bind(identity.uid).first();
        if (!owner) return reply({ ok: false, error: "Primero registrá tu perfil Prode" }, 409);
        const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM prode_groups WHERE owner_id = ?").bind(ownerId).first();
        if (Number(count?.total || 0) >= 5) return reply({ ok: false, error: "Podés crear hasta cinco ligas" }, 409);
        const id = crypto.randomUUID();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS prode_league_starts (group_id TEXT PRIMARY KEY REFERENCES prode_groups(id) ON DELETE CASCADE, starts_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
        await ensureMembershipPeriods(env.DB);
        await ensureCrests(env.DB);
        const crestPrimary = validCrest(body.crestPrimary) ? body.crestPrimary : "#ff9a39";
        const crestSecondary = validCrest(body.crestSecondary) ? body.crestSecondary : "#10283c";
        await env.DB.batch([
          env.DB.prepare("INSERT INTO prode_groups (id, name, description, visibility, owner_id) VALUES (?, ?, ?, ?, ?)").bind(id, name, description, visibility, ownerId),
          env.DB.prepare("INSERT INTO prode_memberships (group_id, user_id, role) VALUES (?, ?, 'owner')").bind(id, ownerId),
          env.DB.prepare("INSERT INTO prode_group_crests(group_id,primary_color,secondary_color) VALUES (?,?,?)").bind(id,crestPrimary,crestSecondary),
          env.DB.prepare("INSERT INTO prode_membership_periods(group_id,user_id,entered_at) VALUES (?,?,?)").bind(id,ownerId,new Date().toISOString()),
          env.DB.prepare("INSERT INTO prode_league_starts(group_id) VALUES (?)").bind(id),
        ]);
        return reply({ ok: true, group: { id, name, description, visibility, crestPrimary, crestSecondary, season: "2026/27", role: "owner" } }, 201);
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
        await ensureCrests(env.DB);
        const groups = await env.DB.prepare(
          "SELECT g.id, g.name, g.description, g.visibility, g.season, g.created_at, m.role, COALESCE(c.primary_color,'#ff9a39') AS crestPrimary, COALESCE(c.secondary_color,'#10283c') AS crestSecondary FROM prode_groups g JOIN prode_memberships m ON m.group_id = g.id LEFT JOIN prode_group_crests c ON c.group_id=g.id WHERE m.user_id = ? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL) ORDER BY g.created_at DESC LIMIT 50"
        ).bind("firebase:" + identity.uid).all();
        return reply({ ok: true, groups: groups.results || [] });
      } catch {
        return reply({ ok: false, error: "No se pudieron cargar tus ligas" }, 503);
      }
    }
    // No existen ligas públicas: se mantiene la ruta antigua por compatibilidad.
    if (url.pathname === "/api/prode/groups/public" && request.method === "GET") return reply({ ok: true, groups: [] });
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
    // Vista previa pública mínima: solo el nombre y los colores de la liga
    // para quien ya posee el enlace secreto de invitación.
    if (url.pathname === "/api/prode/invitations/preview" && request.method === "GET") {
      if (!env.DB) return reply({ ok:false, error:"No disponible" },503);
      const token = url.searchParams.get("token") || "";
      if (!/^[a-f0-9]{64}$/i.test(token)) return reply({ok:false,error:"Invitación inválida"},400);
      try {
        const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token.toLowerCase()));
        const hash = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
        await ensureCrests(env.DB);
        const row = await env.DB.prepare(
          "SELECT g.name,g.season,COALESCE(c.primary_color,'#ff9a39') AS crestPrimary,COALESCE(c.secondary_color,'#10283c') AS crestSecondary FROM prode_invitations i JOIN prode_groups g ON g.id=i.group_id LEFT JOIN prode_group_crests c ON c.group_id=g.id WHERE i.token_hash=? AND i.revoked_at IS NULL AND i.expires_at>? AND i.used_count<i.max_uses"
        ).bind(hash,new Date().toISOString()).first();
        if (!row) return reply({ok:false,error:"La invitación venció o ya no está disponible"},404);
        return reply({ok:true,league:{name:row.name,season:row.season||"2026/27",crestPrimary:row.crestPrimary,crestSecondary:row.crestSecondary}});
      } catch {return reply({ok:false,error:"No se pudo verificar la invitación"},503);}
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
        await ensureCrests(env.DB);
        await ensureVoteSources(env.DB);
        await ensureCareerLinks(env.DB);
        const members = await env.DB.prepare(
          "SELECT m.user_id, m.joined_at, COALESCE(NULLIF(TRIM(n.username),''),NULLIF(TRIM(u.display_name),''),'Jugador sin alias') AS username, COALESCE(l.visitor_id,vs.visitor_id) AS visitor_id, COALESCE(c.primary_color,'#7de83d') AS crestPrimary, COALESCE(c.secondary_color,'#10283c') AS crestSecondary, COALESCE((SELECT color FROM prode_crest_texts WHERE kind='user' AND entity_id=m.user_id),'#ffffff') AS crestText, COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=m.user_id),'pro') AS crestStyle, COALESCE((SELECT font FROM prode_user_crest_fonts WHERE user_id=m.user_id),'sport') AS crestFont, COALESCE((SELECT symbol FROM prode_user_crest_symbols WHERE user_id=m.user_id), CASE COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=m.user_id),'pro') WHEN 'elite' THEN 'eagle' WHEN 'legend' THEN 'torch' ELSE 'ball' END) AS crestSymbol FROM prode_memberships m JOIN prode_users u ON u.id=m.user_id LEFT JOIN prode_usernames n ON n.user_id=m.user_id LEFT JOIN prode_career_links l ON l.user_id=m.user_id LEFT JOIN prode_vote_sources vs ON vs.user_id=m.user_id LEFT JOIN prode_user_crests c ON c.user_id=m.user_id WHERE m.group_id=? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL) ORDER BY m.joined_at ASC LIMIT 200"
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
        const completedMatches = new Map();
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
            const base = { username: member.username, userId: member.user_id, crestPrimary: member.crestPrimary, crestSecondary: member.crestSecondary, crestText: member.crestText, crestStyle: member.crestStyle, crestFont: member.crestFont, crestSymbol: member.crestSymbol, points: initialPoints.get(member.user_id) || 0, initialPoints: initialPoints.get(member.user_id) ?? null, joinedLate: time(member.joined_at) > leagueStart, correct: 0, wrong: 0, played: 0, mvpHits: 0, mvpVotes: 0, currentStreak: 0, weeks: {}, weekly: { points: 0, correct: 0, wrong: 0, mvpHits: 0, mvpVoted: 0, played: 0 } };
            if (!member.visitor_id) return base;
            const response = await env.VOTACIONES.fetch("https://lna-votaciones-api.lnab.workers.dev/api/prode-results?visitanteId=" + encodeURIComponent(member.visitor_id));
            if (!response.ok) throw Error("Servicio de votaciones no disponible");
            const data = await response.json();
            if (!data.ok || !Array.isArray(data.games)) throw Error("Historial de votaciones no disponible");
            const since = Math.max(leagueStart, time(member.joined_at));
            const periods = periodsByUser.get(member.user_id) || [];
            let streak = 0, lastPeriod = -1;
            const chronologicalGames = [...data.games].sort(compareUserStreakGames);
            for (const game of chronologicalGames) {
              const kickoff = Date.parse(game.startsAt);
              if (!Number.isFinite(kickoff) || kickoff < since || !game.finished || kickoff > Date.now()) continue;
              const periodIndex = periods.findIndex(p => kickoff >= p.start && kickoff < p.end);
              if (periodIndex < 0) continue; // No se suman partidos disputados durante la ausencia.
              if (lastPeriod !== periodIndex) { streak = 0; lastPeriod = periodIndex; }
              const gameWeek = mondayOf(argentinaDateKey(kickoff));
              // Los partidos jugados se agrupan por la fecha de inicio argentina;
              // nunca se incluyen predicciones de partidos sin resultado oficial.
              if (game.homeTeam && game.awayTeam && Number.isFinite(game.homeScore) && Number.isFinite(game.awayScore)) {
                if (!completedMatches.has(game.id)) completedMatches.set(game.id, {
                  id: game.id, startsAt: game.startsAt, finishedObservedAt: game.finishedObservedAt || null, weekKey: gameWeek,
                  homeTeam: game.homeTeam, awayTeam: game.awayTeam,
                  homeScore: game.homeScore, awayScore: game.awayScore,
                  winner: game.winner, mvpWinners: game.mvpWinners || [],
                  participants: [],
                });
              }
              const matchDetail = completedMatches.get(game.id);
              const pointsDetail = { userId: member.user_id, username: member.username,
                crestPrimary: member.crestPrimary, crestSecondary: member.crestSecondary,
                crestText: member.crestText, crestStyle: member.crestStyle, crestFont: member.crestFont, crestSymbol: member.crestSymbol, winnerPick: game.selectedWinner || null,
                mvpPick: game.selectedMvp || null,
                winnerPoints: 0, mvpPoints: 0, streakPoints: 0, points: 0,
                winnerCorrect: Boolean(game.correct), mvpCorrect: Boolean(game.mvpCorrect),
                eligible: true };
              const weekly = gameWeek === weekStart;
              const week = base.weeks[gameWeek] ||= { points: 0, correct: 0, wrong: 0, mvpHits: 0, played: 0, mvpVoted: 0 };
              if (game.mvpVoted) { week.mvpVoted++; base.mvpVotes++; if (weekly) base.weekly.mvpVoted++; }
              if (game.mvpCorrect) { pointsDetail.mvpPoints = 20; week.mvpHits++; week.points += 20; base.points += 20; base.mvpHits++; if (weekly) { base.weekly.points += 20; base.weekly.mvpHits++; } }
              if (!game.voted) { streak = 0; if (matchDetail) { pointsDetail.points = pointsDetail.mvpPoints; matchDetail.participants.push(pointsDetail); } continue; }
              base.played++; week.played++; if (weekly) base.weekly.played++;
              if (game.correct) {
                pointsDetail.winnerPoints = 15;
                base.correct++; base.points += 15; week.correct++; week.points += 15; streak++;
                if (weekly) { base.weekly.correct++; base.weekly.points += 15; }
                if (streak === 5) { pointsDetail.streakPoints = 45; base.points += 45; week.points += 45; if (weekly) base.weekly.points += 45; }
              } else {
                pointsDetail.winnerPoints = 5;
                base.wrong++; base.points += 5; week.wrong++; week.points += 5; streak = 0;
                if (weekly) { base.weekly.wrong++; base.weekly.points += 5; }
              }
              if (matchDetail) {
                pointsDetail.points = pointsDetail.winnerPoints + pointsDetail.mvpPoints + pointsDetail.streakPoints;
                matchDetail.participants.push(pointsDetail);
              }
            }
            base.currentStreak = streak;
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
          if (!row.weekly.played && !row.weekly.mvpVoted) return { ...row.weekly, userId: row.userId, username: row.username, crestPrimary: row.crestPrimary, crestSecondary: row.crestSecondary, crestText: row.crestText, crestStyle: row.crestStyle, crestFont: row.crestFont, crestSymbol: row.crestSymbol, position: null };
          if (pts !== previousWeekly) { weeklyRank++; previousWeekly = pts; }
          return { ...row.weekly, userId: row.userId, username: row.username, crestPrimary: row.crestPrimary, crestSecondary: row.crestSecondary, crestText: row.crestText, crestStyle: row.crestStyle, crestFont: row.crestFont, crestSymbol: row.crestSymbol, position: weeklyRank };
        });
        // Historial numerado desde la semana de inicio de la liga, incluyendo semanas sin partidos.
        const firstWeek = mondayOf(argentinaDateKey(leagueStart));
        const weeklyHistory = [];
        for (let startMs = firstWeek, number = 1; startMs <= weekStart && number <= 110; startMs += 7*86400000, number++) {
          const participants = rows.filter(row => argentinaDateKey(time(allMembers.find(m => m.user_id === row.userId)?.joined_at)) < startMs + 7*86400000).map(row => {
            const w = row.weeks[startMs] || { points: 0, correct: 0, wrong: 0, mvpHits: 0, played: 0, mvpVoted: 0 };
            return { username: row.username, userId: row.userId, crestPrimary: row.crestPrimary, crestSecondary: row.crestSecondary, crestText: row.crestText, crestStyle: row.crestStyle, crestFont: row.crestFont, crestSymbol: row.crestSymbol, points: w.points, correct: w.correct, wrong: w.wrong, mvpHits: w.mvpHits, played: w.played, participated: w.played > 0 || w.mvpVoted > 0 };
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
        const medals = new Map(rows.map(row => [row.userId, { userId: row.userId, username: row.username, crestPrimary: row.crestPrimary, crestSecondary: row.crestSecondary, crestText: row.crestText, crestStyle: row.crestStyle, crestFont: row.crestFont, crestSymbol: row.crestSymbol, gold: 0, silver: 0, bronze: 0, history: [] }]));
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
        // Vista semanal de partidos finalizados: únicamente la semana elegida en la UI.
        // Los votos se revelan solo a miembros autenticados de esta liga y tras finalizar.
        const matchesByWeek = {};
        for (const match of completedMatches.values()) {
          const number = Math.floor((match.weekKey - firstWeek) / (7 * 86400000)) + 1;
          if (number < 1 || number > 110) continue;
          const existing = new Map(match.participants.map(p => [p.userId, p]));
          const participants = allMembers.map(member => existing.get(member.user_id) || {
            userId: member.user_id, username: member.username,
            crestPrimary: member.crestPrimary, crestSecondary: member.crestSecondary,
            crestText: member.crestText, crestStyle: member.crestStyle, crestFont: member.crestFont, crestSymbol: member.crestSymbol, winnerPick: null, mvpPick: null,
            winnerPoints: 0, mvpPoints: 0, streakPoints: 0, points: 0,
            winnerCorrect: false, mvpCorrect: false, eligible: false,
          });
          (matchesByWeek[number] ||= []).push({ ...match, participants, weekKey: undefined });
        }
        for (const matches of Object.values(matchesByWeek)) {
          // La grilla es exactamente el inverso del orden en que se procesan las rachas.
          // Antes el desempate por id era ascendente en ambos sentidos: mostraba
          // Atenas–Gimnasia por delante de La Unión–Argentino aunque la racha
          // ya había procesado el encuentro de Argentino como el más reciente.
          matches.sort((a,b) => {
            const base = compareStreakGames(b,a);
            // La lista del usuario que la consulta refleja su propia racha.
            const mineA = a.participants.find(p => p.userId === userId);
            const mineB = b.participants.find(p => p.userId === userId);
            const tied = a.startsAt === b.startsAt && a.finishedObservedAt &&
              a.finishedObservedAt === b.finishedObservedAt;
            if (tied && mineA?.eligible && mineB?.eligible &&
                Boolean(mineA.winnerCorrect) !== Boolean(mineB.winnerCorrect))
              return mineA.winnerCorrect ? -1 : 1;
            return base;
          });
        }
        return reply({ ok: true, ranking, weeklyRanking, weeklyHistory, medalTable, matchesByWeek, canAssignInitialPoints: membership.role === "owner", weekStartsAt: new Date(weekStart).toISOString(), startedAt: start.starts_at });
      } catch (error) {
        console.error("Prode league ranking:", error);
        return reply({ ok: false, error: "No se pudo calcular la clasificación de esta liga" }, 503);
      }
    }
    // Gestión de liga: abandonar, expulsar o eliminar; solo miembros autorizados.
    const manageGroup = /^\/api\/prode\/groups\/([0-9a-f-]{36})\/(leave|members|delete|rename)$/.exec(url.pathname);
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
        if (action === "rename") {
          const body = await request.json().catch(() => ({}));
          const newName = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
          if (newName.length < 3 || newName.length > 60)
            return reply({ ok: false, error: "El nombre debe tener entre 3 y 60 caracteres" }, 400);
          await env.DB.prepare("UPDATE prode_groups SET name=? WHERE id=? AND owner_id=?").bind(newName,groupId,actorId).run();
          return reply({ ok: true, groupId, name:newName });
        }
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
        await ensureCrests(env.DB);
        const group = await env.DB.prepare(
          "SELECT g.id, g.name, g.description, g.visibility, g.season, g.created_at, m.role, COALESCE(c.primary_color,'#ff9a39') AS crestPrimary, COALESCE(c.secondary_color,'#10283c') AS crestSecondary FROM prode_groups g JOIN prode_memberships m ON m.group_id = g.id LEFT JOIN prode_group_crests c ON c.group_id=g.id WHERE g.id = ? AND m.user_id = ? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL)"
        ).bind(groupId, userId).first();
        if (!group) return reply({ ok: false, error: "Liga no encontrada o sin acceso" }, 404);
        const members = await env.DB.prepare(
          "SELECT m.user_id AS userId, COALESCE(NULLIF(TRIM(n.username),''),NULLIF(TRIM(u.display_name),''),'Jugador sin alias') AS username, m.role, m.joined_at, COALESCE(c.primary_color,'#7de83d') AS crestPrimary, COALESCE(c.secondary_color,'#10283c') AS crestSecondary, COALESCE((SELECT color FROM prode_crest_texts WHERE kind='user' AND entity_id=m.user_id),'#ffffff') AS crestText, COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=m.user_id),'pro') AS crestStyle, COALESCE((SELECT font FROM prode_user_crest_fonts WHERE user_id=m.user_id),'sport') AS crestFont, COALESCE((SELECT symbol FROM prode_user_crest_symbols WHERE user_id=m.user_id), CASE COALESCE((SELECT style FROM prode_user_crest_styles WHERE user_id=m.user_id),'pro') WHEN 'elite' THEN 'eagle' WHEN 'legend' THEN 'torch' ELSE 'ball' END) AS crestSymbol FROM prode_memberships m JOIN prode_users u ON u.id=m.user_id LEFT JOIN prode_usernames n ON n.user_id = m.user_id LEFT JOIN prode_user_crests c ON c.user_id=m.user_id WHERE m.group_id = ? AND EXISTS (SELECT 1 FROM prode_membership_periods p WHERE p.group_id=m.group_id AND p.user_id=m.user_id AND p.exited_at IS NULL) ORDER BY CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END, m.joined_at ASC LIMIT 200"
        ).bind(groupId).all();
        return reply({ ok: true, group, members: members.results || [] });
      } catch {
        return reply({ ok: false, error: "No se pudieron cargar los participantes" }, 503);
      }
    }
    return reply({ ok: false, error: "Ruta no encontrada" }, 404);
  },
};
