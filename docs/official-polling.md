# Consultas frecuentes de datos oficiales

Las ventanas son 11:00–14:45 y 18:00–01:45 ART, cada 15 minutos: `*/15 0-4,14-17,21-23 * * *`
en UTC. Incluye el cierre de partidos nocturnos después de medianoche.
Se conserva `30 6 * * *`, las 03:30 ART, como reconciliación completa diaria.
Las ejecuciones manuales también son completas. La ventana es una decisión
operativa, no una afirmación de que todos los partidos se jueguen en ese horario.
Partidos fuera de la ventana se recuperan en la corrida diaria.

Antes de instalar dependencias, un filtro local consulta el fixture guardado y
el historial. Solo habilita el trabajo frecuente si hay una URL pendiente de hoy
o ayer cuyo horario ya comenzó (sin hora conocida se permite consultar).
Si no hay pendientes, no instala dependencias, no consulta la Liga, no compila
ni guarda artefactos. Un partido nuevo o reprogramado que todavía no figure en
el fixture local se descubre en la reconciliación diaria o manual.

La consulta frecuente descarga solo el fixture de ayer a hoy y extrae únicamente
partidos recientes aún ausentes del historial. El merge conserva partidos fuera
del intervalo y las URLs históricas. No reescribe el historial ya incorporado.
La corrida diaria mantiene la revisión de toda la temporada y próximos 30 días.
Un marcador no constituye evidencia de finalización: se mantienen sin cambios
`official-final.cjs`, la lista histórica auditada y las validaciones de vista
previa/publicación de fuente, URL, equipos, jugadores y suma de puntos.
Se permite extraer partidos de hoy, pero solo se incorporan con final oficial.
No se consulta Flashscore.

## Ejecución y consumo

- 48 activaciones frecuentes y una diaria: 49 por día, 1470 en 30 días.
- Cada activación usa un runner incluso si el filtro decide omitirla. El filtro
  ahorra instalación, consultas, compilación y almacenamiento; no elimina ese
  costo inicial. No hay garantía de consumo cero en días sin partidos.
- Tope de duración: 12 minutos en frecuentes y 30 en completas; son límites
  de protección, no estimaciones de duración ni garantías de cuota disponible.
  Un fallo o timeout se reintenta en la siguiente activación.
- Una ejecución activa y como máximo una pendiente por rama mediante concurrency,
  sin cancelar la activa. GitHub puede reemplazar una pendiente anterior.
  El actualizador de calendario comparte el grupo para impedir escrituras
  simultáneas del fixture desde estos dos workflows.
- Artefactos frecuentes retenidos un día, completos siete días. Revisar las
  duraciones reales y el consumo en Actions/Billing después de activar.
- No se hace rebase automático de datos generados: si main avanzó desde el
  checkout, falla la publicación y la siguiente corrida regenera con datos frescos.
  Un avance entre la comprobación y el push también se rechaza por Git.

GitHub puede demorar u omitir activaciones bajo carga: cada 15 minutos es la
frecuencia solicitada, no un plazo garantizado de publicación.
Referencia: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

## Validación

`node --test tests/*.test.cjs` prueba la ventana, el filtro, la medianoche ART,
la extracción del día, el rechazo de parciales, la conservación del historial
y la publicación validada. Los escenarios de extracción usan respuestas locales.
`npm run build` comprueba la web y genera el manifiesto validado.

El cambio solo queda propuesto en una rama y PR. El cron no se activa hasta que
el workflow llegue a la rama predeterminada. No se debe fusionar ni desplegar
sin autorización explícita del usuario.
