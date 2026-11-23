import { useEffect, useState } from "react";
import { signInProdeWithGoogle, watchProdeUser } from "./prodeAuth";

// Sesión de usuario para las funciones del Prode.
export function useProdeSession() {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true,stop;watchProdeUser(next=>{if(active){setUser(next);setLoading(false);}}).then(fn=>{if(active)stop=fn;else fn();}).catch(()=>{if(active){setError("No se pudo cargar la sesión Google");setLoading(false);}});return()=>{active=false;stop?.();};},[]);
 const login=async()=>{if(busy)return;setBusy(true);setError("");try{await signInProdeWithGoogle();}catch(e){setError(e?.code==="auth/popup-closed-by-user"?"":(e?.message||"No se pudo iniciar sesión"));}finally{setBusy(false);}};
 return {user,loading,error,busy,login};
}
