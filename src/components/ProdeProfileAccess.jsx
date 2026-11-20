import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, LogIn } from "lucide-react";
import { signInProdeWithGoogle, watchProdeUser } from "../auth/prodeAuth";
import { fetchProdeProfile } from "../auth/prodeProfile";
import ProdeCrest from "./ProdeCrest";
import { isSportsDesign, serializeSportsDesign } from "./sportsCrestDesign";
import "./ProdeProfileAccess.css";

export default function CareerProfileAccess(){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[profile,setProfile]=useState(null);
 useEffect(()=>{let active=true,stop;watchProdeUser(next=>{if(active){setUser(next);setLoading(false);}}).then(fn=>{if(active)stop=fn;else fn();}).catch(()=>setLoading(false));return()=>{active=false;stop?.();};},[]);
 useEffect(()=>{let active=true;if(!user){setProfile(null);return()=>{active=false;};}fetchProdeProfile().then(p=>{if(active)setProfile(p);}).catch(()=>{if(active)setProfile(null);});const refresh=()=>fetchProdeProfile().then(p=>{if(active)setProfile(p);}).catch(()=>{});window.addEventListener("prode-profile-updated",refresh);return()=>{active=false;window.removeEventListener("prode-profile-updated",refresh);};},[user]);
 const login=async()=>{if(busy)return;setBusy(true);try{await signInProdeWithGoogle();}catch{}finally{setBusy(false);}};
 if(!loading&&!user)return <div className="lna-profile-access-guest"><button type="button" className="lna-profile-access-login" onClick={login} disabled={busy}><UserRound size={20}/><span><strong>{busy?"Conectando…":"Iniciar sesión"}</strong><small>o crear una cuenta</small></span><LogIn size={17}/></button></div>;
 const symbol=isSportsDesign(profile?.crestSymbol)?profile.crestSymbol:serializeSportsDesign({label:profile?.username||""});
 return <div className="lna-profile-access-group"><Link to="/perfil" className="lna-profile-access" aria-label="Abrir perfil Prode"><span className={"lna-profile-access-avatar"+(loading?" is-loading":"")}>{loading?<span className="lna-profile-spinner"/>:profile?<ProdeCrest name={profile.username||profile.googleName||"Jugador"} primary={profile.crestPrimary} secondary={profile.crestSecondary} textColor={profile.crestText} style={profile.crestStyle} font={profile.crestFont} symbol={symbol} size={34}/>:<UserRound size={18}/>}</span><span className="lna-profile-access-copy"><strong>{loading?"Cargando perfil…":profile?.username||"Mi perfil"}</strong><small>Perfil Prode</small></span></Link></div>;
}
