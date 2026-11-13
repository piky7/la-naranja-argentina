function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function expandHeaderCells($, row) {
  const expanded = [];
  $(row).children("th,td").each((_, cell) => {
    const label = normalizeText($(cell).text());
    const span = Math.max(1, Number($(cell).attr("colspan")) || 1);
    for (let i = 0; i < span; i++) expanded.push(label);
  });
  return expanded;
}

function isTargetHeader(label, kind) {
  if (kind === "blocks") {
    return /^(?:tap|tapon|tapones|tap com|tapones com|tapones cometidos|tapones realizados|tapones hechos|blk|bloqueo|bloqueos)$/.test(label);
  }
  if (kind === "fouls") {
    return /^(?:falta|faltas|falta personal|faltas personales|fp|pf)$/.test(label);
  }
  return false;
}

function readStatFromTable($, playerRow, kind) {
  const table = $(playerRow).closest("table");
  if (!table.length) return null;
  const playerCells = $(playerRow).children("th,td");
  if (!playerCells.length) return null;

  let headerRows = table.find("thead tr").toArray();
  if (!headerRows.length) {
    headerRows = table.find("tr").filter((_, row) => $(row).children("th").length > 0).toArray();
  }

  for (const headerRow of headerRows) {
    const headers = expandHeaderCells($, headerRow);
    if (!headers.length) continue;
    const index = headers.findIndex((header) => isTargetHeader(header, kind));
    if (index < 0 || index >= playerCells.length) continue;
    const value = $(playerCells[index]).text().trim();
    if (/^\d+$/.test(value)) return Number(value);
  }
  return null;
}

function countCommittedBlocksFromActions($, playerName) {
  const nameTokens = normalizeText(playerName).split(" ").filter(Boolean);
  if (nameTokens.length < 2) return null;

  let total = 0;
  let foundAction = false;
  $("li.accion").each((_, element) => {
    const text = normalizeText($(element).text());
    if (!/\btapon(?:es)?\s*cometido\b/.test(text)) return;
    foundAction = true;
    if (nameTokens.every((token) => text.includes(token))) total++;
  });
  return foundAction ? total : null;
}

module.exports = {
  normalizeText,
  readStatFromTable,
  countCommittedBlocksFromActions,
};
