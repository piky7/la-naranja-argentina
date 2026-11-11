import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { fetchCareerData, useCareerSession } from "../auth/careerAccount";
import { fetchProdeProfile } from "../auth/prodeProfile";
import ProdeCrest from "./ProdeCrest";
import { isSportsDesign, serializeSportsDesign } from "./sportsCrestDesign";
import "./CareerProfileAccess.css";
export default function CareerProfileAccess(){
 const {user,loading}=useCareerSession();const [points,setPoints]=useState(null);const [profile,setProfile]=useState(null);
 const load=useCallback(async()=>{if(!user){setPoints(null);setProfile(null);return}const [p,c]=await Promise.allSettled([fetchProdeProfile(),fetchCareerData("points")]);if(p.status==="fulfilled")setProfile(p.value);if(c.status==="fulfilled"&&Number.isFinite(Number(c.value.points)))setPoints(Number(c.value.points));},[user]);
 useEffect(()=>{load();const onUpdate=()=>load();const onVote=()=>load();const onVisible=()=>{if(!document.hidden)load()};window.addEventListener("career-auth-updated",onUpdate);window.addEventListener("prode-profile-updated",onUpdate);window.addEventListener("lna-vote-updated",onVote);document.addEventListener("visibilitychange",onVisible);return()=>{window.removeEventListener("career-auth-updated",onUpdate);window.removeEventListener("prode-profile-updated",onUpdate);window.removeEventListener("lna-vote-updated",onVote);document.removeEventListener("visibilitychange",onVisible)}},[load]);
 const crestSymbol=isSportsDesign(profile?.crestSymbol)?profile.crestSymbol:serializeSportsDesign({label:profile?.username||""});
 return <Link to="/perfil" className="lna-profile-access" aria-label="Abrir mi perfil"><span className="lna-profile-access-avatar">{profile?<ProdeCrest name={profile.username||profile.googleName||"Jugador"} primary={profile.crestPrimary} secondary={profile.crestSecondary} textColor={profile.crestText} style={profile.crestStyle} font={profile.crestFont} symbol={crestSymbol} size={34}/>:user?.photoURL?<img src={user.photoURL} alt=""/>:<UserRound size={18}/>}</span><span className="lna-profile-access-copy"><strong>{loading?"Cargando…":profile?.username||user?.displayName?.split(" ")[0]||"Mi perfil"}</strong><small>Mi perfil</small></span><span className="lna-profile-access-points"><b aria-hidden="true">★</b><strong>{points===null?"—":points.toLocaleString("es-AR")}</strong></span></Link>;
}
