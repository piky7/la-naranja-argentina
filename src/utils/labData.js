import { useEffect, useState } from "react";

let boxscoresCache = null;
let boxscoresRequest = null;

export function loadLabBoxscores() {
  if (boxscoresCache) return Promise.resolve(boxscoresCache);
  if (!boxscoresRequest) {
    boxscoresRequest = import("../../data/lab/labBoxscores.json")
      .then(module => {
        boxscoresCache = module.default || module;
        return boxscoresCache;
      })
      .catch(error => {
        boxscoresRequest = null;
        throw error;
      });
  }
  return boxscoresRequest;
}

export function useLabBoxscores(enabled = true) {
  const [boxscores, setBoxscores] = useState(() => boxscoresCache);
  useEffect(() => {
    if (!enabled || boxscores) return undefined;
    let active = true;
    loadLabBoxscores()
      .then(data => { if (active) setBoxscores(data); })
      .catch(error => console.error("No se pudieron cargar las planillas LAB:", error));
    return () => { active = false; };
  }, [enabled, boxscores]);
  return boxscores;
}
