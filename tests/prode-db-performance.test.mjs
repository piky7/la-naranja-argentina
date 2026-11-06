import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../database/prode/001_initial.sql", import.meta.url), "utf8");
const worker = readFileSync(new URL("../workers/prode/worker.js", import.meta.url), "utf8");
const profileStart = worker.indexOf('if (url.pathname === "/api/prode/profile"');
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
