const cheerio = require("cheerio");

const FIXTURE_URL = "https://www.laliganacional.com.ar/laligaargentina/fixture";

async function main() {
  const response = await fetch(FIXTURE_URL, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  console.log("LAB_FIXTURE_HTTP", response.status);
  if (!response.ok) throw new Error(`Fixture LAB respondió HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const links = new Map();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") || "";
    if (!href.includes("/laligaargentina/partido/")) return;
    const absolute = new URL(href, FIXTURE_URL).href;
    links.set(absolute, {
      url: absolute,
      text: $(element).text().replace(/\\s+/g, " ").trim(),
      parentText: $(element).parent().text().replace(/\\s+/g, " ").trim().slice(0, 180),
    });
  });

  const classes = new Map();
  $("[class]").each((_, element) => {
    const value = ($(element).attr("class") || "").trim();
    if (!value) return;
    for (const name of value.split(/\\s+/)) {
      if (/partido|fixture|fecha|calend|tabla|jornada/i.test(name)) {
        classes.set(name, (classes.get(name) || 0) + 1);
      }
    }
  });

  const result = {
    url: FIXTURE_URL,
    title: $("title").text().trim(),
    htmlBytes: Buffer.byteLength(html),
    matchLinks: links.size,
    links: [...links.values()],
    structuralClasses: [...classes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50),
    tables: $("table").length,
    rows: $("tr").length,
    scripts: $("script[src]").map((_, el) => $(el).attr("src")).get(),
    forms: $("form").map((_, el) => ({ action: $(el).attr("action"), method: $(el).attr("method") })).get(),
    inputs: $("input").map((_, el) => ({ name: $(el).attr("name"), id: $(el).attr("id"), value: $(el).attr("value") })).get(),
    dataAttributes: $("[data-url], [data-endpoint], [data-handler], [data-id]").map((_, el) => ({
      tag: el.tagName,
      id: $(el).attr("id"),
      className: $(el).attr("class"),
      url: $(el).attr("data-url"),
      endpoint: $(el).attr("data-endpoint"),
      handler: $(el).attr("data-handler"),
      dataId: $(el).attr("data-id"),
    })).get().slice(0, 50),
    relevantSnippets: [...html.matchAll(/.{0,100}(?:laligaargentina|mn-fixture|handler|fixture).{0,180}/gi)].slice(0, 80).map(match => match[0].replace(/\\s+/g, " ")),
  };

  console.log("LAB_FIXTURE_REPORT");
  console.log(JSON.stringify(result, null, 2));

  const summary = [
    "# Diagnóstico del fixture oficial LAB",
    "",
    `- URL: [Fixture oficial](${FIXTURE_URL})`,
    `- HTTP: ${response.status}`,
    `- Título: ${result.title || "No detectado"}`,
    `- Enlaces únicos a partidos LAB: **${result.matchLinks}**`,
    `- Tablas HTML: ${result.tables}`,
    `- Filas HTML: ${result.rows}`,
    `- Tamaño HTML: ${result.htmlBytes} bytes`,
    "",
    "## Primeros partidos encontrados",
    "",
    ...(result.links.length
      ? result.links.slice(0, 30).map((item, i) => `${i + 1}. [${item.text || item.parentText || "Partido"}](${item.url})`)
      : ["No se encontraron enlaces con la ruta esperada /laligaargentina/partido/."]),
    "",
    "## Clases estructurales",
    "",
    ...result.structuralClasses.map(([name, count]) => `- ${name}: ${count}`),
    "",
    "## Scripts y endpoints candidatos",
    "",
    ...result.scripts.map(src => `- Script: ${src}`),
    ...result.relevantSnippets.slice(0, 30).map(value => `- \` ${value} \``),
  ].join("\\n");

  require("node:fs").writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\\n");
  if (!result.matchLinks) console.log("FIXTURE_DINAMICO: investigar endpoint de carga antes de extraer partidos.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
