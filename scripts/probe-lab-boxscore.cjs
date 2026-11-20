const cheerio = require("cheerio");

const MATCH_URL = "https://www.laliganacional.com.ar/laligaargentina/partido/v2um1j83TfZEvkqWmhIy7wVxUnii7kE_pZTahfcniEeIFTwI7KnOcHOw==/quilmes-mdp-vs-river";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

async function main() {
  const response = await fetch(MATCH_URL, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!response.ok) throw new Error(`Partido LAB HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const scripts = $("script[src]").map((_, el) => new globalThis.URL($(el).attr("src"), MATCH_URL).href).get();
  const tabs = $("a,button,[role=tab]").map((_, el) => ({
    tag: el.tagName,
    text: $(el).text().replace(/\s+/g, " ").trim(),
    href: $(el).attr("href") || null,
    target: $(el).attr("data-bs-target") || $(el).attr("data-target") || null,
    onclick: $(el).attr("onclick") || null
  })).get().filter(x => /estad[ií]st|jugador|comparativa|planilla/i.test([x.text,x.href,x.target,x.onclick].join(" ")));
  const tables = $("table").map((_, el) => ({
    id: $(el).attr("id") || null,
    className: $(el).attr("class") || null,
    rows: $(el).find("tbody tr").length,
    headers: $(el).find("thead th").map((__, th) => $(th).text().replace(/\s+/g, " ").trim()).get(),
    sample: $(el).find("tbody tr").slice(0,2).map((__, tr) => $(tr).text().replace(/\s+/g, " ").trim()).get()
  })).get();
  const playerTables = $(".tabla-estadisticas").map((_, table) => {
    const $table = $(table);
    const heading = $table.closest(".table-responsive").prevAll(".nombre-equipo").first();
    const rows = $table.find("tbody tr").map((__, row) => {
      const $row = $(row);
      const onclick = $row.attr("onclick") || $row.find("[onclick]").first().attr("onclick") || "";
      const start = onclick.indexOf("{");
      let player = null;
      if (start >= 0) { try { player = JSON.parse(onclick.slice(start, onclick.lastIndexOf("}") + 1)); } catch {} }
      return { text: $row.find("td").map((___, td) => $(td).text().replace(/\\s+/g, " ").trim()).get(), onclick, player, html: $row.html() };
    }).get();
    return { teamHeading: heading.text().replace(/\\s+/g, " ").trim(), tableClass: $table.attr("class") || "",
      headers: $table.find("thead th").map((__, th) => $(th).text().replace(/\\s+/g, " ").trim()).get(), rows };
  }).get();
  const inline = $("script:not([src])").map((_, el) => $(el).html() || "").get();
  const relevantInline = inline.map((body,index)=>({index,bytes:Buffer.byteLength(body),
    snippets:body.split(/\r?\n/).map(x=>x.trim()).filter(x=>/estad|jugador|ajax|fetch\(|\.get\(|\.post\(|handler|idEnc|comparativa/i.test(x)).slice(0,80)
  })).filter(x=>x.snippets.length);
  const external = [];
  for (const url of [...new Set(scripts)].slice(0,50)) {
    try {
      const r = await fetch(url,{headers:{"User-Agent":UA,Referer:URL}});
      const body = await r.text();
      const snippets = body.split(/\r?\n/).map(x=>x.trim()).filter(x=>/estad|jugador|ajax|fetch\(|\.get\(|\.post\(|handler|idEnc|comparativa/i.test(x)).slice(0,60);
      if (snippets.length) external.push({url,status:r.status,bytes:Buffer.byteLength(body),snippets});
    } catch(error) { external.push({url,error:String(error)}); }
  }
  const aggregateCandidates = $("tr, .row, [class*=team], [id*=team], [class*=estad], [id*=estad]").map((_,el)=>({
    tag:el.tagName, id:$(el).attr("id")||null, className:$(el).attr("class")||null,
    text:$(el).text().replace(/\\s+/g," ").trim().slice(0,700),
    html:$(el).html()?.slice(0,1800)||""
  })).get().filter(x=>/equipo|local|visitante|puntos|rebotes|asistencias|recuperaciones|p[eé]rdidas|tapones|faltas|dobles|triples|libres|valoraci[oó]n/i.test(x.text)).slice(0,180);
  const statTextMatches = [...html.matchAll(/.{0,180}(?:comparativa|estad[ií]sticas de equipo|rebotes totales|tiros de campo|p[eé]rdidas|asistencias).{0,260}/gi)]
    .slice(0,100).map(match=>match[0].replace(/\\s+/g," "));
  const report = {
    url:MATCH_URL,http:response.status,title:$("title").text().trim(),bytes:Buffer.byteLength(html),
    statusText:$("#status-partido").text().trim(),
    scores:{home:$("#score-local").text().trim(),away:$("#score-visitante").text().trim()},
    tabCandidates:tabs,tables,playerTables,aggregateCandidates,statTextMatches,inlineScripts:relevantInline,externalScripts:external,
    statClassCount:$("[class*=estad], [id*=estad], [class*=jugador], [id*=jugador]").length,
    comparisonHtml:$("#scroll-comparativa").html() || null,
    comparisonScript:inline.filter(body=>body.includes("function CargaDatosComparativa")).map(body=>body.slice(body.indexOf("function CargaDatosComparativa"),body.indexOf("function CargaDatosComparativa")+12000)),
    htmlHasStatLabels:/rebotes|asistencias|minutos|valoraci[oó]n/i.test(html)
  };
  console.log(JSON.stringify(report,null,2));
  const md=["# Inspección del box score LAB","",
    `- Partido: [Quilmes–River 15/10/2026](${MATCH_URL})`,
    `- HTTP: ${report.http}`,`- Tablas HTML iniciales: ${tables.length}`,
    `- Candidatos de pestaña: ${tabs.length}`,
    `- Scripts externos con referencias estadísticas: ${external.length}`,
    `- Etiquetas estadísticas en HTML: ${report.htmlHasStatLabels?"Sí":"No"}`,"",
    "## Pestañas","","```json",JSON.stringify(tabs,null,2),"```","",
    "## Tablas","","```json",JSON.stringify(tables,null,2),"```","",
    "## Candidatos de estadísticas colectivas","","```json",JSON.stringify(aggregateCandidates,null,2),"```","",
    "## Coincidencias en HTML","","```json",JSON.stringify(statTextMatches,null,2),"```","",
    "## Jugadores y datos oficiales","","```json",JSON.stringify(playerTables,null,2),"```","",
    "## JavaScript inline","","```json",JSON.stringify(relevantInline,null,2),"```","",
    "## JavaScript externo","","```json",JSON.stringify(external,null,2),"```"
  ].join("\n");
  require("node:fs").writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+"\n");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
