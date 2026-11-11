import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { fetchCareerData, useCareerSession } from "../auth/careerAccount";
import "./CareerProfileAccess.css";
export default function CareerProfileAccess(){
 const {user,loading}=useCareerSession();const [points,setPoints]=useState(null);
 useEffect(()=>{let active=true;const load=async()=>{if(!user){setPoints(null);return}try{const data=await fetchCareerData("points");if(active&&Number.isFinite(Number(data.points)))setPoints(Number(data.points))}catch{}};
  load();const onAuth=()=>load();const onVote=()=>load();const onVisible=()=>{if(!document.hidden)load()};window.addEventListener("career-auth-updated",onAuth);window.addEventListener("lna-vote-updated",onVote);document.addEventListener("visibilitychange",onVisible);return()=>{active=false;window.removeEventListener("career-auth-updated",onAuth);window.removeEventListener("lna-vote-updated",onVote);document.removeEventListener("visibilitychange",onVisible)};
 },[user]);
 return <Link to="/perfil" className="lna-profile-access" aria-label="Abrir mi perfil"><span className="lna-profile-access-avatar">{user?.photoURL?<img src={user.photoURL} alt=""/>:<UserRound size={18}/>}</span><span className="lna-profile-access-copy"><strong>{loading?"Cargando…":user?.displayName?.split(" ")[0]||"Mi perfil"}</strong><small>Mi perfil</small></span><span className="lna-profile-access-points"><b aria-hidden="true">★</b><strong>{points===null?"—":points.toLocaleString("es-AR")}</strong></span></Link>;
}
