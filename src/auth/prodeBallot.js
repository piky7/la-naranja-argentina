import { getOptionalProdeIdToken } from "./prodeAuth";

const PRODE_API = "https://lna-prode-api.lnab.workers.dev/api/prode/ballot";
const VOTES_API = "https://lna-votaciones-api.lnab.workers.dev";
const VISITOR_KEY = "lna-vote-visitor-id";

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Si hay sesión Google, el servidor guarda y consulta los votos bajo esa cuenta.
// Sin sesión, se mantienen los votos anónimos de Mi Carrera sin modificaciones.
export async function requestPrediction(kind, partidoId, details = null, signal = undefined) {
  const token = await getOptionalProdeIdToken();
  const path = kind === "winner" ? "/api/votos" : "/api/mvp";
  const isPost = details !== null;
  const visitorId = token ? null : getVisitorId();
  if (!token && !visitorId) throw Error("No se pudo identificar tu pronóstico");
  const url = token
    ? PRODE_API + (isPost ? "" : "?kind=" + encodeURIComponent(kind) + "&partidoId=" + encodeURIComponent(partidoId))
    : VOTES_API + path + (isPost ? "" : "?partidoId=" + encodeURIComponent(partidoId) + "&visitanteId=" + encodeURIComponent(visitorId));
  const response = await fetch(url, {
    method: isPost ? "POST" : "GET",
    headers: {
      ...(isPost ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(isPost ? { body: JSON.stringify({
      partidoId,
      ...(token ? { kind } : { visitanteId: visitorId }),
      ...(kind === "winner" ? { equipoVotado: details } : { jugadorId: details }),
    }) } : {}),
    ...(signal ? { signal } : {}),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw Error(body.error || "Pronóstico no disponible");
  return body;
}
