import { useEffect, useState } from "react";
import { LogIn, ShieldCheck, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { signInProdeWithGoogle, watchProdeUser } from "../auth/prodeAuth";
import ProdeCrest from "./ProdeCrest";
import { fetchProdeRead } from "../utils/prodeRequestCache";
const PRODE_API = "https://lna-prode-api.lnab.workers.dev";
export default function ProdeGoogleAccess({ onReady }) {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[profileLoaded,setProfileLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[profile,setProfile]=useState(null),[syncing,setSyncing]=useState(false),[adminAllowed,setAdminAllowed]=useState(false);
 useEffect(()=>{let active=true,stop;watchProdeUser(next=>{if(active){setUser(next);setLoading(false);}}).then(fn=>{if(active)stop=fn;else fn();}).catch(()=>{if(active){setLoading(false);setError("No se pudo cargar el acceso con Google.");}});return()=>{active=false;stop?.();};},[]);
 useEffect(()=>{let active=true;if(!user){setProfile(null);setSyncing(false);setProfileLoaded(true);return()=>{active=false;};}setProfileLoaded(false);setSyncing(true);setError("");user.getIdToken().then(async token=>{const response=await fetch(PRODE_API+"/api/prode/me",{method:"POST",headers:{Authorization:"Bearer "+token}});const data=await response.json();if(!response.ok||!data.ok||!data.user)throw Error("profile");if(active)setProfile(data.user);}).catch(()=>{if(active)setError("Tu cuenta Google está conectada, pero no pudimos registrar tu perfil Prode. Intentá recargar la página.");}).finally(()=>{if(active){setSyncing(false);setProfileLoaded(true);}});return()=>{active=false;};},[user]);
 useEffect(()=>{if(!loading&&profileLoaded)onReady?.(true);},[loading,profileLoaded,onReady]);
 useEffect(()=>{let active=true;setAdminAllowed(false);if(!user)return()=>{active=false;};fetchProdeRead("/api/prode/admin/access",user).then(result=>{if(active&&result.admin===true)setAdminAllowed(true);}).catch(()=>{});return()=>{active=false;};},[user]);
 const login=async()=>{setError("");setBusy(true);try{await signInProdeWithGoogle();}catch{setError("No se pudo iniciar sesión. Intentá nuevamente.");}finally{setBusy(false);}};
 return <div className="prode-google-access">
 {loading||(user&&!profile)?<div className="prode-profile-loading" role="status" aria-live="polite"><span className="prode-profile-loading-spinner" aria-hidden="true"/><span>{error||(loading?"Comprobando sesión…":"Cargando tu perfil…")}</span></div>:user?<div className="prode-google-identity"><ProdeCrest name={profile?.username||profile?.googleName||"Jugador"} primary={profile?.crestPrimary} secondary={profile?.crestSecondary} textColor={profile?.crestText} style={profile?.crestStyle} font={profile?.crestFont} symbol={profile?.crestSymbol} size={55} className="prode-account-crest"/><div className="prode-identity-info"><div className="prode-identity-name-row"><strong>{profile?.username||profile?.googleName||"Elegí tu nombre de usuario"}</strong><div className="prode-account-actions">{adminAllowed&&<Link className="prode-admin-entry" to="/admin" title="Panel de administración" aria-label="Abrir panel de administración de LNA"><LockKeyhole size={17}/></Link>}</div></div><span>{syncing?"Registrando perfil Prode…":profile?.username?"Tu identidad pública en Prode LNA":"Se muestra tu nombre de Google hasta que elijas un alias"}</span></div></div>:<><span><ShieldCheck size={16}/> Iniciá sesión para preparar tu perfil del Prode.</span><button type="button" onClick={login} disabled={busy}><LogIn size={16}/>{busy?"Conectando…":"Continuar con Google"}</button></>}
 {error&&<p role="alert">{error}</p>}
 </div>;
}
