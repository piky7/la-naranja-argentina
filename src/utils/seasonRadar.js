// Referencias fijas y explícitas de alto rendimiento, NO percentiles.
// El percentil 90 de una muestra incompleta provocaba que los cuatro
// ejes se saturaran al 100%, incluso en jugadores con valores normales.
export const RADAR_REFERENCES = Object.freeze({
  points: 25,
  rebounds: 12,
  assists: 8,
  steals: 3,
});

export function radarPercent(field, average) {
  if (average == null || average === "") return null;
  const value = Number(average);
  const benchmark = RADAR_REFERENCES[field];
  if (!Number.isFinite(value) || !benchmark) return null;
  return Math.max(0, Math.min(100, value / benchmark * 100));
}
