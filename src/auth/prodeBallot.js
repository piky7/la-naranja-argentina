import { requireCareerToken } from "./careerAccount";

const API = "https://lna-prode-api.lnab.workers.dev/api/prode/ballot";

// Un pronóstico = una cuenta Google. No hay votaciones anónimas nuevas.
export async function requestPrediction(kind, partidoId, details = null, signal = undefined) {
  const token = await requireCareerToken();
  const isPost = details !== null;
  const response = await fetch(API + (isPost ? "" : "?kind=" + encodeURIComponent(kind) + "&partidoId=" + encodeURIComponent(partidoId)), {
    method: isPost ? "POST" : "GET",
    headers: { Authorization: "Bearer " + token, ...(isPost ? {"Content-Type":"application/json"} : {}) },
    ...(isPost ? { body: JSON.stringify({partidoId,kind,...(kind==="winner"?{equipoVotado:details}:{jugadorId:details})}) } : {}),
    ...(signal ? {signal} : {}),
    cache:"no-store"
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw Error(body.error || "Pronóstico no disponible");
  return body;
}
