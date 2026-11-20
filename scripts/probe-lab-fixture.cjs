const cheerio = require("cheerio");

const FIXTURE_URL = "https://www.laliganacional.com.ar/laligaargentina/fixture";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

function relevantLines(source) {
  return source.split(/\r?\n/).map((line, index) => ({ line: index + 1, text: line.trim().slice(0, 700) }))
    .filter(item => /laligaargentina|mn-fixture|fixture|ProximosPartidos|ajax|fetch\(|XMLHttpRequest|\.get\(|\.post\(|\.load\(|handler|partido\/|api\//i.test(item.text))
    .slice(0, 100);
}

async function main() {
  const response = await fetch(FIXTURE_URL, { headers: { "User-Agent": UA, Accept: "text/html" } });
  console.log("LAB_FIXTURE_HTTP", response.status);
  if (!response.ok) throw new Error(`Fixture LAB respondió HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const links = new Map();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("/laligaargentina/partido/")) {
      const url = new URL(href, FIXTURE_URL).href;
      links.set(url, { url, text: $(el).text().replace(/\s+/g, " ").trim() });
    }
  });

  const scriptRefs = $("script[src]").map((_, el) => new URL($(el).attr("src"), FIXTURE_URL).href).get();
  const inlineScripts = $("script:not([src])").map((_, el) => $(el).html() || "").get();
  const external = [];
  for (const url of [...new Set(scriptRefs)].slice(0, 40)) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*", Referer: FIXTURE_URL } });
      const body = await r.text();
      external.push({ url, status: r.status, bytes: Buffer.byteLength(body), lines: relevantLines(body) });
      console.log("LAB_SCRIPT", r.status, url, Buffer.byteLength(body));
    } catch (error) {
      external.push({ url, error: String(error) });
    }
  }


  const ajaxUrl = new URL("/laligaargentina/fixture", FIXTURE_URL);
  ajaxUrl.searchParams.set("handler", "ProximosPartidos");
  ajaxUrl.searchParams.set("fechaInicio", "2026-09-01");
  ajaxUrl.searchParams.set("fechaFin", "2027-06-30");
  const ajaxResponse = await fetch(ajaxUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html, */*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: FIXTURE_URL,
    },
  });
  const ajaxHtml = await ajaxResponse.text();
  const $ajax = cheerio.load(ajaxHtml);
  const ajaxLinks = $ajax('a[href*="/laligaargentina/partido/"]').map((_, el) => ({
    url: new URL($ajax(el).attr("href"), FIXTURE_URL).href,
    text: $ajax(el).text().replace(/\\s+/g, " ").trim(),
    row: $ajax(el).closest("tr").text().replace(/\\s+/g, " ").trim().slice(0, 300),
  })).get();
  const ajaxReport = {
    url: ajaxUrl.href,
    status: ajaxResponse.status,
    contentType: ajaxResponse.headers.get("content-type"),
    bytes: Buffer.byteLength(ajaxHtml),
    title: $ajax("title").text().trim(),
    tables: $ajax("table").length,
    rows: $ajax("tr").length,
    matchLinks: ajaxLinks.length,
    links: ajaxLinks.slice(0, 20),
    classes: [...new Set($ajax("[class]").map((_, el) => $ajax(el).attr("class")).get().filter(x => /calendario|partido|fixture/i.test(x || "")))].slice(0, 40),
    snippet: ajaxHtml.slice(0, 1600),
  };
  console.log("LAB_AJAX_FIXTURE_REPORT");
  console.log(JSON.stringify(ajaxReport, null, 2));

  const result = {
    url: FIXTURE_URL,
    title: $("title").text().trim(),
    htmlBytes: Buffer.byteLength(html),
    matchLinks: links.size,
    links: [...links.values()],
    scriptRefs: [...new Set(scriptRefs)],
    inlineScripts: inlineScripts.map((body, index) => ({ index, lines: relevantLines(body), bytes: Buffer.byteLength(body) })),
    externalScripts: external,
    forms: $("form").map((_, el) => ({ action: $(el).attr("action"), method: $(el).attr("method"), id: $(el).attr("id") })).get(),
    inputs: $("input").map((_, el) => ({ name: $(el).attr("name"), id: $(el).attr("id"), value: $(el).attr("value") })).get(),
    fixtureContainers: $(".mn-fixture").map((_, el) => ({ html: $(el).html()?.slice(0, 4000) })).get(),
    ajaxReport,
    snippets: [...html.matchAll(/.{0,120}(?:laligaargentina|mn-fixture|handler|fixture|ajax|fetch\().{0,240}/gi)].slice(0, 80).map(m => m[0].replace(/\s+/g, " ")),
  };

  console.log("LAB_FIXTURE_REPORT");
  console.log(JSON.stringify(result, null, 2));

  const summary = [
    "# Diagnóstico del fixture oficial LAB", "",
    `- URL: [Fixture oficial](${FIXTURE_URL})`,
    `- HTTP: ${response.status}`,
    `- Enlaces directos a partidos: **${result.matchLinks}**`,
    `- Scripts externos inspeccionados: **${external.length}**`,
    `- Tamaño HTML: ${result.htmlBytes} bytes`, "",
    "## Scripts externos y referencias de red", "",
    ...external.flatMap(item => [
      `### ${item.status || "Error"} — ${item.url}`,
      ...(item.lines || []).map(x => `- L${x.line}: \`${x.text}\``),
      ...(item.error ? [item.error] : []), ""
    ]),
    "## Scripts inline", "",
    ...result.inlineScripts.flatMap(item => [
      `### Inline ${item.index} (${item.bytes} bytes)`,
      ...(item.lines || []).map(x => `- L${x.line}: \`${x.text}\``), ""
    ]),
    "## Contenedores y referencias HTML", "",
    ...result.snippets.map(x => `- \`${x}\``),
    "", "## Estado", "",
    result.matchLinks ? "Se encontraron enlaces directos; se puede avanzar al parser." :
      "El HTML inicial no contiene partidos. Se inspeccionaron los scripts para identificar el endpoint que carga el fixture."
  ].join("\n");
  require("node:fs").writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  console.log(result.matchLinks ? "FIXTURE_LINKS_FOUND" : "FIXTURE_DYNAMIC_SOURCE_INSPECTED");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
