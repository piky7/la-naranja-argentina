const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const assert = require("node:assert/strict");

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "lna-safe-test-"));
const officialId = "lanus-gimnasia";
const newId = "test-local-visitante";
const officialSource = fs.readFileSync(path.join(root, "src/data/officialValuations.js"), "utf8");
const official = JSON.parse(officialSource.replace(/^\s*export\s+const\s+officialValuations\s*=\s*/, "").replace(/;\s*$/, ""));
assert(Object.hasOwn(official, officialId), "Falta partido oficial de referencia");
const original = fs.readFileSync(path.join(root, "src/data/matchStats.js"), "utf8");
assert(original.includes('"' + officialId + '"'), "Falta el partido oficial en matchStats");

function run(generated, label) {
  const dir = fs.mkdtempSync(path.join(temp, label + "-"));
  fs.mkdirSync(path.join(dir, "src/data"), { recursive: true });
  fs.copyFileSync(path.join(root, "update-matchstats.cjs"), path.join(dir, "update-matchstats.cjs"));
  fs.writeFileSync(path.join(dir, "src/data/matchStats.js"), original);
  fs.writeFileSync(path.join(dir, "src/data/officialValuations.js"), officialSource);
  fs.writeFileSync(path.join(dir, "matchstats-generated.js"), generated);
  const result = cp.spawnSync(process.execPath, ["update-matchstats.cjs"], { cwd: dir, encoding: "utf8" });
  if (result.status !== 0) throw new Error(label + " failed:\n" + result.stdout + "\n" + result.stderr);
  return { before: original, after: fs.readFileSync(path.join(dir, "src/data/matchStats.js"), "utf8"), stdout: result.stdout };
}

try {
  const fakeOfficial = 'export const matchPlayerStats = {\n"' + officialId + '": {"lanus":[{"id":"fake-player","name":"Falso","points":999,"rebounds":0,"assists":0,"minutes":"01:00"}]},\n};\n';
  const protectedRun = run(fakeOfficial, "protected");
  assert.equal(protectedRun.after, original, "El partido oficial fue modificado");
  assert.match(protectedRun.stdout, /PROTEGIDO \(VAL oficial\)/);
  console.log("PASS: partido oficial protegido; matchStats sin cambios");

  const fakeNew = 'export const matchPlayerStats = {\n"' + newId + '": {"test-local":[{"id":"test-player","name":"Jugador Prueba","points":5,"rebounds":2,"assists":1,"minutes":"05:00"}],"test-visitante":[]},\n};\n';
  const addedRun = run(fakeNew, "new-match");
  assert(addedRun.after.includes('"' + newId + '"'), "No se agregó el partido nuevo");
  assert(addedRun.after.includes('"' + officialId + '"'), "Desapareció el partido oficial");
  assert(addedRun.after.includes('"points":5'), "Faltan estadísticas nuevas");
  console.log("PASS: partido ficticio agregado sin eliminar partido oficial");
  console.log("PASS: archivos reales sin modificaciones; no se realizó ningún push");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
