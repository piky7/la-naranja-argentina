const fs = require("node:fs");
const path = require("node:path");

const assets = path.resolve("dist/assets");
if (!fs.existsSync(assets)) throw new Error("No existe dist/assets: ejecutar npm run build primero");
const files = fs.readdirSync(assets);
const chunks = files.filter(file => /^match-stats-[\w-]+\.js$/.test(file));
if (chunks.length !== 1) throw new Error("Se esperaba un chunk match-stats de estadísticas; encontrados: " + chunks.length);
const stats = path.join(assets, chunks[0]);
const size = fs.statSync(stats).size;
if (size < 100_000) throw new Error("El chunk de estadísticas parece incompleto: " + size + " bytes");
const scripts = files.filter(file => file.endsWith(".js") && file !== chunks[0]);
if (!scripts.some(file => fs.readFileSync(path.join(assets, file), "utf8").includes(chunks[0]))) {
  throw new Error("Ninguna entrada del build referencia el chunk de estadísticas");
}
console.log("Planillas oficiales separadas: " + chunks[0] + " (" + (size / 1024).toFixed(1) + " KiB)");
