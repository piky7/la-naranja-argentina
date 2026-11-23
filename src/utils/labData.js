import { useEffect, useState } from "react";

// Cada partido se publica como un módulo independiente. El mapa de importadores
// se genera con los JSON particionados por scripts/split-lab-boxscores.cjs.
const boxscoreModules = import.meta.glob("../../data/lab/boxscores/*.json");
const loadedBoxscores = new Map();
const pendingBoxscores = new Map();

async function loadOne(matchId) {
  const id = String(matchId);
  if (loadedBoxscores.has(id)) return loadedBoxscores.get(id);
  if (pendingBoxscores.has(id)) return pendingBoxscores.get(id);
  const filename = "labBoxscores-" + encodeURIComponent(id) + ".json";
  const entry = Object.entries(boxscoreModules).find(([key]) => key.endsWith("/" + filename));
  if (!entry) return null;
  const request = entry[1]().then(module => {
    const box = module.default || module;
    loadedBoxscores.set(id, box);
    pendingBoxscores.delete(id);
    return box;
  }).catch(error => {
    pendingBoxscores.delete(id);
    throw error;
  });
  pendingBoxscores.set(id, request);
  return request;
}

export async function loadLabBoxscores(matchIds = null) {
  const ids = matchIds == null ? Object.keys(boxscoreModules).map(key =>
    decodeURIComponent(key.slice(key.lastIndexOf("/") + 1 + "labBoxscores-".length, -5))
  ) : [...new Set(matchIds.map(String))];
  const entries = await Promise.all(ids.map(async id => [id, await loadOne(id)]));
  return Object.fromEntries(entries.filter(([, box]) => box));
}

export function useLabBoxscores(enabled = true, matchIds = null) {
  const idsKey = matchIds == null ? "*" : [...new Set(matchIds.map(String))].sort().join("|");
  const [boxscores, setBoxscores] = useState(null);
  useEffect(() => {
    if (!enabled) {
      setBoxscores(null);
      return undefined;
    }
    let active = true;
    const ids = idsKey === "*" ? null : idsKey ? idsKey.split("|") : [];
    loadLabBoxscores(ids)
      .then(data => { if (active) setBoxscores(data); })
      .catch(error => console.error("No se pudieron cargar las planillas LAB:", error));
    return () => { active = false; };
  }, [enabled, idsKey]);
  return boxscores;
}
