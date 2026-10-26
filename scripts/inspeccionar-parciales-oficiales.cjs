// Inspección de la fuente oficial de parciales. Solo lectura, sin publicar datos.
// Uso: node scripts/inspeccionar-parciales-oficiales.cjs "URL_PARTIDO"
const cheerio = require("cheerio");
const url = process.argv[2];
if (!url || !url.startsWith("https://www.laliganacional.com.ar/laliga/partido/")) {
 console.error('Uso: node scripts/inspeccionar-parciales-oficiales.cjs "URL_PARTIDO"');
 process.exit(1);
}
(async () => {
 const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" }, signal: AbortSignal.timeout(20000) });
 if (!res.ok) throw Error("HTTP " + res.status);
 const html = await res.text();
 const $ = cheerio.load(html);
 console.log("HTML:", html.length, "caracteres");
 const hallazgos = [];
 $("body *").each((_, el) => {
   const nodo = $(el);
   const attrs = Object.entries(el.attribs || {}).filter(([k,v]) => /cuarto|periodo|parcial|mapa|tiro|quarter|shot/i.test(k+" "+v));
   if (!attrs.length) return;
   const children = nodo.children().length;
   const texto = nodo.text().replace(/\s+/g," ").trim();
   if (texto.length > 200 || children > 20) return;
   hallazgos.push({ tag: el.name, attrs: Object.fromEntries(attrs), texto: texto.slice(0,160) });
 });
 console.log("Elementos candidatos (máx. 35):",JSON.stringify(hallazgos.slice(0,35),null,2));
 const scripts = [...html.matchAll(/(?:MapaDeTiro|MapaTiro|Cuarto|Parcial|Periodo|Quarter|periodo|cuarto)/g)].slice(0,20)
 .map(m=>html.slice(Math.max(0,m.index-100),Math.min(html.length,m.index+160)).replace(/\s+/g," "));
 console.log("Contextos de HTML (máx. 20):",JSON.stringify(scripts,null,2));
})().catch(e=>{console.error("Error:",e.message);process.exitCode=1;});
