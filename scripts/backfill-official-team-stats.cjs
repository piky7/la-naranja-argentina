const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const { parseOfficialFinal } = require('./parse-official-final.cjs');
const { extractTeamStats } = require('./official-team-stats.cjs');
const { assertPublishableResult } = require('./official-final.cjs');

// A historical refresh changes collective metrics only. It cannot admit a new
// result, replace a player array, or establish finality from the comparison.
function refreshComparison(record, html) {
  const $ = cheerio.load(html);
  const final = parseOfficialFinal($, record.officialUrl);
  if (final.status !== 'finished' || final.homeScore !== record.homeScore || final.awayScore !== record.awayScore) {
    throw new Error('Sin finalización explícita o marcador distinto del historial');
  }
  if (record.teams?.length !== 2 || new Set(record.teams.map(t => t.officialTeamId)).size !== 2) {
    throw new Error('Identidad de equipos incompleta');
  }
  const teams = record.teams.map((team, index) => {
    const score = index === 0 ? record.homeScore : record.awayScore;
    if (!team.players?.length || team.players.some(p => !Number.isInteger(p.points) || p.points < 0) ||
        team.players.reduce((sum, p) => sum + p.points, 0) !== score) {
      throw new Error('Puntos históricos inconsistentes');
    }
    return { officialTeamId: team.officialTeamId, totalPlayerPoints: score };
  });
  const ids = ['.tituloEquipoLocal', '.tituloEquipoVisitante'].map(selector =>
    Number($('#tarjeta-comparativa .comparativa').find(`${selector} img`).attr('src')?.match(/\/escudos\/\d+\/(\d+)/)?.[1]));
  if (ids.some((id, i) => id !== teams[i].officialTeamId)) throw new Error('Columnas oficiales no coinciden con local/visitante');
  extractTeamStats($, teams);
  return teams.map(t => t.teamStats);
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const htmlDir = option('--html-dir', null);
  const reportFile = option('--report', 'work/team-stats-coverage.json');
  const apply = args.includes('--apply');
  const history = JSON.parse(fs.readFileSync('liga-history.json', 'utf8'));
  const { matchPlayerStats } = await import('../src/data/matchStats.js');
  const { matchResults } = await import('../src/data/matchResults.js');
  const manifest = htmlDir ? JSON.parse(fs.readFileSync(path.join(htmlDir, 'manifest.json'), 'utf8')) : null;
  if (history.source !== 'Liga Nacional' || (manifest && manifest.source !== history.source)) throw new Error('Fuente inválida');
  const report = { source: history.source, checkedAt: new Date().toISOString(), matches: [] };
  for (const record of history.matches) {
    const item = { date: record.date, officialUrl: record.officialUrl };
    try {
      if (!record.officialUrl?.startsWith('https://www.laliganacional.com.ar/laliga/partido/')) throw new Error('URL no oficial');
      const candidates = Object.entries(matchPlayerStats).filter(([, s]) => s.officialUrl === record.officialUrl);
      if (candidates.length !== 1) throw new Error('Partido sin correspondencia publicada única');
      const [key, published] = candidates[0];
      if (key.slice(0, 10) !== record.date || published.homeScore !== record.homeScore || published.awayScore !== record.awayScore) throw new Error('Historial y publicación distintos');
      let html;
      if (manifest) {
        const pages = manifest.pages.filter(p => p.officialUrl === record.officialUrl);
        if (pages.length !== 1 || path.basename(pages[0].file) !== pages[0].file) throw new Error('Captura ausente o ambigua');
        html = fs.readFileSync(path.join(htmlDir, pages[0].file), 'utf8');
      } else {
        const response = await fetch(record.officialUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
      }
      const final = parseOfficialFinal(cheerio.load(html), record.officialUrl);
      assertPublishableResult(key, { ...matchResults[key], ...final }, published);
      const stats = refreshComparison(record, html);
      item.key = key;
      item.teams = record.teams.map((team, i) => ({ name: team.name, officialTeamId: team.officialTeamId,
        available: Object.values(stats[i]).filter(v => v !== null).length,
        missing: Object.keys(stats[i]).filter(k => stats[i][k] === null) }));
      item.status = item.teams.every(t => t.available === 10) ? 'complete' : 'partial';
      record.teams.forEach((team, i) => { team.teamStats = stats[i]; });
      published.teamStats = { [published.homeTeam]: stats[0], [published.awayTeam]: stats[1] };
    } catch (error) { item.status = 'skipped'; item.reason = error.message; }
    report.matches.push(item);
    console.log(record.date, item.status, item.reason || item.teams.map(t => `${t.name}: ${t.available}/10`).join('; '));
  }
  report.summary = { total: report.matches.length,
    complete: report.matches.filter(m => m.status === 'complete').length,
    partial: report.matches.filter(m => m.status === 'partial').length,
    skipped: report.matches.filter(m => m.status === 'skipped').length };
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  if (apply) {
    fs.writeFileSync('liga-history.json', JSON.stringify(history, null, 2) + '\n');
    fs.writeFileSync('src/data/matchStats.js', 'export const matchPlayerStats = ' + JSON.stringify(matchPlayerStats, null, 2) + ';\n');
  }
  console.log(JSON.stringify(report.summary));
  if (report.summary.skipped) process.exitCode = 1;
}
module.exports = { refreshComparison };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
