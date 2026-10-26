// Prototipo aislado: NO está conectado al Worker LIVE.
// Solo registra cierres con evidencia explícita y marcador observado en ese cierre.
function registrarCierre(estado = {}, observacion = {}) {
  const cierres = Array.isArray(estado.cierres) ? [...estado.cierres] : [];
  const periodo = Number(observacion.periodo);
  const local = observacion.local;
  const visitante = observacion.visitante;
  if (!Number.isInteger(periodo) || periodo < 1 || periodo > 4 ||
      !Number.isInteger(local) || !Number.isInteger(visitante) ||
      local < 0 || visitante < 0 ||
      observacion.evento !== "FINAL-PERIODO" ||
      observacion.inicioSiguientePeriodo === true ||
      observacion.marcadorSincronizado !== true) {
    return { cierres, aceptado: false, motivo: "Cierre no confirmado" };
  }
  const previo = cierres[periodo - 2];
  if (periodo > 1 && (!previo || previo.periodo !== periodo - 1)) {
    return { cierres, aceptado: false, motivo: "Falta cierre anterior" };
  }
  if (cierres.some(c => c.periodo === periodo)) {
    return { cierres, aceptado: false, motivo: "Cierre ya registrado" };
  }
  const puntosLocal = local - (previo?.local ?? 0);
  const puntosVisitante = visitante - (previo?.visitante ?? 0);
  if (puntosLocal < 0 || puntosVisitante < 0) {
    return { cierres, aceptado: false, motivo: "Marcador retrocedió" };
  }
  cierres.push({ periodo, local, visitante, puntosLocal, puntosVisitante });
  return { cierres, aceptado: true, motivo: null };
}
module.exports = { registrarCierre };
