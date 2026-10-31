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
          "SELECT id, display_name, created_at FROM prode_users WHERE auth_subject = ?"
        ).bind(identity.uid).first();
        return reply({ ok: true, user: user || null, linkedToMiCarrera: false });
      } catch {
        return reply({ ok: false, error: "No se pudo consultar el perfil" }, 503);
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
    return reply({ ok: false, error: "Ruta no encontrada" }, 404);
  },
};
