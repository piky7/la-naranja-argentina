const cheerio = require("cheerio");

const URL = "https://www.laliganacional.com.ar/laligaargentina/partido/v2um1j83TfZEvkqWmhIy7wVxUnii7kE_pZTahfcniEeIFTwI7KnOcHOw==/quilmes-mdp-vs-river";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

async function main() {
  const response = await fetch(URL, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!response.ok) throw new Error(`Partido LAB HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const scripts = $("script[src]").map((_, el) => new URL($(el).attr("src"), URL).href).get();
  const tabs = $("a,button,[role=tab]").map((_, el) => ({
    tag: el.tagName, text: $(el).text().replace(/\\s+/g, " ").trim(),
    href: $(el).attr("href") || null, target: $(el).attr("data-bs-target") || $(el).attr("data-target") || null,
    onclick: $(el).attr("onclick") || null
  })).get().filter(x => /estad[ií]st|jugador|comparativa|planilla/i.test([x.text,x.href,x.target,x.onclick].join(" ")));
  const tables = $("table").map((_, el) => ({
    id: $(el).attr("id") || null, className: $(el).attr("class") || null,
    rows: $(el).find("tbody tr").length,
    headers: $(el).find("thead th").map((__, th) => $(th).text().replace(/\\s+/g, " ").trim()).get(),
    sample: $(el).find("tbody tr").slice(0,2).map((__, tr) => $(tr).text().replace(/\\s+/g, " ").trim()).get()
  })).get();
  const inline = $("script:not([src])").map((_, el) => $(el).html() || "").get();
  const relevantInline = inline.map((body,index)=>({index,bytes:Buffer.byteLength(body),snippets:body.split(/\\r?\\n/).map(x=>x.trim()).filter(x=>/estad|jugador|ajax|fetch\\(|\\.get\\(|\\.post\\(|handler|idEnc|comparativa/i.test(x)).slice(0,80)})).filter(x=>x.snippets.length);
  const external = [];
  for (const url of [...new Set(scripts)].slice(0,50)) {
    try {
      const r = await fetch(url,{headers:{"User-Agent":UA,Referer:URL}});
      const body = await r.text();
      const snippets = body.split(/\\r?\\n/).map(x=>x.trim()).filter(x=>/estad|jugador|ajax|fetch\\(|\\.get\\(|\\.post\\(|handler|idEnc|comparativa/i.test(x)).slice(0,60);
      if (snippets.length) external.push({url,status:r.status,bytes:Buffer.byteLength(body),snippets});
    } catch(error) { external.push({url,error:String(error)}); }
  }
  const report = {url:URL,http:response.status,title:$("title").text().trim(),bytes:Buffer.byteLength(html),
    statusText:$("#status-partido").text().trim(),scores:{home:$("#score-local").text().trim(),away:$("#score-visitante").text().trim()},
    tabCandidates:tabs,tables,inlineScripts:relevantInline,externalScripts:external,
    statClassCount:$("[class*=estad], [id*=estad], [class*=jugador], [id*=jugador]").length,
    htmlHasStatLabels:/rebotes|asistencias|minutos|valoraci[oó]n/i.test(html)};
  console.log(JSON.stringify(report,null,2));
  const md=["# Inspección del box score LAB","",`- Partido: [Quilmes–River 15/10/2026](${URL})`,
    `- HTTP: ${report.http}`,`- Tablas HTML iniciales: ${tables.length}`,
    `- Candidatos de pestaña: ${tabs.length}`,`- Scripts externos con referencias estadísticas: ${external.length}`,
    `- Etiquetas estadísticas en HTML: ${report.htmlHasStatLabels?"Sí":"No"}`,"",
    "## Pestañas", "","```json",JSON.stringify(tabs,null,2),"```","",
    "## Tablas", "","```json",JSON.stringify(tables,null,2),"```","",
    "## JavaScript inline","","```json",JSON.stringify(relevantInline,null,2),"```","",
    "## JavaScript externo","","```json",JSON.stringify(external,null,2),"```"].join("\\n");
  require("node:fs").writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+"\\n");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
