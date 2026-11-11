import { getProdeIdToken } from "./prodeAuth";

const PRODE_API = "https://lna-prode-api.lnab.workers.dev";

// Fuente única de identidad: el mismo escudo y alias configurados en Prode.
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
