import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, LogIn, UserRound } from "lucide-react";
import { fetchCareerData, fetchCareerJersey, saveCareerJersey, useCareerSession } from "../auth/careerAccount";
import "./Perfil.css";

const NAME_KEY="lna-career-player-name-v1";
const NUMBER_KEY="lna-career-player-number-v1";
export default function Perfil(){
 const {user,loading,login,busy,error}=useCareerSession();
 const [name,setName]=useState("");const [number,setNumber]=useState("");
 const [draftName,setDraftName]=useState("");const [draftNumber,setDraftNumber]=useState("");
 const [points,setPoints]=useState(null);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{let active=true;if(!user)return()=>{active=false};
  Promise.allSettled([fetchCareerJersey(),fetchCareerData("points")]).then(([jerseyResult,pointsResult])=>{
   if(!active)return;
   const jersey=jerseyResult.status==="fulfilled"?jerseyResult.value:null;
   const fallbackName=(()=>{try{return localStorage.getItem(NAME_KEY)||""}catch{return ""}})();
   const fallbackNumber=(()=>{try{return localStorage.getItem(NUMBER_KEY)||""}catch{return ""}})();
   const nextName=jersey?.name||fallbackName;const nextNumber=jersey?.number??fallbackNumber;
   setName(nextName);setNumber(String(nextNumber));setDraftName(nextName);setDraftNumber(String(nextNumber));
   if(pointsResult.status==="fulfilled"&&Number.isFinite(Number(pointsResult.value.points)))setPoints(Number(pointsResult.value.points));
  });return()=>{active=false};
 },[user]);
 const save=async e=>{e.preventDefault();const clean=draftName.trim().replace(/\s+/g," ");
  if(!clean||clean.length>24){setMessage("Ingresá un nombre de hasta 24 caracteres.");return}
  if(!/^(?:[0-9]|[1-9][0-9])$/.test(draftNumber)){setMessage("Elegí un dorsal del 0 al 99.");return}
  setSaving(true);setMessage("");try{const saved=await saveCareerJersey(clean,draftNumber);const finalName=saved?.name||clean;const finalNumber=String(saved?.number??draftNumber);
   try{localStorage.setItem(NAME_KEY,finalName);localStorage.setItem(NUMBER_KEY,finalNumber)}catch{}
   setName(finalName);setNumber(finalNumber);setDraftName(finalName);setDraftNumber(finalNumber);setMessage("Perfil actualizado.");
  }catch(err){setMessage(err.message||"No se pudo guardar el perfil.")}finally{setSaving(false)}
 };
 return <main className="lna-profile-page"><div className="lna-profile-wrap"><Link to="/" className="lna-profile-back"><ArrowLeft size={16}/> Volver a LNA</Link>
  <header className="lna-profile-heading"><span><UserRound size={23}/></span><div><small>LA NARANJA ARGENTINA</small><h1>MI PERFIL</h1></div></header>
  {loading?<p className="lna-profile-status">Cargando tu cuenta…</p>:!user?<section className="lna-profile-card"><h2>Ingresá a tu perfil</h2><p>Usá tu cuenta de Google para acceder a tu jugador, tus puntos históricos y tu progreso de Mi Carrera.</p><button type="button" onClick={login} disabled={busy}><LogIn size={17}/>{busy?"Conectando…":"Continuar con Google"}</button>{error&&<small role="alert">{error}</small>}</section>:<>
   <section className="lna-profile-account"><img src={user.photoURL||""} alt="" onError={e=>{e.currentTarget.style.display="none"}}/><div><small>CUENTA CONECTADA</small><strong>{user.displayName||user.email||"Usuario LNA"}</strong><span>{user.email||""}</span></div></section>
   <section className="lna-profile-card"><div className="lna-profile-card-title"><h2>Mi jugador</h2><span>PERFIL DE JUEGO</span></div><div className="lna-profile-jersey"><div className="lna-profile-jersey-number">#{number||"—"}</div><div><strong>{name||"Todavía sin nombre"}</strong><small>Tu nombre y dorsal dentro de LNA</small></div></div>
    <form onSubmit={save}><label htmlFor="profile-name">Nombre o apodo</label><input id="profile-name" maxLength={24} value={draftName} onChange={e=>setDraftName(e.target.value)} placeholder="Tu nombre"/><label htmlFor="profile-number">Número de camiseta (0 a 99)</label><input id="profile-number" inputMode="numeric" maxLength={2} value={draftNumber} onChange={e=>setDraftNumber(e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="Ej. 7"/><button type="submit" disabled={saving}><Check size={16}/>{saving?"Guardando…":"Guardar perfil"}</button>{message&&<small className={message==="Perfil actualizado."?"success":""} role="status">{message}</small>}</form>
   </section>
   <section className="lna-profile-history"><span aria-hidden="true">★</span><div><small>PUNTOS HISTÓRICOS</small><strong>{points===null?"—":points.toLocaleString("es-AR")} PTS</strong></div></section>
  </>}
 </div></main>;
}
