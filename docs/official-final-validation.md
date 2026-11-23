# Validación de finales oficiales

El 20/10/2026 quedaron guardados los parciales San Martín–Olímpico 60–79 y
Ferro–Platense 46–30. La vista previa los convertía en `finished` por tener
marcador y fecha anterior al día actual, independientemente del historial.
`discover-liga.cjs` ya indicaba `unverified`, pero esa señal se ignoraba.
Además, la incorporación del fixture solo agregaba partidos: nunca refrescaba
los marcadores existentes. Los puntos de un box score también pueden ser parciales.

La página individual oficial permite comprobar el cierre mediante
`#status-partido.finalizado`, con texto exacto `Finalizado`. El extractor conserva
esta evidencia y el marcador de `#score-local` / `#score-visitante`.
El historial solo incorpora partidos con esa evidencia y marcadores coincidentes
con el fixture y con los puntos individuales. Una señal ausente o desconocida
retiene el partido para una próxima consulta; no se infiere el final por la fecha.

La vista previa exige además el mapeo inequívoco de todos los jugadores y genera
resultado y estadísticas juntos. El publicador vuelve a comprobar evidencia,
URL, equipos, marcador y puntos antes de escribir cualquier archivo. Las vistas
previas viejas que solo contienen `finished` se rechazan.

Los 31 resultados correctos hasta el 19/10 se conservan mediante una lista cerrada
en `scripts/audited-official-finals.json`, con clave, URL y marcador exactos.
Esta excepción no admite otros partidos ni cambios de marcador. Sus estadísticas
y parciales por cuarto se conservan. No se extiende el corte automáticamente.

El merge refresca los partidos existentes por fecha y equipos, manteniendo la URL
ya utilizada por el historial: los enlaces cifrados oficiales cambian entre consultas.

Se volvieron a consultar los dos partidos: los finales oficiales son 86–106 y
86–81, respectivamente. Se incorporan sus estadísticas oficiales y sus entradas
en `public/published-matches.json`; no se inventan parciales por cuarto.

Verificación local y de PR:

```
node --test tests/official-sync.test.cjs
npm run build
```

Las pruebas usan copias temporales y no requieren red ni publican datos.
El workflow de pruebas tiene permisos de solo lectura y no despliega.
