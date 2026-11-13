import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cheerio = require("cheerio");
const {
  readStatFromTable,
  countCommittedBlocksFromActions,
} = require("../scripts/official-player-blocks.cjs");

test("lee la columna oficial Tapones com. aunque esté dentro de una tabla sin thead", () => {
  const $ = cheerio.load(`
    <table class="tabla-estadisticas">
      <tr><th>Jugador</th><th>PTS</th><th>Tapones com.</th></tr>
      <tr onclick='ver({"NombreCompleto":"Bryan Carabali"})'>
        <td>Bryan Carabali</td><td>12</td><td>3</td>
      </tr>
    </table>
  `);
  const row = $("table tr").eq(1);
  assert.equal(readStatFromTable($, row, "blocks"), 3);
});

test("lee Tapones com. cuando el encabezado tiene colspan y thead", () => {
  const $ = cheerio.load(`
    <table>
      <thead>
        <tr><th rowspan="2">Jugador</th><th colspan="2">Tiros</th><th rowspan="2">Tapones com.</th></tr>
        <tr><th>2P</th><th>3P</th></tr>
      </thead>
      <tbody><tr><td>Bryan Carabali</td><td>4</td><td>1</td><td>3</td></tr></tbody>
    </table>
  `);
  assert.equal(readStatFromTable($, $("tbody tr"), "blocks"), 3);
});

test("cuenta acciones oficiales TAPON-COMETIDO del jugador sin confundir TAPON-RECIBIDO", () => {
  const $ = cheerio.load(`
    <ul>
      <li class="accion">Bryan Carabali - TAPON-COMETIDO</li>
      <li class="accion">Bryan Carabali - TAPON COMETIDO</li>
      <li class="accion">Bryan Carabali - TAPON-RECIBIDO</li>
      <li class="accion">Otro Jugador - TAPON-COMETIDO</li>
    </ul>
  `);
  assert.equal(countCommittedBlocksFromActions($, "Bryan Carabali"), 2);
});

test("no inventa cero tapones si no hay una acción positiva del jugador", () => {
  const $ = cheerio.load(`
    <ul><li class="accion">Otro Jugador - TAPON-COMETIDO</li></ul>
  `);
  assert.equal(countCommittedBlocksFromActions($, "Bryan Carabali"), null);
});
