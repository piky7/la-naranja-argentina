# Etapa 3: estadísticas colectivas oficiales

El popup de Inicio, Liga y Equipo comparte dos pestañas: **Stats jugadores** y
**Estadísticas equipos**. Las planillas individuales conservan sus columnas y
acciones, con selección de local/visitante. La comparativa tiene diez filas,
identifica las columnas por equipo y muestra `Sin dato` para valores ausentes o
inválidos. No obtiene datos de Flashscore ni suma jugadores para inventar
totales colectivos (por ejemplo, los rebotes de equipo pueden diferir).

## Flujo y modelo

- `extractor-liga.cjs` conserva la extracción individual y `parseOfficialFinal`.
  `scripts/official-team-stats.cjs` lee únicamente la tabla de comparativa del
  partido oficial e identifica las columnas mediante los IDs en sus escudos.
- Cada equipo extraído añade `teamStats`: cuatro objetos
  `{ made, attempted, percentage }` y seis enteros. Los faltantes son `null`.
  Se validan enteros no negativos, convertidos <= intentos, porcentajes 0–100
  y coherencia con el cociente (tolerancia de un punto porcentual porque la
  fuente redondea/trunca), suma de tiros 2P/3P y puntos de tiros contra marcador.
- El historial conserva el campo dentro del equipo. La vista previa lo mapea
  por ID interno a `matchStats[clave].teamStats[teamId]`; la publicación vuelve
  a normalizarlo. No cambia claves, arrays de jugadores ni cuartos históricos.
- Las validaciones existentes de finalización explícita, marcador, identidad
  de jugadores y suma de puntos siguen siendo necesarias para publicar.
  La comparativa nunca prueba por sí sola que un partido terminó.

## Extracción real: Ferro–Platense

Consulta realizada el 21/10/2026. Partido del 20/10/2026, final **86–81**.
[Página oficial consultada](https://www.laliganacional.com.ar/laliga/partido/v2Nrnvymk4tDnFWtZE04svv7sjer6W9p4hfS2NAFKBOJn-NNZkci-rpw==/ferro-vs-platense).

| Indicador | Ferro | Platense |
| --- | --- | --- |
| Tiros de campo | 27 / 59 · 45% | 28 / 68 · 41% |
| Tiros 2P | 20 / 31 · 65% | 19 / 41 · 46% |
| Tiros 3P | 7 / 28 · 25% | 9 / 27 · 33% |
| Tiros libres | 25 / 33 · 76% | 16 / 25 · 64% |
| Rebotes totales | 37 | 33 |
| Asistencias | 15 | 13 |
| Recuperaciones | 8 | 8 |
| Tapones | 3 | 1 |
| Pérdidas | 12 | 12 |
| Faltas cometidas | 29 | 29 |

Se extrajeron 12 jugadores por equipo; sus puntos sumaron 86 y 81.
La página confirmó el estado finalizado. Se incorporó solamente la comparativa
de este partido al historial y a los datos publicados del repositorio, sin
reemplazar jugadores, resultados ni evidencia histórica. El fragmento HTML real
de la comparativa queda en `tests/fixtures` para reproducir las pruebas offline.

## Verificación y límites

- Build de producción correcto; permanece la advertencia de tamaño del bundle.
- 15 pruebas correctas: regresiones de finalización/publicación y nuevas pruebas
  de los diez indicadores, orden de equipos, identidad errónea, datos faltantes,
  ceros reales, porcentajes imposibles y puntos inconsistentes.
- ESLint del nuevo componente correcto. Comprobación local del popup de Inicio:
  comparativa real y regreso a jugadores. No se verificaron dispositivos físicos.
- Carga histórica completada el 21/10/2026: 33/33 partidos, 66 equipos y 660 indicadores válidos. No hubo partidos parciales, omitidos ni indicadores ausentes. Se conservaron íntegros jugadores, resultados, evidencia histórica y cuartos. El informe por partido está en `docs/official-team-stats-coverage.json`. Los partidos nuevos pasan por el extractor ampliado.
- Si cambia el HTML oficial o falta una fila, no se usa otra fuente ni valores
  de ejemplo. Los valores inválidos se descartan; las otras métricas válidas
  permanecen visibles. No se incorporan gráficos ni parciales nuevos.
- Este cambio se prepara en rama y PR; no se ejecuta merge ni despliegue.

## Repetir la carga histórica

`node scripts/backfill-official-team-stats.cjs --report work/coverage.json` consulta las páginas oficiales y genera una vista previa sin cambiar datos. Agregar `--apply` incorpora únicamente las comparativas al historial y a los datos de la web. Cada página debe confirmar finalización explícita, marcador, IDs local/visitante y puntos históricos. Las métricas vuelven a pasar por el normalizador compartido.

Para capturas HTML locales puede usarse `--html-dir work/history-html`; su `manifest.json` debe contener `source: "Liga Nacional"` y `pages: [{ officialUrl, file }]`. Las capturas deben incluir el marcador, el estado y la tabla de comparativa ya cargada. En esta ejecución se consultaron las 33 páginas con el navegador y se guardaron esos fragmentos, pues la página carga la comparativa al seleccionarla. Las capturas intermedias quedan fuera del PR.

Las 15 pruebas incluyen rechazo de partidos en vivo, cambios de marcador, columnas invertidas y puntos históricos inconsistentes. La comparación estructural contra el commit anterior confirmó que los únicos cambios en los dos archivos de datos fueron los campos `teamStats`. La compilación final fue correcta, con la advertencia previa de tamaño del bundle.
