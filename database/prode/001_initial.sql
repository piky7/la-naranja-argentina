-- Prode LNA · Etapa 1 (preparación). No aplicar hasta configurar D1 y autenticación.
-- Las cuentas usan identificadores del proveedor de autenticación; nunca guardar contraseñas.
CREATE TABLE IF NOT EXISTS prode_users (
  id TEXT PRIMARY KEY,
  auth_subject TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 2 AND 32),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS prode_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 3 AND 60),
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK(visibility IN ('public','private')),
  owner_id TEXT NOT NULL REFERENCES prode_users(id),
  season TEXT NOT NULL DEFAULT '2026/27',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS prode_memberships (
  group_id TEXT NOT NULL REFERENCES prode_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES prode_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id,user_id)
);
CREATE TABLE IF NOT EXISTS prode_invitations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES prode_groups(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES prode_users(id),
  expires_at TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 100 CHECK(max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0),
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Un voto único por usuario y partido, independiente de los grupos.
-- El puntaje será derivado de los votos verificados, no editable por el cliente.
CREATE TABLE IF NOT EXISTS prode_vote_links (
  user_id TEXT NOT NULL REFERENCES prode_users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  winner_team_id TEXT,
  mvp_player_id TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id,match_id)
);
CREATE INDEX IF NOT EXISTS idx_prode_groups_visibility ON prode_groups(visibility,season);
CREATE INDEX IF NOT EXISTS idx_prode_memberships_user ON prode_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_prode_invites_group ON prode_invitations(group_id);
