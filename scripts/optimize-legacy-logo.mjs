import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

// El archivo original versionado no se modifica.
// Comprimir también la ruta antigua evita que favicons en caché
// sigan descargando casi 1 MB de imagen innecesaria.
const original = new URL("../public/logo-lna.png", import.meta.url);
const legacy = new URL("../dist/logo-lna.png", import.meta.url);
await sharp(fileURLToPath(original))
  .resize({ width: 256, withoutEnlargement: true })
  .png({ palette: true, compressionLevel: 9, effort: 9 })
  .toFile(fileURLToPath(legacy));

const before=(await stat(original)).size;
const after=(await stat(legacy)).size;
if (after >= before || after > 180_000) {
  throw new Error(`Logo heredado no optimizado: ${after} bytes`);
}
console.log(`Logo PNG heredado: ${(before/1024).toFixed(1)} KiB → ${(after/1024).toFixed(1)} KiB en dist`);
