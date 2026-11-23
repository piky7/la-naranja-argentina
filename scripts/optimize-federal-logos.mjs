import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Fuentes identificadas para escudos de clubes clasificados; ampliar solo tras verificar cada club.
const sources = [
  { team: "Centro Español de Plottier", file: "centro-espanol-plottier.webp", url: "https://www.argentina.basketball/themes/ee/site/default/asset/img/competiciones/Centro_Espa%C3%B1ol_Plottier_1.png", source: "CAB" },
  { team: "Racing de Olavarría", file: "racing-olavarria.webp", url: "https://images.seeklogo.com/logo-png/46/1/club-racing-de-olavarria-logo-png_seeklogo-461949.png", source: "Seeklogo" },
];
const outputDir = resolve("public/federal-team-logos");
await mkdir(outputDir, { recursive: true });
const manifest = {};
for (const item of sources) {
  try {
    const response = await fetch(item.url, { headers: { "User-Agent": "LaNaranjaArgentina/1.0 (+https://lanaranjaargentina.com.ar)", Accept: "image/*,*/*;q=0.8" }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length < 100) throw new Error("archivo vacío o inválido");
    const outputPath = resolve(outputDir, item.file);
    const result = await sharp(input, { failOn: "error" }).resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile(outputPath);
    manifest[item.team] = { src: "/federal-team-logos/" + item.file, source: item.source, bytes: result.size };
    console.log("OK " + item.team + " → " + item.file);
  } catch (error) { console.warn("PENDIENTE " + item.team + ": " + error.message); }
}
await writeFile(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("Escudos federales procesados: " + Object.keys(manifest).length + "/" + sources.length);
