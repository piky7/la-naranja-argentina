const fs = require("node:fs");
const path = require("node:path");

function minutesPlayed(value) {
  const parts = String(value || "").trim().split(":").map(Number);
  if (parts.some(v => !Number.isFinite(v))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(value) || 0;
}

function buildSummary(sourceFile, outputFile) {
  const boxes = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  const summary = {};
  for (const [matchId, box] of Object.entries(boxes || {})) {
    const players = Array.isArray(box?.players) ? box.players : [];
    const eligible = players.filter(player =>
      minutesPlayed(player.minutes) > 0 &&
      player.valuation != null &&
      Number.isFinite(Number(player.valuation))
    );
    let mvpPlayerIds = [];
    if (eligible.length) {
      const best = Math.max(...eligible.map(player => Number(player.valuation)));
      mvpPlayerIds = [...new Set(eligible
        .filter(player => Number(player.valuation) === best)
        .map(player => Number(player.id)))];
    }
    summary[matchId] = {
      teamComparison: box?.teamComparison || null,
      mvpPlayerIds
    };
  }
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(summary) + "\n");
  const bytes = fs.statSync(outputFile).size;
  console.log("RESUMEN COMPACTO LAB", JSON.stringify({
    partidos: Object.keys(summary).length,
    bytes,
    jugadoresMVP: Object.values(summary).reduce((sum, item) => sum + item.mvpPlayerIds.length, 0)
  }));
  return summary;
}

if (require.main === module) {
  buildSummary(
    path.join(__dirname, "../data/lab/labBoxscores.json"),
    path.join(__dirname, "../data/lab/labBoxscoreSummary.json")
  );
}
module.exports = { buildSummary };
