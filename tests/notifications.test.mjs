import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const worker = read("../workers/prode/worker.js");
const schema = read("../database/prode/003_notifications.sql");
const bell = read("../src/components/NotificationBell.jsx");
const admin = read("../src/pages/AdminNotifications.jsx");
const entry = read("../src/components/CareerEntryNotices.jsx");

test("el esquema guarda notificaciones individuales y permite contar no leídas", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS lna_notifications/);
  assert.match(schema, /user_id TEXT NOT NULL REFERENCES prode_users\(id\) ON DELETE CASCADE/);
  assert.match(schema, /read_at TEXT/);
  assert.match(schema, /idx_lna_notifications_user_unread/);
});

test("la bandeja exige Firebase y limita cada consulta al UID autenticado", () => {
  const start = worker.indexOf('url.pathname === "/api/prode/notifications" && request.method === "GET"');
  const end = worker.indexOf('const readNotificationMatch', start);
  assert.ok(start >= 0 && end > start);
  const route = worker.slice(start, end);
  assert.match(route, /verifiedFirebaseUser\(request\)/);
  assert.match(route, /"firebase:" \+ identity\.uid/);
  assert.match(route, /WHERE user_id=\?/);
});

test("marcar como leída está limitado al propietario de la notificación", () => {
  const start = worker.indexOf("const readNotificationMatch");
  const end = worker.indexOf("// Envío general", start);
  const route = worker.slice(start, end);
  assert.match(route, /UPDATE lna_notifications SET read_at/);
  assert.match(route, /WHERE id=\? AND user_id=\?/);
});

test("el envío general requiere UID administrador y solo admite enlaces internos", () => {
  const start = worker.indexOf('url.pathname === "/api/prode/admin/notifications"');
  const end = worker.indexOf('if (url.pathname === "/api/prode/me"', start);
  const route = worker.slice(start, end);
  assert.match(route, /identity\.uid !== env\.ADMIN_FIREBASE_UID/);
  assert.match(route, /title\.length > 90/);
  assert.match(route, /message\.length > 500/);
  assert.match(route, /href\.startsWith\("\/\/"\)/);
  assert.match(route, /INSERT INTO lna_notifications[\s\S]*SELECT[\s\S]*FROM prode_users/);
});

test("la campanita une avisos generales y recordatorios de votación activos", () => {
  assert.match(bell, /requestPrediction\("winner"/);
  assert.match(bell, /requestPrediction\("mvp"/);
  assert.match(bell, /setPendingMatches\(checks\.filter\(Boolean\)\)/);
  assert.match(bell, /items\.filter\(item => !item\.readAt\)\.length \+ \(pendingMatches\.length \? 1 : 0\)/);
  assert.match(bell, /lna-vote-updated/);
  assert.match(bell, /if \(!user\) return null/);
});

test("el recordatorio de voto ya no abre un popup independiente en Mi Carrera", () => {
  assert.doesNotMatch(entry, /requestPrediction/);
  assert.doesNotMatch(entry, /VOTE_NOTICE_SEEN_KEY/);
});

test("el panel administrador envía título, mensaje y enlace opcional", () => {
  assert.match(admin, /\/api\/prode\/admin\/notifications/);
  assert.match(admin, /JSON\.stringify\(\{ title, message, href:/);
  assert.match(admin, /Enviar a todos los usuarios/);
});
