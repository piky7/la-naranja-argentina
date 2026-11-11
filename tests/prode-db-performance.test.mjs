import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../database/prode/001_initial.sql", import.meta.url), "utf8");
const runtimeMigration = readFileSync(new URL("../database/prode/002_runtime_tables.sql", import.meta.url), "utf8");
const readIndexes = readFileSync(new URL("../database/prode/004_read_indexes.sql", import.meta.url), "utf8");
const worker = readFileSync(new URL("../workers/prode/worker.js", import.meta.url), "utf8");
const profileStart = worker.indexOf('if (url.pathname === "/api/prode/me"');
const profileEnd = worker.indexOf('if (url.pathname === "/api/prode/profile/username"', profileStart);
assert.ok(profileStart >= 0 && profileEnd > profileStart);
const profile = worker.slice(profileStart, profileEnd);

test("Los índices adicionales corresponden a las consultas frecuentes", () => {
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_prode_groups_owner ON prode_groups\(owner_id\);/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_prode_vote_links_recent_user ON prode_vote_links\(user_id, submitted_at DESC\);/);
  assert.match(worker, /SELECT COUNT\(\*\) AS total FROM prode_groups WHERE owner_id = \?/);
  assert.match(worker, /FROM prode_vote_links WHERE user_id = \? ORDER BY submitted_at DESC/);
});

test("No se duplican índices ya cubiertos por PK o índices existentes", () => {
  assert.doesNotMatch(sql, /idx_prode_memberships_group/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_prode_memberships_user/);
  assert.match(sql, /PRIMARY KEY \(group_id,user_id\)/);
});

test("La carga del perfil ejecuta cuatro consultas independientes en paralelo", () => {
  assert.match(profile, /const \[crestText, styleRow, fontRow, symbolRow\] = await Promise\.all\(\[/);
  for (const name of [
    "prode_crest_texts", "prode_user_crest_styles",
    "prode_user_crest_fonts", "prode_user_crest_symbols"
  ]) assert.ok(profile.includes(name), name);
  assert.match(profile, /crestText\?\.color \|\| "#ffffff"/);
  assert.match(profile, /styleRow\?\.style \|\| "pro"/);
  assert.match(profile, /fontRow\?\.font \|\| "sport"/);
  assert.match(profile, /symbolRow\?\.symbol \|\|/);
});

test("Las tablas operativas de Prode se crean en migración, no durante las peticiones", () => {
  assert.doesNotMatch(worker, /CREATE TABLE IF NOT EXISTS/);
  for (const table of [
    "prode_membership_periods", "prode_career_links", "prode_vote_sources",
    "prode_user_crest_styles", "prode_user_crest_fonts", "prode_user_crest_symbols",
    "prode_crest_texts", "prode_user_crests", "prode_group_crests",
    "prode_career_jerseys", "prode_league_starts", "prode_initial_points", "prode_season_archives",
  ]) assert.match(runtimeMigration, new RegExp("CREATE TABLE IF NOT EXISTS " + table));
  assert.match(runtimeMigration, /INSERT OR IGNORE INTO prode_membership_periods/);
});

test("Los índices cubren períodos activos y orden cronológico de membresías", () => {
  assert.match(readIndexes, /idx_prode_membership_periods_group_entered/);
  assert.match(readIndexes, /ON prode_membership_periods\(group_id, entered_at\)/);
  assert.match(readIndexes, /idx_prode_membership_periods_active/);
  assert.match(readIndexes, /ON prode_membership_periods\(group_id, user_id\)\s+WHERE exited_at IS NULL/);
  assert.match(worker, /FROM prode_membership_periods WHERE group_id=\? ORDER BY entered_at/);
});
