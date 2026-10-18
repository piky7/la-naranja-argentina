// Generate crawlable HTML entry points for all sitemap routes.
// React continues to hydrate the same #root and handles client-side navigation.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "public", "sitemap.xml"), "utf8");
const teamsSource = fs.readFileSync(path.join(root, "src", "data", "teams.js"), "utf8");
const site = "https://lanaranjaargentina.com.ar";
const description = "Seguí la Liga Nacional de Básquet argentino: resultados en vivo, fixture, tabla de posiciones, equipos, jugadores y estadísticas de la temporada 2026/27.";

const pages = {
  "/": ["La Naranja Argentina | Liga Nacional de Básquet", description],
  "/liga": ["Liga Nacional 2026/27 | Fixture, Resultados y Posiciones", "Fixture, resultados, próximos partidos y tabla de posiciones de la Liga Nacional de Básquet 2026/27."],
  "/equipos": ["Equipos de la Liga Nacional de Básquet 2026/27", "Conocé los equipos de la Liga Nacional de Básquet 2026/27, sus planteles, partidos y estadísticas."],
  "/jugadores": ["Jugadores de la Liga Nacional de Básquet 2026/27", "Consultá jugadores, equipos y estadísticas de la Liga Nacional de Básquet argentino 2026/27."],
  "/estadisticas": ["Estadísticas de la Liga Nacional de Básquet 2026/27", "Promedios, goleadores y estadísticas de jugadores de la Liga Nacional de Básquet 2026/27."],
  "/acerca": ["Acerca de La Naranja Argentina", "Conocé La Naranja Argentina, el sitio dedicado a la Liga Nacional de Básquet."],
  "/privacidad": ["Política de Privacidad | La Naranja Argentina", "Consultá la política de privacidad de La Naranja Argentina."],
};

const teams = new Map();
for (const match of teamsSource.matchAll(/id:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)) {
  teams.set(match[1], match[2]);
}
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const replaceMeta = (markup, attribute, key, value) => {
  const escaped = escapeHtml(value);
  const pattern = new RegExp('(<meta\\s+' + attribute + '="' + key + '"\\s+content=")[^"]*(")', "i");
  if (pattern.test(markup)) return markup.replace(pattern, (_, start, end) => start + escaped + end);
  return markup.replace("</head>", '  <meta ' + attribute + '="' + key + '" content="' + escaped + '" />\n</head>');
};

const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
let count = 0;
for (const url of urls) {
  if (url.origin !== site) throw new Error("Unexpected sitemap host: " + url.href);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  let meta = pages[pathname];
  if (!meta && pathname.startsWith("/equipos/")) {
    const team = teams.get(decodeURIComponent(pathname.slice("/equipos/".length)));
    if (team) meta = [
      team + " | Plantel, Resultados y Estadísticas",
      "Conocé el plantel, los resultados, próximos partidos y estadísticas de " + team + " en la Liga Nacional de Básquet 2026/27.",
    ];
  }
  if (!meta) throw new Error("Missing SEO metadata for " + pathname);
  const [title, desc] = meta;
  let output = html.replace(/<title>[^<]*<\/title>/i, "<title>" + escapeHtml(title) + "</title>");
  for (const [attribute, key, value] of [
    ["name", "description", desc],
    ["property", "og:title", title],
    ["property", "og:description", desc],
    ["property", "og:url", site + pathname],
    ["name", "twitter:title", title],
    ["name", "twitter:description", desc],
  ]) output = replaceMeta(output, attribute, key, value);
  output = output.replace("</head>", '  <link rel="canonical" href="' + escapeHtml(site + pathname) + '" />\n</head>');
  const target = pathname === "/" ? path.join(dist, "index.html") : path.join(dist, pathname.slice(1), "index.html");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
  count++;
}
console.log("Generated " + count + " SEO HTML entry points.");
