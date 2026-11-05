// Lecturas GET compartidas entre rankings y fichas de Prode.
// La caché solo vive en memoria y cada cuenta Google usa sus propias claves.
// Nunca guarda tokens ni resultados fallidos y reutiliza solicitudes simultáneas.
const API = "https://lna-prode-api.lnab.workers.dev";
const entries = new Map();
const MAX_ENTRIES = 120;

export function invalidateProdeReads() {
  entries.clear();
}

export async function fetchProdeRead(path, user, { ttlMs = 20000, fresh = false } = {}) {
  if (!path.startsWith("/api/prode/") || path.startsWith("//")) {
    throw new Error("Ruta Prode inválida");
  }
  const identity = user?.uid || "anonymous";
  const key = identity + ":" + path;
  const now = Date.now();
  const previous = entries.get(key);
  if (!fresh && previous && previous.expiresAt > now) {
    return previous.promise;
  }

  const pending = (async () => {
    const token = user ? await user.getIdToken() : null;
    const response = await fetch(API + path, {
      headers: token ? { Authorization: "Bearer " + token } : {},
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Datos de Prode no disponibles");
    }
    return data;
  })();

  const entry = { promise: pending, expiresAt: now + Math.max(0, ttlMs) };
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    entries.delete(oldest);
  }
  try {
    return await pending;
  } catch (error) {
    if (entries.get(key) === entry) entries.delete(key);
    throw error;
  }
}
