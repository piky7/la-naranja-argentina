import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, LogIn } from "lucide-react";
import { fetchCareerData, useCareerSession } from "../auth/careerAccount";
import { fetchProdeProfile } from "../auth/prodeProfile";
import ProdeCrest from "./ProdeCrest";
import NotificationBell from "./NotificationBell";
import { isSportsDesign, serializeSportsDesign } from "./sportsCrestDesign";
import "./CareerProfileAccess.css";

export default function CareerProfileAccess(){
 const {user,loading,login,busy,error}=useCareerSession();
 const [points,setPoints]=useState(null);
 const [profile,setProfile]=useState(null);
 const [profileLoading,setProfileLoading]=useState(true);
 const [profileUid,setProfileUid]=useState(null);
 const load=useCallback(async()=>{
  if(!user){setPoints(null);setProfile(null);setProfileUid(null);setProfileLoading(false);return}
  const uid=user.uid;
  const cacheKey="lna-header-profile:"+uid;
  let cached=null;
  try { cached=JSON.parse(localStorage.getItem(cacheKey)||sessionStorage.getItem(cacheKey)||"null"); } catch {}
  if(cached?.profile){
   setProfile(cached.profile);
   setProfileUid(uid);
   setProfileLoading(false);
  } else {
   setProfileLoading(true);
  }
  if(cached && Number.isFinite(Number(cached.points))) setPoints(Number(cached.points));
  // El perfil y los puntos se resuelven por separado: el header no espera
  // la consulta de Mi Carrera para mostrar el alias y el escudo.
  const profileTask=fetchProdeProfile().then(nextProfile=>{
   if(nextProfile && user.uid===uid){
    setProfile(nextProfile);
    setProfileUid(uid);
    try { localStorage.setItem(cacheKey,JSON.stringify({profile:nextProfile,points:cached?.points??null})); } catch {}
   }
  }).catch(()=>{}).finally(()=>{
   if(user.uid===uid){setProfileUid(uid);setProfileLoading(false);}
  });
  const pointsTask=fetchCareerData("points").then(result=>{
   const nextPoints=Number.isFinite(Number(result.points))?Number(result.points):null;
   if(user.uid===uid) setPoints(nextPoints);
   try {
    const latest=JSON.parse(localStorage.getItem(cacheKey)||"null");
    if(latest?.profile) localStorage.setItem(cacheKey,JSON.stringify({profile:latest.profile,points:nextPoints}));
   } catch {}
  }).catch(()=>{});
  await Promise.allSettled([profileTask,pointsTask]);
 },[user]);
 useEffect(()=>{
  if(loading)return;
  load();
  const onUpdate=()=>load();
  const onVote=()=>load();
  // Solo refrescar ante cambios reales del perfil o de los puntos.
  // El montaje de otras páginas no debe reiniciar esta carga.
  window.addEventListener("prode-profile-updated",onUpdate);
  window.addEventListener("lna-vote-updated",onVote);
  return()=>{window.removeEventListener("prode-profile-updated",onUpdate);window.removeEventListener("lna-vote-updated",onVote)};
 },[load,loading]);
 const crestSymbol=isSportsDesign(profile?.crestSymbol)?profile.crestSymbol:serializeSportsDesign({label:profile?.username||""});
 const waiting=loading||(profileLoading&&profileUid!==user?.uid);
 if(!waiting&&!user){
  return <div className="lna-profile-access-guest">
   <button type="button" className="lna-profile-access-login" onClick={login} disabled={busy}>
    <UserRound size={20} aria-hidden="true"/>
    <span><strong>{busy?"Conectando…":"Iniciar sesión"}</strong><small>o crear una cuenta</small></span>
    <LogIn size={17} aria-hidden="true"/>
   </button>
   {error&&<span className="lna-profile-access-error" role="alert">{error}</span>}
  </div>;
 }
 return <div className="lna-profile-access-group">
  <Link to="/perfil" className="lna-profile-access" aria-label="Abrir mi perfil">
   <span className={"lna-profile-access-avatar"+(waiting?" is-loading":"")}>{waiting?<span className="lna-profile-spinner" aria-label="Cargando perfil"/>:profile?<ProdeCrest name={profile.username||profile.googleName||"Jugador"} primary={profile.crestPrimary} secondary={profile.crestSecondary} textColor={profile.crestText} style={profile.crestStyle} font={profile.crestFont} symbol={crestSymbol} size={34}/>:<UserRound size={18}/>}</span>
   <span className="lna-profile-access-copy"><strong>{waiting?"Cargando perfil…":profile?.username||"Mi perfil"}</strong><small>Mi perfil</small></span>
   <span className="lna-profile-access-points"><b aria-hidden="true">★</b><strong>{waiting?"…":points===null?"—":points.toLocaleString("es-AR")}</strong></span>
  </Link>
  <NotificationBell user={user}/>
 </div>;
}
