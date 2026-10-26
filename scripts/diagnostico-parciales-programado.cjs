// Diagnóstico programado: descubre el partido de las 20:30 y guarda muestras.
// Solo lectura. No modifica KV, Worker, estadísticas ni archivos del repositorio.
const { spawnSync } = require("node:child_process");
const BASE = "https://www.laliganacional.com.ar";
const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date());
const horaObjetivo = process.env.LNA_HORA_PARTIDO || "20:30";
const url = new URL("/laliga/fixture", BASE);
url.searchParams.set("handler","ProximosPartidos");
url.searchParams.set("fechaInicio",fecha);
url.searchParams.set("fechaFin",fecha);
async function main() {
 const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
 if (!res.ok) throw Error("Fixture HTTP " + res.status);
 const html = await res.text();
 const filas = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
 const candidatos = [];
 for (const fila of filas) {
   const href = fila.match(/href="(\/laliga\/partido\/[^"]+)"/i)?.[1];
   const textoFecha = fila.match(/class="[^"]*fecha-campo[^"]*"[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/i)?.[1] || "";
   const match = textoFecha.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
   if (!href || !match) continue;
   if (`${match[3]}-${match[2]}-${match[1]}` === fecha && match[4] === horaObjetivo) {
     candidatos.push(new URL(href, BASE).href);
   }
 }
 console.log("Fecha Argentina:",fecha,"Hora:",horaObjetivo,"Partidos:",candidatos.length);
 if (!candidatos.length) throw Error("No se encontró partido para el horario solicitado; no se inventan URLs.");
 // Guardar todas las muestras de cada partido de ese horario, una consulta por minuto.
 const fs = require("node:fs");
 const salida = "diagnostico-parciales-live.jsonl";
 const muestras = 190;
 for (let i=0;i<muestras;i++) {
   for (const partido of candidatos) {
     const proceso = spawnSync(process.execPath, ["scripts/diagnostico-parciales-live.cjs",partido,"--samples","1"], { encoding:"utf8",timeout:40000 });
     if (proceso.stdout) process.stdout.write(proceso.stdout);
     if (proceso.stderr) process.stderr.write(proceso.stderr);
     if (proceso.status !== 0) console.error("Muestra con error:",partido,proceso.status);
   }
   if (i + 1 < muestras) await new Promise(r=>setTimeout(r,60000));
 }
 if (!fs.existsSync(salida)) throw Error("No se generaron muestras");
}
main().catch(e=>{ console.error(e);process.exitCode=1; });
