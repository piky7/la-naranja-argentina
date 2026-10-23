// Altas conservadoras desde las planillas oficiales. Nunca inventar posiciones.
// Se ejecuta antes de validar/publicar las estadísticas de los partidos.
const fs = require("node:fs");
const path = "src/data/players.js";
const history = JSON.parse(fs.readFileSync("liga-history.json", "utf8"));
const fixture = JSON.parse(fs.readFileSync("liga-events.json", "utf8"));
const teamMap = {112600:"lanus",112553:"gimnasia",114902:"penarol",115240:"argentino",112566:"ferro",113546:"san-martin",112809:"instituto",113870:"olimpico",112549:"platense",114561:"regatas",112657:"quimsa",114763:"la-union",112793:"atenas",114735:"boca",113652:"obera",114607:"racing-chivilcoy",114628:"independiente-oliva",113373:"san-lorenzo"};
const normalize = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const nameTokens = name => normalize(name).split(" ").filter(Boolean).sort().join(" ");
const displayName = raw => {
  const name = String(raw || "").trim().replace(/\s+/g," ");
  if (!name.includes(",")) return name;
  const [last,...rest] = name.split(",");
  return rest.length === 1 && last.trim() && rest[0].trim() ? rest[0].trim()+" "+last.trim() : name;
};
const source = fs.readFileSync(path,"utf8");
const roster = [...source.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}/g)].map(m => ({
  id:m[1], officialId:m[0].match(/officialPlayerId:\s*(\d+)/)?.[1],
  name:m[0].match(/name:\s*"([^"]+)"/)?.[1],
  team:m[0].match(/teamId:\s*"([^"]+)"/)?.[1]
}));
const byId = new Map(roster.filter(p=>p.officialId).map(p=>[p.officialId,p]));
const byTeamName = new Map();
for (const p of roster) {
  const key=p.team+"|"+normalize(p.name);
  byTeamName.set(key,[...(byTeamName.get(key)||[]),p]);
}
const fixtureUrls = new Set((fixture.matches||[]).map(m=>m.officialUrl));
const candidates = new Map();
const review = [];
for (const match of history.matches||[]) {
  if (!fixtureUrls.has(match.officialUrl)) continue;
  for (const team of match.teams||[]) {
    const teamId=teamMap[team.officialTeamId];
    if (!teamId) continue;
    for (const player of team.players||[]) {
      const id=String(player.officialPlayerId ?? "");
      const name=displayName(player.name);
      if (!/^\d+$/.test(id) || !name || normalize(name).split(" ").length < 2) {
        review.push({name,team:teamId,reason:"Identificador oficial o nombre insuficiente"});
        continue;
      }
      const existing=byId.get(id);
      if (existing) {
        if(existing.team!==teamId) review.push({name,team:teamId,reason:"Posible transferencia; requiere verificar equipo actual",existingTeam:existing.team});
        continue;
      }
      const sameName=roster.filter(p=>p.team===teamId && nameTokens(p.name)===nameTokens(name));
      if(sameName.length) {
        // El jugador ya está registrado sin ID: no duplicarlo ni modificarlo.
        continue;
      }
      const key=id+"|"+teamId;
      const prev=candidates.get(key);
      const rawNumber=String(player.number??"").trim();
      const number=/^\d{1,2}$/.test(rawNumber)?Number(rawNumber):null;
      if(prev && normalize(prev.name)!==normalize(name)){
        candidates.delete(key);
        review.push({name,team:teamId,reason:"Identificador con nombres inconsistentes"});
        continue;
      }
      candidates.set(key,{id,name,team:teamId,number});
    }
  }
}
const additions=[];
const seenIds=new Set(roster.map(p=>p.id));
for (const candidate of candidates.values()) {
  if ([...candidates.values()].some(other=>other.id===candidate.id && other.team!==candidate.team)) {
    review.push({name:candidate.name,team:candidate.team,reason:"Aparece en dos equipos; revisar transferencia"});
    continue;
  }
  const slug="oficial-"+candidate.id;
  if(seenIds.has(slug)) continue;
  seenIds.add(slug);
  additions.push(candidate);
}
if (additions.length) {
  if(!/\];\s*$/.test(source)) throw new Error("Formato de players.js inesperado; no se modificó.");
  const lines=additions.map(p=>"  {\n    id: "+JSON.stringify("oficial-"+p.id)+",\n    officialPlayerId: "+Number(p.id)+",\n    name: "+JSON.stringify(p.name)+",\n    teamId: "+JSON.stringify(p.team)+",\n    number: "+(p.number??"null")+",\n  },").join("\n");
  fs.writeFileSync(path,source.replace(/\];\s*$/, "\n  // Incorporaciones detectadas en planillas oficiales\n"+lines+"\n];\n"));
}
fs.writeFileSync("official-roster-review.json",JSON.stringify({added:additions,requiresReview:review},null,2)+"\n");
console.log("Jugadores oficiales nuevos incorporados:",additions.length,"; casos a revisar:",review.length);
