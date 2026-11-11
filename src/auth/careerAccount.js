import { getOptionalProdeIdToken, signInProdeWithGoogle, watchProdeUser } from "./prodeAuth";
import { useEffect, useState } from "react";

const BASE = "https://lna-prode-api.lnab.workers.dev";
const STORAGE_KEY = "lna-vote-visitor-id";
const ready = new Map();

function browserCareerId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(STORAGE_KEY,id); }
    return id;
  } catch { return null; }
}

export async function ensureGoogleCareer(token) {
  if (!token) throw Error("Iniciá sesión con Google para jugar");
  if (!ready.has(token)) {
    const run = fetch(BASE + "/api/prode/career/initialize", {
      method:"POST",cache:"no-store",
      headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({visitorId:browserCareerId()})
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || "No se pudo preparar Mi Carrera");
      return true;
    }).catch(error => {ready.delete(token);throw error;});
    ready.set(token,run);
    if (ready.size > 5) ready.delete(ready.keys().next().value);
  }
  return ready.get(token);
}

export async function requireCareerToken() {
  const token = await getOptionalProdeIdToken();
  if (!token) throw Error("Iniciá sesión con Google para jugar");
  await ensureGoogleCareer(token);
  return token;
}

const careerReads = new Map();
const CAREER_READ_TTL = 20000;

export function invalidateCareerReads() {
  careerReads.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("lna-vote-updated", invalidateCareerReads);
  window.addEventListener("prode-profile-updated", invalidateCareerReads);
}

export async function fetchCareerData(kind) {
  const token = await requireCareerToken();
  const key = token.slice(-16) + ":" + kind;
  const now = Date.now();
  const cached = careerReads.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;
  const entry = { promise: null, expiresAt: Number.POSITIVE_INFINITY };
  const promise = (async () => {
    const response = await fetch(BASE + "/api/prode/career/data?kind="+encodeURIComponent(kind),{
      headers:{Authorization:"Bearer "+token},cache:"no-store"
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw Error(body.error || "Mi Carrera no disponible");
    entry.expiresAt = Date.now() + CAREER_READ_TTL;
    return body;
  })();
  entry.promise = promise;
  careerReads.set(key, entry);
  if (careerReads.size > 12) careerReads.delete(careerReads.keys().next().value);
  try { return await promise; }
  catch (error) {
    if (careerReads.get(key) === entry) careerReads.delete(key);
    throw error;
  }
}

export async function fetchCareerJersey() {
  const token = await requireCareerToken();
  const response = await fetch(BASE+"/api/prode/career/jersey",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const data = await response.json();
  if (!response.ok || !data.ok) throw Error(data.error || "No se pudo cargar la camiseta");
  return data.jersey;
}

export async function saveCareerJersey(name,number) {
  const token = await requireCareerToken();
  const response = await fetch(BASE+"/api/prode/career/jersey",{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({name,number})
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw Error(data.error || "No se pudo guardar la camiseta");
  return data.jersey;
}

// Un solo acceso para Mi Carrera y Prode. El estado se restaura al abrir la PWA.
export function useCareerSession() {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    let active=true, stop;
    watchProdeUser(next => {
      if (!active) return;
      setUser(next);setLoading(false);
    }).then(unsubscribe => {if(active)stop=unsubscribe;else unsubscribe();})
      .catch(()=>{if(active){setError("No se pudo cargar la sesión Google");setLoading(false);}});
    return ()=>{active=false;stop?.();};
  },[]);
  const login = async () => {
    if (busy) return;
    setBusy(true);setError("");
    try { await signInProdeWithGoogle(); }
    catch(e){setError(e?.code==="auth/popup-closed-by-user"?"":(e?.message||"No se pudo iniciar sesión"));}
    finally{setBusy(false);}
  };
  return {user,loading,error,busy,login};
}
