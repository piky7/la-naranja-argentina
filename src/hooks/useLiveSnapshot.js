import { useSyncExternalStore } from "react";

const API = import.meta.env.VITE_LNA_LIVE_OFICIAL_URL || "https://lna-live-oficial.lnab.workers.dev/api/live";
const POLL_MS = 60_000;
const EMPTY_SNAPSHOT = Object.freeze({ date: null, liveMatches: [] });

let snapshot = EMPTY_SNAPSHOT;
let checkedAt = 0;
let inFlight = null;
let timer = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

export function refreshLiveSnapshot() {
  if (inFlight) return inFlight;
  if (typeof document !== "undefined" && document.hidden) return Promise.resolve();
  inFlight = (async () => {
    try {
      const response = await fetch(API, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (Array.isArray(data.liveMatches)) {
        snapshot = { date: data.date ?? null, liveMatches: data.liveMatches };
        notify();
      }
    } catch {
      // Preservar el último dato oficial mientras haya problemas de conexión.
    } finally {
      checkedAt = Date.now();
      inFlight = null;
    }
  })();
  return inFlight;
}

function resume() {
  if (typeof document !== "undefined" && document.hidden) return;
  // Una vuelta rápida a la pestaña no repite una consulta recién hecha.
  if (Date.now() - checkedAt >= POLL_MS) void refreshLiveSnapshot();
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", resume);
    if (typeof window !== "undefined") window.addEventListener("focus", resume);
    timer = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) void refreshLiveSnapshot();
    }, POLL_MS);
  }
  resume();
  return () => {
    listeners.delete(listener);
    if (listeners.size !== 0) return;
    if (timer !== null) { clearInterval(timer); timer = null; }
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", resume);
    if (typeof window !== "undefined") window.removeEventListener("focus", resume);
  };
}

function getSnapshot() { return snapshot; }

/** A single shared official LIVE poll for Home, Liga, Equipo and match dialogs. */
export function useLiveSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
}
