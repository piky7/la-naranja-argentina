import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.BASE_URL || "/";
const loadedBoxscores = new Map();
const pendingBoxscores = new Map();

const publicFilename = id => String(id).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "") + ".json";
let publishedMatchIdsPromise = null;

async function getPublishedMatchIds() {
  if (!publishedMatchIdsPromise) {
    publishedMatchIdsPromise = fetch(`${BASE_URL}lab-boxscores/index.json`, { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("No se pudo consultar el índice de planillas LAB (HTTP " + response.status + ").");
        return response.json();
      })
      .then(index => Array.isArray(index?.matchIds) ? index.matchIds.map(String) : [])
      .catch(error => {
        publishedMatchIdsPromise = null;
        throw error;
      });
  }
  return publishedMatchIdsPromise;
}

async function loadOne(matchId) {
  const id = String(matchId);
  if (loadedBoxscores.has(id)) return loadedBoxscores.get(id);
  if (pendingBoxscores.has(id)) return pendingBoxscores.get(id);

  const filename = publicFilename(id);
  const request = fetch(`${BASE_URL}lab-boxscores/${filename}`, { cache: "no-store" })
    .then(async response => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("No se pudo cargar la planilla LAB " + id + " (HTTP " + response.status + ").");
      return response.json();
    })
    .then(box => {
      if (box) loadedBoxscores.set(id, box);
      pendingBoxscores.delete(id);
      return box;
    })
    .catch(error => {
      pendingBoxscores.delete(id);
      throw error;
    });

  pendingBoxscores.set(id, request);
  return request;
}

export async function loadLabBoxscores(matchIds = null) {
  const ids = matchIds == null
    ? await getPublishedMatchIds()
    : [...new Set(matchIds.map(String))];
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
