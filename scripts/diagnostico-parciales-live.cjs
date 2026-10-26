// Diagnóstico independiente de períodos oficiales. NO modifica el Worker LIVE.
// Uso: node scripts/diagnostico-parciales-live.cjs "https://www.laliganacional.com.ar/laliga/partido/..." --interval 60 --samples 180
const fs = require("node:fs");
const path = require("node:path");
const { analizarCierreOficial } = require("./detectar-cierre-oficial.cjs");
const BASE = "https://www.laliganacional.com.ar";
const args = process.argv.slice(2);
const urlPartido = args[0];
const opcion = (nombre, defecto) => {
  const i = args.indexOf(nombre);
  return i < 0 ? defecto : Number(args[i + 1]);
};
const intervalo = opcion("--interval", 60);
const muestras = opcion("--samples", 1);
if (!urlPartido || !Number.isInteger(intervalo) || intervalo < 30 ||
    !Number.isInteger(muestras) || muestras < 1 || muestras > 300) {
  console.error('Uso: node scripts/diagnostico-parciales-live.cjs "URL_OFICIAL_PARTIDO" [--interval 60] [--samples 180]');
  process.exit(1);
}
const url = new URL(urlPartido);
if (url.origin !== BASE || !url.pathname.startsWith("/laliga/partido/")) {
  throw new Error("Se requiere URL de partido de la Liga Nacional oficial");
}
const salida = path.join(process.cwd(), "diagnostico-parciales-live.jsonl");
async function descargar(u) {
  const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.text();
}
async function muestra() {
  const instanteInicio = new Date().toISOString();
  const pagina = await descargar(url);
  const idEnc = pagina.match(/var\s+idEnc\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!idEnc) throw new Error("No se encontró idEnc en la página");
  const endpoint = new URL("/laliga/partido/Marcador/" + encodeURIComponent(idEnc), BASE);
  endpoint.searchParams.set("handler", "Recargar");
  endpoint.searchParams.set("key", "");
  const htmlMarcador = await descargar(endpoint);
  const instanteFin = new Date().toISOString();
  const analisis = analizarCierreOficial(pagina, htmlMarcador);
  const registro = { instanteInicio, instanteFin, ...analisis };
  fs.appendFileSync(salida, JSON.stringify(registro) + "\n");
  console.log(JSON.stringify(registro));
}
(async () => {
  for (let i = 0; i < muestras; i++) {
    try { await muestra(); }
    catch (error) { console.error("Muestra fallida:", error.message); }
    if (i + 1 < muestras) await new Promise(r => setTimeout(r, intervalo * 1000));
  }
  console.log("Diagnóstico guardado en", salida);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
