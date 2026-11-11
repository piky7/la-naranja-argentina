// Lecturas GET compartidas entre rankings, grupos y perfil de Prode.
// Deduplica solicitudes simultáneas y separa estrictamente las cuentas Google.
const API = "https://lna-prode-api.lnab.workers.dev";
const entries = new Map();
const MAX_ENTRIES = 120;

export function invalidateProdeReads() {
  entries.clear();
}

export function notifyProdeDataUpdated() {
  invalidateProdeReads();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("prode-data-updated"));
}

if (typeof window !== "undefined") {
  window.addEventListener("lna-vote-updated", invalidateProdeReads);
  window.addEventListener("prode-profile-updated", invalidateProdeReads);
  window.addEventListener("prode-data-updated", invalidateProdeReads);
}

export async function fetchProdeRead(path, user, { ttlMs = 20000, fresh = false } = {}) {
  if (!path.startsWith("/api/prode/") || path.startsWith("//")) {
    throw new Error("Ruta Prode inválida");
  }
  const identity = user?.uid || "anonymous";
  const key = identity + ":" + path;
  const now = Date.now();
  const previous = entries.get(key);
  if (!fresh && previous && previous.expiresAt > now) return previous.promise;

  const entry = { promise: null, expiresAt: Number.POSITIVE_INFINITY };
  const pending = (async () => {
    const token = user ? await user.getIdToken() : null;
    const response = await fetch(API + path, {
      headers: token ? { Authorization: "Bearer " + token } : {},
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Datos de Prode no disponibles");
    entry.expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;
    return data;
  })();
  entry.promise = pending;
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) {
    const oldest = [...entries.keys()].find(candidate => candidate !== key);
    if (oldest) entries.delete(oldest);
  }
  try {
    return await pending;
  } catch (error) {
    if (entries.get(key) === entry) entries.delete(key);
    throw error;
  }
}
