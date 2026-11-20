import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const profileAccess = read("../src/components/CareerProfileAccess.jsx");
const admin = read("../src/pages/Admin.jsx");

test("el perfil ya no muestra la campanita ni carga la bandeja de notificaciones", () => {
  assert.doesNotMatch(profileAccess, /NotificationBell/);
  assert.doesNotMatch(profileAccess, /prode\/notifications/);
  assert.doesNotMatch(profileAccess, /requestPrediction/);
});

test("el panel administrador ya no ofrece envíos de notificaciones", () => {
  assert.doesNotMatch(admin, /AdminNotifications/);
  assert.doesNotMatch(admin, /admin\/notifications/);
});
