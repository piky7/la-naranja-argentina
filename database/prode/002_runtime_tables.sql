-- LNA Prode · tablas que antes se inicializaban durante las peticiones.
-- Idempotente: conserva todos los datos que ya existan en D1.
CREATE TABLE IF NOT EXISTS prode_membership_periods (
  group_id TEXT NOT NULL REFERENCES prode_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES prode_users(id) ON DELETE CASCADE,
  entered_at TEXT NOT NULL,
  exited_at TEXT,
  PRIMARY KEY(group_id,user_id,entered_at)
);
INSERT OR IGNORE INTO prode_membership_periods(group_id,user_id,entered_at)
SELECT m.group_id,m.user_id,m.joined_at FROM prode_memberships m;

CREATE TABLE IF NOT EXISTS prode_career_links (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL UNIQUE,
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS prode_vote_sources (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL UNIQUE,
  registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS prode_user_crest_styles (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  style TEXT NOT NULL DEFAULT 'pro'
);
CREATE TABLE IF NOT EXISTS prode_user_crest_fonts (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  font TEXT NOT NULL DEFAULT 'sport'
);
CREATE TABLE IF NOT EXISTS prode_user_crest_symbols (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL DEFAULT 'ball'
);
CREATE TABLE IF NOT EXISTS prode_crest_texts (
  kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  color TEXT NOT NULL,
  PRIMARY KEY(kind,entity_id)
);
CREATE TABLE IF NOT EXISTS prode_user_crests (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prode_group_crests (
  group_id TEXT PRIMARY KEY REFERENCES prode_groups(id) ON DELETE CASCADE,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prode_career_jerseys (
  user_id TEXT PRIMARY KEY REFERENCES prode_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prode_league_starts (
  group_id TEXT PRIMARY KEY REFERENCES prode_groups(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS prode_initial_points (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  points INTEGER NOT NULL CHECK(points >= 0),
  assigned_by TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(group_id,user_id),
  FOREIGN KEY(group_id,user_id) REFERENCES prode_memberships(group_id,user_id)
);
CREATE TABLE IF NOT EXISTS prode_season_archives (
  group_id TEXT NOT NULL,
  season TEXT NOT NULL,
  closed_at TEXT NOT NULL DEFAULT (datetime('now')),
  champion_user_ids TEXT NOT NULL,
  standings_json TEXT NOT NULL,
  medals_json TEXT NOT NULL,
  weekly_history_json TEXT NOT NULL,
  PRIMARY KEY(group_id,season),
  FOREIGN KEY(group_id) REFERENCES prode_groups(id) ON DELETE RESTRICT
);
