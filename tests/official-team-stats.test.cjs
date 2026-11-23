const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const { extractTeamStats, normalizeTeamStats } = require('../scripts/official-team-stats.cjs');
const html = fs.readFileSync(path.join(__dirname, 'fixtures/ferro-platense-comparison.html'), 'utf8');
const teams = () => [{ officialTeamId: 112549, totalPlayerPoints: 81 }, { officialTeamId: 112566, totalPlayerPoints: 86 }];

test('captured official Ferro–Platense comparison maps ten metrics by team ID, independent of array order', () => {
  const data = teams();
  extractTeamStats(cheerio.load(html), data);
  assert.deepEqual(data[1].teamStats, {
    fieldGoals: { made: 27, attempted: 59, percentage: 45 },
    twoPointers: { made: 20, attempted: 31, percentage: 65 },
    threePointers: { made: 7, attempted: 28, percentage: 25 },
    freeThrows: { made: 25, attempted: 33, percentage: 76 },
    rebounds: 37, assists: 15, steals: 8, blocks: 3, turnovers: 12, fouls: 29,
  });
  assert.deepEqual(data[0].teamStats, {
    fieldGoals: { made: 28, attempted: 68, percentage: 41 },
    twoPointers: { made: 19, attempted: 41, percentage: 46 },
    threePointers: { made: 9, attempted: 27, percentage: 33 },
    freeThrows: { made: 16, attempted: 25, percentage: 64 },
    rebounds: 33, assists: 13, steals: 8, blocks: 1, turnovers: 12, fouls: 29,
  });
});

test('missing comparison, mismatched identity and malformed values remain explicitly missing', () => {
  for (const source of ['', html.replace('/46/112566', '/46/999')]) {
    const data = teams(); extractTeamStats(cheerio.load(source), data);
    assert.ok(data.every(t => Object.values(t.teamStats).every(v => v === null)));
  }
  const $ = cheerio.load(html);
  $('.tablaResultadosEstadisticas .linea').first().find('.col').first().text('27 / 59 99%');
  $('.tablaResultadosEstadisticas .linea').last().remove();
  const data = teams(); extractTeamStats($, data);
  assert.equal(data[1].teamStats.fieldGoals, null);
  assert.equal(data[1].teamStats.fouls, null);
  assert.equal(data[1].teamStats.rebounds, 37);
});

test('normalization preserves genuine zeros and rejects inconsistent shooting and scores', () => {
  assert.equal(normalizeTeamStats({ steals: 0, blocks: -1, rebounds: '37' }).steals, 0);
  assert.equal(normalizeTeamStats({ blocks: -1 }).blocks, null);
  assert.equal(normalizeTeamStats({ rebounds: '37' }).rebounds, null);
  const data = teams(); extractTeamStats(cheerio.load(html), data);
  assert.equal(normalizeTeamStats(data[1].teamStats, 85).freeThrows, null);
  data[1].teamStats.fieldGoals.attempted = 60;
  assert.equal(normalizeTeamStats(data[1].teamStats).twoPointers, null);
});
