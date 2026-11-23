import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("el popup LAB diferencia la carga pendiente de la ausencia real de estadísticas", () => {
  const source = fs.readFileSync("src/pages/HomeLigaArgentina.jsx", "utf8");
  assert.match(source, /boxscores\s*===\s*null\s*\?/);
  assert.match(source, /CARGANDO ESTADÍSTICAS/);
  assert.match(source, /players\.length\s*\?/);
  assert.match(source, /Estadísticas no disponibles/);
});
