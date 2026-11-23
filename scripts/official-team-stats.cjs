const fields = {
  'Tiros de campo': 'fieldGoals', 'Tiros 2P': 'twoPointers',
  'Tiros 3P': 'threePointers', 'Tiros Libres': 'freeThrows',
  'Rebotes totales': 'rebounds', Asistencias: 'assists',
  Recuperaciones: 'steals', Tapones: 'blocks', 'Pérdidas': 'turnovers',
  'Faltas cometidas': 'fouls',
};

function normalizeTeamStats(input, score = null) {
  const result = {};
  for (const [index, key] of Object.values(fields).entries()) {
    const value = input?.[key];
    if (index < 4) {
      result[key] = value && Number.isInteger(value.made) && Number.isInteger(value.attempted) &&
        value.made >= 0 && value.attempted >= value.made && Number.isFinite(value.percentage) &&
        value.percentage >= 0 && value.percentage <= 100 &&
        Math.abs(value.percentage - (value.attempted ? 100 * value.made / value.attempted : 0)) <= 1
        ? { made: value.made, attempted: value.attempted, percentage: value.percentage } : null;
    } else result[key] = Number.isInteger(value) && value >= 0 ? value : null;
  }
  const { fieldGoals: fg, twoPointers: two, threePointers: three } = result;
  if (fg && two && three && (fg.made !== two.made + three.made || fg.attempted !== two.attempted + three.attempted)) {
    result.fieldGoals = result.twoPointers = result.threePointers = null;
  }
  if (Number.isInteger(score) && two && three && result.freeThrows &&
      two.made * 2 + three.made * 3 + result.freeThrows.made !== score) {
    for (const key of ['fieldGoals', 'twoPointers', 'threePointers', 'freeThrows']) result[key] = null;
  }
  return result;
}

function extractTeamStats($, teams) {
  const root = $('#tarjeta-comparativa .comparativa');
  const ids = ['.tituloEquipoLocal', '.tituloEquipoVisitante'].map(selector =>
    Number(root.find(`${selector} img`).attr('src')?.match(/\/escudos\/\d+\/(\d+)/)?.[1]));
  const values = [{}, {}];
  if (root.length === 1 && new Set(ids).size === 2 && ids.every(id => teams.some(t => t.officialTeamId === id))) {
    root.find('.tablaResultadosEstadisticas > .linea').each((_, row) => {
      const key = fields[$(row).find('.stat-nombre-completo').text().trim()];
      if (!key) return;
      const cells = $(row).children('.col');
      [0, 2].forEach((cell, side) => {
        const text = cells.eq(cell).text().trim();
        const shot = text.match(/^(\d+)\s*\/\s*(\d+)\s+(\d+(?:[.,]\d+)?)%$/);
        values[side][key] = shot ? { made: Number(shot[1]), attempted: Number(shot[2]), percentage: Number(shot[3].replace(',', '.')) }
          : /^\d+$/.test(text) ? Number(text) : null;
      });
    });
  }
  for (const team of teams) team.teamStats = normalizeTeamStats(values[ids.indexOf(team.officialTeamId)], team.totalPlayerPoints);
}
module.exports = { extractTeamStats, normalizeTeamStats };
