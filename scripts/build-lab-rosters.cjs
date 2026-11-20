const fs = require("node:fs");
const path = require("node:path");
const fixture = require("../data/lab/labSchedule.json");
const boxPath = path.join(__dirname, "../data/lab/labBoxscores.json");
const outPath = path.join(__dirname, "../data/lab/labRosters.json");
const boxes = JSON.parse(fs.readFileSync(boxPath, "utf8"));
const teamInfo = new Map(fixture.teams.map(t => [Number(t.teamId), t]));
const teams = new Map();
const toSeconds = value => {
  const parts = String(value || "0:00").split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};
const fmt = seconds => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
};
const fields = ["points","rebounds","offensiveRebounds","defensiveRebounds","assists","steals","turnovers","blocks","blocksReceived","fouls","foulsReceived","valuation","plusMinus"];
for (const [matchId, box] of Object.entries(boxes)) {
  for (const p of box.players || []) {
    const teamId = Number(p.teamId), playerId = Number(p.id);
    if (!teamInfo.has(teamId) || !playerId) continue;
    if (!teams.has(teamId)) teams.set(teamId, new Map());
    const roster = teams.get(teamId);
    if (!roster.has(playerId)) roster.set(playerId, {
      id: playerId, teamId, name: p.name, number: p.number, appearances: 0, gamesPlayed: 0,
      totalSeconds: 0, lastSeen: box.date, games: [], totals: Object.fromEntries(fields.map(k=>[k,0])),
      twoPointers:{made:0,attempted:0},threePointers:{made:0,attempted:0},freeThrows:{made:0,attempted:0}
    });
    const player = roster.get(playerId);
    player.appearances++;
    const seconds = toSeconds(p.minutes);
    player.totalSeconds += seconds;
    if (seconds > 0) player.gamesPlayed++;
    if (box.date >= player.lastSeen) { player.lastSeen = box.date; player.name = p.name; player.number = p.number; }
    player.games.push({matchId,date:box.date,minutes:p.minutes,points:p.points});
    for (const key of fields) player.totals[key] += Number(p[key] || 0);
    for (const key of ["twoPointers","threePointers","freeThrows"]) {
      player[key].made += Number(p[key]?.made || 0);
      player[key].attempted += Number(p[key]?.attempted || 0);
    }
  }
}
const result = {
  source: "Planillas oficiales de partidos importadas en LNA",
  generatedAt: new Date().toISOString(),
  boxscoresCount: Object.keys(boxes).length,
  teams: Object.fromEntries([...teamInfo.entries()].map(([id, info]) => {
    const players = [...(teams.get(id)?.values() || [])].map(p => {
      const avg = Object.fromEntries(fields.map(k => [k, p.gamesPlayed ? +(p.totals[k]/p.gamesPlayed).toFixed(1) : 0]));
      return {...p, minutesTotal:fmt(p.totalSeconds), minutesAverage:fmt(p.gamesPlayed ? p.totalSeconds/p.gamesPlayed : 0), averages:avg,
        twoPointersPct:p.twoPointers.attempted?+(100*p.twoPointers.made/p.twoPointers.attempted).toFixed(1):0,
        threePointersPct:p.threePointers.attempted?+(100*p.threePointers.made/p.threePointers.attempted).toFixed(1):0,
        freeThrowsPct:p.freeThrows.attempted?+(100*p.freeThrows.made/p.freeThrows.attempted).toFixed(1):0
      };
    }).sort((a,b)=>b.gamesPlayed-a.gamesPlayed || b.totals.points-a.totals.points || a.name.localeCompare(b.name,"es"));
    return [id,{teamId:id,name:info.name,clubId:info.clubId,crestUrl:info.crestUrl,url:info.url,playersCount:players.length,players}];
  }))
};
fs.writeFileSync(outPath, JSON.stringify(result,null,2)+"\n");
console.log("PLANTELES GENERADOS", JSON.stringify({boxscores:result.boxscoresCount,equipos:Object.keys(result.teams).length,jugadoresDetectados:Object.values(result.teams).reduce((n,t)=>n+t.playersCount,0)}));
