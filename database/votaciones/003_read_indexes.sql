-- Índices de lectura para LNA Votaciones.
-- No modifica ni elimina votos; acelera las consultas por usuario y partido.
CREATE INDEX IF NOT EXISTS idx_votos_visitante_partido
  ON votos(visitante_id, partido_id);
CREATE INDEX IF NOT EXISTS idx_votos_partido_equipo
  ON votos(partido_id, equipo_votado);
CREATE INDEX IF NOT EXISTS idx_votos_mvp_visitante_partido
  ON votos_mvp(visitante_id, partido_id);
CREATE INDEX IF NOT EXISTS idx_votos_mvp_partido_jugador
  ON votos_mvp(partido_id, jugador_id);
