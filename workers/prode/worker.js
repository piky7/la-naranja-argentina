// Prode LNA API · Etapa 1. Worker independiente; no se publica hasta configurar D1 y autenticación.
// Ninguna ruta de escritura se habilita sin verificar identidad en el servidor.
const SITE = "https://lanaranjaargentina.com.ar";
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": SITE,
  "access-control-allow-methods": "GET, OPTIONS",
  "vary": "Origin",
};
const reply = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET") return reply({ ok: false, error: "Operación no habilitada" }, 405);
    if (url.pathname === "/api/prode/health") {
      return reply({ ok: true, service: "prode-lna", stage: "preparacion", authEnabled: false });
    }
    if (url.pathname === "/api/prode/groups/public") {
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
