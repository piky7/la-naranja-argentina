import { useSyncExternalStore } from "react";

const API = import.meta.env.VITE_LNA_LIVE_OFICIAL_URL || "https://lna-live-oficial.lnab.workers.dev/api/live";
const POLL_MS = 20_000;
const STALE_AFTER_MS = 90_000;
const EMPTY_SNAPSHOT = Object.freeze({ date: null, liveMatches: [], receivedAt: 0 });

let snapshot = EMPTY_SNAPSHOT;
let lastAttemptAt = 0;
let lastSuccessAt = 0;
let inFlight = null;
let timer = null;
let staleTimer = null;
let listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

function markSnapshotStale() {
  if (!lastSuccessAt || Date.now() - lastSuccessAt <= STALE_AFTER_MS) return;
  const liveMatches = snapshot.liveMatches.map(match =>
    match.status === "finished" ? match : { ...match, isStale: true }
  );
  if (liveMatches.some((match, index) => match !== snapshot.liveMatches[index])) {
    snapshot = { ...snapshot, liveMatches };
    notify();
  }
}

export function refreshLiveSnapshot({ force = false } = {}) {
  if (inFlight) return inFlight;
  if (typeof document !== "undefined" && document.hidden) return Promise.resolve();
  if (!force && Date.now() - lastAttemptAt < 5_000) return Promise.resolve();
  lastAttemptAt = Date.now();
  inFlight = (async () => {
    try {
      const response = await fetch(API, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.liveMatches)) throw new Error("Respuesta LIVE inválida");
      lastSuccessAt = Date.now();
      snapshot = {
        date: data.date ?? null,
        liveMatches: data.liveMatches,
        receivedAt: lastSuccessAt,
      };
      notify();
    } catch (error) {
      console.warn("No se pudo actualizar LIVE:", error);
      markSnapshotStale();
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function resume() {
  if (typeof document !== "undefined" && document.hidden) return;
  // Al volver a primer plano, pedir siempre una lectura nueva: el reloj
  // del navegador puede haberse suspendido mientras la PWA estaba cerrada.
  void refreshLiveSnapshot({ force: true });
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", resume);
    if (typeof window !== "undefined") {
      window.addEventListener("focus", resume);
      window.addEventListener("pageshow", resume);
      window.addEventListener("online", resume);
    }
    timer = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) {
        markSnapshotStale();
        void refreshLiveSnapshot();
      }
    }, POLL_MS);
    staleTimer = setInterval(markSnapshotStale, 15_000);
  }
  // No esperar al primer intervalo: cargar el estado actual al suscribirse.
  void refreshLiveSnapshot({ force: true });
  return () => {
    listeners.delete(listener);
    if (listeners.size !== 0) return;
    if (timer !== null) { clearInterval(timer); timer = null; }
    if (staleTimer !== null) { clearInterval(staleTimer); staleTimer = null; }
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", resume);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("online", resume);
    }
  };
}

function getSnapshot() { return snapshot; }

/** Shared official LIVE snapshot; stale live states are never treated as current. */
export function useLiveSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
}
