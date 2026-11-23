-- Centro de notificaciones LNA. Cada aviso se guarda por usuario para conservar lectura entre dispositivos.
CREATE TABLE IF NOT EXISTS lna_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES prode_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 2 AND 90),
  message TEXT NOT NULL CHECK(length(message) BETWEEN 2 AND 500),
  href TEXT,
  type TEXT NOT NULL DEFAULT 'announcement' CHECK(type IN ('announcement')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_lna_notifications_user_created
  ON lna_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lna_notifications_user_unread
  ON lna_notifications(user_id, read_at, created_at DESC);
