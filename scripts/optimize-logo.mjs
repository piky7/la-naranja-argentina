import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const input = new URL("../public/logo-lna.png", import.meta.url);
const output = new URL("../public/logo-lna.webp", import.meta.url);

// El PNG original queda intacto para Open Graph, iconos y compatibilidad.
// Solo se sirve un WebP reducido en el encabezado visible.
await sharp(fileURLToPath(input)).resize({ width: 512, withoutEnlargement: true }).webp({
  quality: 82,
  effort: 5,
}).toFile(fileURLToPath(output));

const original = (await stat(input)).size;
const optimized = (await stat(output)).size;
if (!optimized || optimized >= original) {
  throw new Error("No se logró reducir el logo de LNA");
}
console.log(`Logo LNA: ${(original/1024).toFixed(1)} KiB → ${(optimized/1024).toFixed(1)} KiB WebP (${Math.round((1-optimized/original)*100)} % menos)`);
