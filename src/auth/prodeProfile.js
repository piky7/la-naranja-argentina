import { getProdeIdToken } from "./prodeAuth";

const PRODE_API = "https://lna-prode-api.lnab.workers.dev";

async function profileRequest(path, body) {
  const token = await getProdeIdToken();
  const response = await fetch(PRODE_API + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo actualizar tu perfil");
  return data;
}

// POST inicializa la identidad si es la primera visita.
export async function fetchProdeProfile() {
  const token = await getProdeIdToken();
  const response = await fetch(PRODE_API + "/api/prode/me", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.user) {
    throw new Error(data.error || "No se pudo cargar tu identidad de Prode");
  }
  return data.user;
}

export function saveProdeUsername(username) {
  return profileRequest("/api/prode/profile/username", { username });
}

export function saveProdeCrest({ primary, secondary, textColor, style, font, symbol }) {
  return profileRequest("/api/prode/profile/crest", { primary, secondary, textColor, style, font, symbol });
}
