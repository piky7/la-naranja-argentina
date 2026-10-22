const fs = require("node:fs");

const preview = JSON.parse(fs.readFileSync("official-sync-preview.json", "utf8"));
const path = "src/data/players.js";
let source = fs.readFileSync(path, "utf8");
const latest = new Map();

for (const [key, match] of Object.entries(preview.matchStats || {})) {
  const date = key.slice(0, 10);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) continue;
  for (const teamId of [match.homeTeam, match.awayTeam]) {
    for (const player of match[teamId] || []) {
      const raw = player.number;
      if (raw == null || !/^\\d{1,3}$/.test(String(raw).trim())) continue;
      const number = Number(raw);
      if (number > 99) continue;
      const id = String(player.id || "");
      if (!id) continue;
      const prev = latest.get(id);
      if (!prev || date > prev.date) latest.set(id, { date, number });
    }
  }
}

// Modificar solo el campo number dentro del objeto del jugador ya identificado.
// No crear jugadores ni reemplazar números con valores ausentes.
let changed = 0;
const blocks = source.split(/(?=\\n\\s*\\{\\s*\\n\\s*id:\s*["'])/);
const updated = blocks.map(block => {
  const id = block.match(/\\bid:\s*["']([^"']+)["']/)?.[1];
  const record = latest.get(id);
  if (!record) return block;
  const match = block.match(/(\\bnumber:\s*)(null|\\d+)/);
  if (!match) return block;
  if (match[2] === String(record.number)) return block;
  changed++;
  return block.replace(/(\\bnumber:\s*)(null|\\d+)/, (_, prefix) => prefix + record.number);
});
source = updated.join("");
if (changed) fs.writeFileSync(path, source, "utf8");
console.log("Dorsales de jugadores actualizados:", changed, "de", latest.size, "identificados con número válido.");
