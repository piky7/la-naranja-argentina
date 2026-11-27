const fs = require("node:fs");
const path = require("node:path");

function publicFilename(matchId) {\n  return String(matchId).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "") + ".json";\n}\n\nfunction publicFilename(matchId) {
  return String(matchId).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") + ".json";
}

function splitBoxscores(sourceFile, outputDir, publicDir = null) {
  if (!fs.existsSync(sourceFile)) throw new Error("No existe la base histórica LAB: " + sourceFile);
  const raw = fs.readFileSync(sourceFile, "utf8");
  const boxes = JSON.parse(raw);
  if (!boxes || typeof boxes !== "object" || Array.isArray(boxes)) {
    throw new Error("La base histórica LAB debe ser un objeto indexado por ID de partido.");
  }

  const entries = Object.entries(boxes);
  const nextFiles = new Set();
  fs.mkdirSync(outputDir, { recursive: true });
  if (publicDir) fs.mkdirSync(publicDir, { recursive: true });

  for (const [matchId, box] of entries) {
    if (!matchId || !box || typeof box !== "object") throw new Error("Boxscore inválido: " + matchId);
    const filename = "labBoxscores-" + encodeURIComponent(String(matchId)) + ".json";
    fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(box) + "\n");
    if (publicDir) fs.writeFileSync(path.join(publicDir, publicFilename(matchId)), JSON.stringify(box) + "\n");
    nextFiles.add(filename);
  }

  for (const filename of fs.readdirSync(outputDir)) {
    if (filename.endsWith(".json") && !nextFiles.has(filename)) fs.unlinkSync(path.join(outputDir, filename));
  }
  let publicFiles = new Set();
  if (publicDir) {
    publicFiles = new Set([...entries.map(([matchId]) => publicFilename(matchId)), "index.json"]);
    for (const filename of fs.readdirSync(publicDir)) {
      if (filename.endsWith(".json") && !publicFiles.has(filename)) fs.unlinkSync(path.join(publicDir, filename));
    }
    const matchIds = entries.map(([matchId]) => String(matchId));
    fs.writeFileSync(path.join(publicDir, "index.json"), JSON.stringify({ matchIds }) + "\n");
  }

  const result = {
    matches: entries.length,
    sourceBytes: Buffer.byteLength(raw),
    shardBytes: [...nextFiles].reduce((sum, filename) => sum + fs.statSync(path.join(outputDir, filename)).size, 0),
    files: nextFiles.size,
    publicFiles: publicDir ? publicFiles.size : 0
  };
  console.log("BOX SCORES LAB PARTICIONADOS", JSON.stringify(result));
  return result;
}

if (require.main === module) {
  splitBoxscores(
    path.join(__dirname, "../data/lab/labBoxscores.json"),
    path.join(__dirname, "../data/lab/boxscores"),
    path.join(__dirname, "../public/lab-boxscores")
  );
}
module.exports = { splitBoxscores };
