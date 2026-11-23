const fs = require("node:fs");
const path = require("node:path");

function splitBoxscores(sourceFile, outputDir) {
  if (!fs.existsSync(sourceFile)) throw new Error("No existe la base histórica LAB: " + sourceFile);
  const raw = fs.readFileSync(sourceFile, "utf8");
  const boxes = JSON.parse(raw);
  if (!boxes || typeof boxes !== "object" || Array.isArray(boxes)) {
    throw new Error("La base histórica LAB debe ser un objeto indexado por ID de partido.");
  }
  const entries = Object.entries(boxes);
  const nextFiles = new Set();
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [matchId, box] of entries) {
    if (!matchId || !box || typeof box !== "object") throw new Error("Boxscore inválido: " + matchId);
    const filename = encodeURIComponent(String(matchId)) + ".json";
    const destination = path.join(outputDir, filename);
    fs.writeFileSync(destination, JSON.stringify(box) + "\n");
    nextFiles.add(filename);
  }
  for (const filename of fs.readdirSync(outputDir)) {
    if (filename.endsWith(".json") && !nextFiles.has(filename)) {
      fs.unlinkSync(path.join(outputDir, filename));
    }
  }
  const result = {
    matches: entries.length,
    sourceBytes: Buffer.byteLength(raw),
    shardBytes: [...nextFiles].reduce((sum, filename) => sum + fs.statSync(path.join(outputDir, filename)).size, 0),
    files: nextFiles.size
  };
  console.log("BOX SCORES LAB PARTICIONADOS", JSON.stringify(result));
  return result;
}

if (require.main === module) {
  splitBoxscores(
    path.join(__dirname, "../data/lab/labBoxscores.json"),
    path.join(__dirname, "../data/lab/boxscores")
  );
}
module.exports = { splitBoxscores };
