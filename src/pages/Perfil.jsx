import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogIn, UserRound } from "lucide-react";
import { fetchCareerData, useCareerSession } from "../auth/careerAccount";
import { fetchProdeProfile } from "../auth/prodeProfile";
import ProdeCrest from "../components/ProdeCrest";
import { isSportsDesign, serializeSportsDesign } from "../components/sportsCrestDesign";
import "./Perfil.css";

export default function Perfil(){
 const {user,loading,login,busy,error}=useCareerSession();
 const [profile,setProfile]=useState(null);const [points,setPoints]=useState(null);const [profileLoading,setProfileLoading]=useState(false);
 const loadProfile=useCallback(async()=>{if(!user){setProfile(null);setPoints(null);return}setProfileLoading(true);
  const [prodeResult,pointsResult]=await Promise.allSettled([fetchProdeProfile(),fetchCareerData("points")]);
  if(prodeResult.status==="fulfilled")setProfile(prodeResult.value);
  if(pointsResult.status==="fulfilled"&&Number.isFinite(Number(pointsResult.value.points)))setPoints(Number(pointsResult.value.points));
  setProfileLoading(false);
 },[user]);
 useEffect(()=>{loadProfile();const onProfile=()=>loadProfile();const onVote=()=>loadProfile();window.addEventListener("prode-profile-updated",onProfile);window.addEventListener("lna-vote-updated",onVote);return()=>{window.removeEventListener("prode-profile-updated",onProfile);window.removeEventListener("lna-vote-updated",onVote)}},[loadProfile]);
 const crestSymbol=isSportsDesign(profile?.crestSymbol)?profile.crestSymbol:serializeSportsDesign({label:profile?.username||""});
 const crestName=profile?.username||profile?.googleName||user?.displayName||"Jugador";
 return <main className="lna-profile-page"><div className="lna-profile-wrap"><Link to="/" className="lna-profile-back"><ArrowLeft size={16}/> Volver a LNA</Link>
  <header className="lna-profile-heading"><span><UserRound size={23}/></span><div><small>LA NARANJA ARGENTINA</small><h1>MI PERFIL</h1></div></header>
  {loading?<p className="lna-profile-status">Cargando tu cuenta…</p>:!user?<section className="lna-profile-card"><h2>Ingresá a tu perfil</h2><p>Usá tu cuenta de Google para ver tu escudo de Prode y tus puntos históricos de Mi Carrera.</p><button type="button" onClick={login} disabled={busy}><LogIn size={17}/>{busy?"Conectando…":"Continuar con Google"}</button>{error&&<small role="alert">{error}</small>}</section>:<>
   <section className="lna-profile-identity"><div className="lna-profile-crest">{profile?<ProdeCrest name={crestName} primary={profile.crestPrimary} secondary={profile.crestSecondary} textColor={profile.crestText} style={profile.crestStyle} font={profile.crestFont} symbol={crestSymbol} size={94}/>:<span className="lna-profile-crest-placeholder">{profileLoading?"…":"—"}</span>}</div><div className="lna-profile-identity-copy"><small>IDENTIDAD LNA</small><h2>{profile?.username||profile?.googleName||user.displayName||"Jugador"}</h2><span>{user.email||""}</span><p>Este es el mismo escudo que usás en Prode y que identifica tu carrera.</p></div></section>
   {!profileLoading&&!profile&&<p className="lna-profile-status">No pudimos cargar tu escudo. Volvé a intentar en unos segundos.</p>}
   <section className="lna-profile-history"><span aria-hidden="true">★</span><div><small>PUNTOS HISTÓRICOS</small><strong>{points===null?"—":points.toLocaleString("es-AR")} PTS</strong></div></section>
  </>}
 </div></main>;
}
