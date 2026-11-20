import sharp from "sharp";
import { readFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const schedulePath = resolve(root, "data/lab/labSchedule.json");
const outputDir = resolve(root, "public/lab-team-logos");
const schedule = JSON.parse(await readFile(schedulePath, "utf8"));
const teams = [...new Map((schedule.teams || []).map(team => [String(team.teamId), team])).values()];
if (!teams.length) throw new Error("No se encontraron equipos LAB para optimizar sus escudos.");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

let originalBytes = 0;
let webpBytes = 0;
let converted = 0;

for (let offset = 0; offset < teams.length; offset += 4) {
  const batch = teams.slice(offset, offset + 4);
  const results = await Promise.all(batch.map(async team => {
    const id = String(team.teamId);
    const url = team.crestUrl || `https://www.laliganacional.com.ar/escudos/${team.clubId}/${id}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "LaNaranjaArgentina/1.0 (+https://lanaranjaargentina.com.ar)", Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`${team.name}: HTTP ${response.status} al descargar el escudo`);
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length < 100) throw new Error(`${team.name}: archivo de escudo vacío o inválido`);
    const outputPath = resolve(outputDir, `${id}.webp`);
    const info = await sharp(input, { failOn: "error" })
      .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 95, effort: 5 })
      .toFile(outputPath);
    return { inputBytes: input.length, outputBytes: info.size };
  }));
  for (const result of results) {
    originalBytes += result.inputBytes;
    webpBytes += result.outputBytes;
    converted++;
  }
}

if (converted !== teams.length || !webpBytes) {
  throw new Error(`Conversión LAB incompleta: ${converted}/${teams.length}`);
}
console.log(`Escudos LAB: ${converted} convertidos a WebP local, ${(originalBytes / 1024).toFixed(1)} KiB → ${(webpBytes / 1024).toFixed(1)} KiB (${Math.round(100 * (1 - webpBytes / originalBytes))}% menos)`);
