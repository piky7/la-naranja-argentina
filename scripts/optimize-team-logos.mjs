import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const inputDir = new URL("../src/assets/teams/", import.meta.url);
const outputDir = new URL("../src/assets/teams-webp/", import.meta.url);
await mkdir(outputDir, { recursive: true });

let originalBytes = 0;
let optimizedBytes = 0;
let converted = 0;

for (const file of (await readdir(inputDir)).filter(name => name.endsWith(".png")).sort()) {
  const from = new URL(file, inputDir);
  const to = new URL(file.replace(/\.png$/, ".webp"), outputDir);
  await sharp(fileURLToPath(from))
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 95, effort: 5 })
    .toFile(fileURLToPath(to));
  originalBytes += (await stat(from)).size;
  optimizedBytes += (await stat(to)).size;
  converted++;
}

if (converted !== 18) throw new Error(`Se esperaban 18 escudos; se convirtieron ${converted}`);
if (optimizedBytes >= originalBytes) throw new Error("Los escudos WebP no redujeron el tamaño total");
console.log(`Escudos LNA: ${converted} PNG, ${(originalBytes / 1024).toFixed(1)} KiB → ${(optimizedBytes / 1024).toFixed(1)} KiB WebP (${Math.round(100 * (1 - optimizedBytes / originalBytes))}% menos)`);
