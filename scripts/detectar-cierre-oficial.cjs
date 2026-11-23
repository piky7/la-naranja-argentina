// Detector de señales del HTML oficial. Prototipo aislado: no toca el Worker.
// La presencia de FINAL-PERIODO no demuestra por sí sola que el marcador
// del endpoint esté sincronizado con ese instante.
function analizarCierreOficial(htmlPagina, htmlMarcador) {
  const eventos = [...String(htmlPagina).matchAll(
    /<li\b[^>]*class=["'][^"']*\b(INICIO|FINAL)-PERIODO\b[^"']*["'][^>]*>[\s\S]*?<strong[^>]*>[\s\S]*?(?:INICIO|FINAL)-PERIODO\s*<span>\s*(\d+)\s*<\/span>/gi
  )].map(m => ({ tipo: m[1].toUpperCase(), periodo: Number(m[2]), indice: m.index }));
  const cierre = eventos.find(e => e.tipo === "FINAL");
  const inicioPosterior = cierre && eventos.some(e =>
    e.tipo === "INICIO" && e.periodo > cierre.periodo && e.indice < cierre.indice
  );
  const puntos = [...String(htmlMarcador).matchAll(
    /class=["']marcador-box[^"']*["']>\s*(\d+)\s*</gi
  )].map(m => Number(m[1]));
  const marcadorValido = puntos.length === 2 && puntos.every(Number.isInteger);
  return {
    cierreDetectado: Boolean(cierre),
    periodo: cierre?.periodo ?? null,
    inicioSiguientePeriodo: Boolean(inicioPosterior),
    marcadorActual: marcadorValido ? { local: puntos[0], visitante: puntos[1] } : null,
    // Nunca asumir sincronización solo por leer dos endpoints separados.
    marcadorSincronizado: false,
    registrable: false,
  };
}
module.exports = { analizarCierreOficial };
