const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { refreshComparison } = require('../scripts/backfill-official-team-stats.cjs');
const comparison = fs.readFileSync(path.join(__dirname, 'fixtures/ferro-platense-comparison.html'), 'utf8');
const url = 'https://www.laliganacional.com.ar/laliga/partido/test/ferro-vs-platense';
const record = () => ({ officialUrl: url, homeScore: 86, awayScore: 81,
  teams: [{ officialTeamId: 112566, players: [{ points: 86 }] }, { officialTeamId: 112549, players: [{ points: 81 }] }] });
const page = (status = 'finalizado', score = 86) => `<div id="status-partido" class="${status}">Finalizado</div><div id="score-local">${score}</div><div id="score-visitante">81</div>${comparison}`;

test('historical comparison refresh validates explicit current final and never mutates the input', () => {
  const history = record(); const before = structuredClone(history);
  const stats = refreshComparison(history, page());
  assert.equal(stats[0].rebounds, 37);
  assert.equal(stats[1].fieldGoals.made, 28);
  assert.deepEqual(history, before);
});

test('historical refresh rejects live status, changed scores, swapped teams and inconsistent players', () => {
  assert.throws(() => refreshComparison(record(), page('en-vivo')));
  assert.throws(() => refreshComparison(record(), page('finalizado', 85)));
  const swapped = record(); swapped.teams.reverse();
  assert.throws(() => refreshComparison(swapped, page()));
  const badPlayers = record(); badPlayers.teams[0].players[0].points--;
  assert.throws(() => refreshComparison(badPlayers, page()));
});
