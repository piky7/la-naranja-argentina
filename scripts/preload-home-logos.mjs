import { readFile, readdir, writeFile } from "node:fs/promises";
import { officialSchedule } from "../src/data/officialSchedule.js";
import { matchResults } from "../src/data/matchResults.js";

const assets = await readdir(new URL("../dist/assets/", import.meta.url));
const htmlPath = new URL("../dist/index.html", import.meta.url);
const original = await readFile(htmlPath, "utf8");

const findLogo = team => {
  // Los nombres exportados en src/data/teams.js mantienen este prefijo.
  const candidates = assets.filter(name =>
    name.startsWith(team + "-") && /\.(png|webp|avif)$/.test(name));
  return candidates.length === 1 ? "/assets/" + candidates[0] : null;
};
const dateNow = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const begin = Date.parse(dateNow + "T00:00:00Z") - 86400000;
const end = begin + 16 * 86400000;
const gamesByDate = new Map();
for (const match of officialSchedule) {
  const stamp = Date.parse(match.date + "T00:00:00Z");
  if (!Number.isFinite(stamp) || stamp < begin || stamp >= end) continue;
  const result = matchResults[`${match.date}-${match.homeTeam}-${match.awayTeam}`];
  const finished = result?.status === "finished" ? 0 : 2;
  const games = gamesByDate.get(match.date) || [];
  games.push({ ...match, finished });
  gamesByDate.set(match.date, games);
}
const firstLogosByDate = {};
for (const [date, games] of gamesByDate) {
  games.sort((a,b) => a.finished - b.finished || (a.time || "").localeCompare(b.time || ""));
  const game = games[0];
  if (!game) continue;
  const logos = [...new Set([findLogo(game.homeTeam), findLogo(game.awayTeam)].filter(Boolean))];
  if (logos.length) firstLogosByDate[date] = logos;
}

// Ejecutar al parsear el HTML para que el navegador conozca los dos escudos
// antes de que React renderice las tarjetas. Sin enlace para días sin partidos.
const preload = `<script data-lna-home-crest-preload>
(function () {
  var day = new Date();
  var date = day.getFullYear() + "-" + String(day.getMonth()+1).padStart(2,"0") + "-" + String(day.getDate()).padStart(2,"0");
  var logos = ${JSON.stringify(firstLogosByDate)}[date] || [];
  for (var i = 0; i < logos.length; i++) {
    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = logos[i];
    link.fetchPriority = "high";
    document.head.appendChild(link);
  }
})();
</script>`;
if (!original.includes("</head>")) throw new Error("Falta el cierre head del HTML");
if (original.includes("data-lna-home-crest-preload")) throw new Error("Las precargas ya fueron generadas");
await writeFile(htmlPath, original.replace("</head>", preload + "\n</head>"));
console.log("Precarga de escudos Home para " + Object.keys(firstLogosByDate).length + " días: máximo dos imágenes por fecha.");
