// Cloudflare Pages Function: tarjeta de invitación para WhatsApp y otras redes.
// En navegadores redirige a la pantalla de Prode sin cambiar el token.
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
export async function onRequestGet({request}) {
  const source = new URL(request.url);
  const token = source.searchParams.get("token") || "";
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return Response.redirect("https://lanaranjaargentina.com.ar/prode",302);
  }
  const destination = "https://lanaranjaargentina.com.ar/prode?invite="+encodeURIComponent(token);
  let name = "una Liga de Amigos";
  let season = "2026/27";
  try {
    const response = await fetch("https://lna-prode-api.lnab.workers.dev/api/prode/invitations/preview?token="+encodeURIComponent(token), {headers:{"Accept":"application/json"}});
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.league?.name) {
        name = data.league.name;
        season = data.league.season || season;
      }
    }
  } catch { /* Nunca bloquear el acceso al enlace si falla la vista previa. */ }
  const title = "Te invitaron a "+name+" | Prode LNA";
  const description = "¡Sumate a "+name+"! Pronosticá ganador y MVP, competí con tus amigos y subí en el ranking de Prode LNA · Temporada "+season+".";
  const html = `<!doctype html>
<html lang="es-AR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Prode LNA · La Naranja Argentina">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="https://lanaranjaargentina.com.ar/pwa-512.png">
<meta property="og:url" content="${escapeHtml(source.toString())}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<style>body{margin:0;background:#071a29;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}main{padding:28px;max-width:450px}h1{color:#ff9a39;font-size:27px}p{line-height:1.5;color:#cfdeea}a{display:inline-block;margin-top:16px;padding:13px 25px;color:#12202d;background:#ff9a39;border-radius:10px;text-decoration:none;font-weight:800}</style>
</head><body><main><h1>${escapeHtml(name)}</h1><p>Invitación a Liga de Amigos · Prode LNA</p><p>${escapeHtml(description)}</p><a href="${escapeHtml(destination)}">Unirme a la liga</a></main>
<script>location.replace(${JSON.stringify(destination)});</script></body></html>`;
  return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","referrer-policy":"no-referrer","x-robots-tag":"noindex, nofollow"}});
}
