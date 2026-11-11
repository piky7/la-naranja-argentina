-- LNA Votaciones · tablas que antes se inicializaban durante las peticiones.
-- Idempotente: no elimina ni modifica votos, resultados ni observaciones existentes.
CREATE TABLE IF NOT EXISTS partidos_final_detectado (
  partido_id TEXT PRIMARY KEY,
  detectado_en TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS carrera_partidos (
  partido_id TEXT PRIMARY KEY,
  datos TEXT NOT NULL,
  confirmado INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS votos_mvp (
  partido_id TEXT NOT NULL,
  visitante_id TEXT NOT NULL,
  jugador_id TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(partido_id,visitante_id)
);
CREATE TABLE IF NOT EXISTS voto_limites (
  hash TEXT PRIMARY KEY,
  cantidad INTEGER NOT NULL
);
