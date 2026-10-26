// Prototipo aislado. Obtiene marcadores acumulados de las jugadas oficiales.
// No publica ni altera estadísticas; requiere confirmar contra partidos reales.
const cheerio = require("cheerio");
function extraerParcialesDesdeAcciones(html) {
 const $ = cheerio.load(html);
 const acciones = [];
 $("li.accion").each((_,el) => {
   const nodo = $(el);
   const texto = nodo.text().replace(/\s+/g," ").trim();
   const periodo = texto.match(/Cuarto\s+(\d+)\s*-\s*\d{2}:\d{2}:\d{2}/i);
   const score = nodo.find(".informacionAdicional").first().text().trim().match(/^(\d+)\s*-\s*(\d+)$/);
   if (!periodo || !score) return;
   const p = Number(periodo[1]);
   if (!Number.isInteger(p) || p < 1 || p > 10) return;
   acciones.push({ periodo:p, local:Number(score[1]), visitante:Number(score[2]) });
 });
 // Las acciones oficiales aparecen en orden cronológico inverso: primera
 // jugada con marcador del período = último marcador registrado en él.
 const periodos = [...new Set(acciones.map(a=>a.periodo))].sort((a,b)=>a-b);
 const acumulados = periodos.map(p => acciones.find(a=>a.periodo===p));
 const faltantes = Array.from({length:Math.max(4,...periodos)},(_,i)=>i+1)
   .filter(p=>!periodos.includes(p));
 const parciales = acumulados.map((a,i) => ({
   periodo:a.periodo, local:a.local-(i?acumulados[i-1].local:0),
   visitante:a.visitante-(i?acumulados[i-1].visitante:0),
   acumuladoLocal:a.local, acumuladoVisitante:a.visitante
 }));
 const validos = faltantes.length===0 && parciales.length>=4 &&
   parciales.every(p=>p.local>=0 && p.visitante>=0);
 return { validos, faltantes, parciales, accionesConMarcador:acciones.length,
   advertencia:"Los marcadores por jugada requieren contraste con los parciales oficiales visibles; no publicar automáticamente." };
}
module.exports={extraerParcialesDesdeAcciones};
