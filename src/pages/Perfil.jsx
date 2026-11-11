import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, LogIn, LogOut, Save, UserRound, X } from "lucide-react";
import { fetchCareerData, useCareerSession } from "../auth/careerAccount";
import { fetchProdeProfile, saveProdeCrest, saveProdeUsername } from "../auth/prodeProfile";
import { signOutProde } from "../auth/prodeAuth";
import ProdeCrest from "../components/ProdeCrest";
import {
  DEFAULT_SPORTS_DESIGN, SPORTS_SHAPES, SPORTS_PATTERNS, SPORTS_PLACEMENTS, SPORTS_BORDERS,
  parseSportsDesign, serializeSportsDesign,
} from "../components/sportsCrestDesign";
import "./Perfil.css";

const DEFAULT_PROFILE = { username:"", primary:"#7de83d", secondary:"#10283c", text:"#ffffff", font:"sport", design:{...DEFAULT_SPORTS_DESIGN} };

export default function Perfil(){
 const {user,loading,login,busy,error}=useCareerSession();
 const [profile,setProfile]=useState(null);
 const [points,setPoints]=useState(null);
 const [profileLoading,setProfileLoading]=useState(false);
 const [draft,setDraft]=useState(DEFAULT_PROFILE);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const [messageError,setMessageError]=useState("");
 const [loadError,setLoadError]=useState("");
 const [logoutConfirmOpen,setLogoutConfirmOpen]=useState(false);
 const [logoutBusy,setLogoutBusy]=useState(false);
 const [logoutError,setLogoutError]=useState("");
 const loadProfile=useCallback(async()=>{
  if(!user){setProfile(null);setPoints(null);return}
  setProfileLoading(true);
  const [p,c]=await Promise.allSettled([fetchProdeProfile(),fetchCareerData("points")]);
  const next=p.status==="fulfilled"?p.value:null;
  setProfile(next);
  setLoadError(p.status==="rejected"?(p.reason?.message||"No se pudo cargar el perfil."): "");
  setPoints(c.status==="fulfilled"&&Number.isFinite(Number(c.value.points))?Number(c.value.points):null);
  if(next){const design=parseSportsDesign(next.crestSymbol);if(!design.label)design.label=next.username||"";setDraft({username:next.username||"",primary:next.crestPrimary||"#7de83d",secondary:next.crestSecondary||"#10283c",text:next.crestText||"#ffffff",font:next.crestFont||"sport",design});}
  setProfileLoading(false);
 },[user]);
 useEffect(()=>{loadProfile();const onProfile=()=>loadProfile();const onVote=()=>loadProfile();window.addEventListener("prode-profile-updated",onProfile);window.addEventListener("lna-vote-updated",onVote);return()=>{window.removeEventListener("prode-profile-updated",onProfile);window.removeEventListener("lna-vote-updated",onVote)}},[loadProfile]);
 const crestSymbol=useMemo(()=>serializeSportsDesign(draft.design),[draft.design]);
 const crestName=draft.username||profile?.googleName||user?.displayName||"Jugador";
 const setField=(key,value)=>setDraft(current=>({...current,[key]:value}));
 const setDesign=(key,value)=>setDraft(current=>({...current,design:{...current.design,[key]:value}}));
 const logout=async()=>{
  if(logoutBusy)return;
  setLogoutBusy(true);setLogoutError("");
  try{await signOutProde();setLogoutConfirmOpen(false);}
  catch(err){setLogoutError(err?.message||"No se pudo cerrar la sesión. Intentá nuevamente.");}
  finally{setLogoutBusy(false);}
 };
 const save=async(event)=>{
  event.preventDefault();if(saving)return;
  const username=draft.username.trim();
  if(!/^[a-zA-Z0-9_]{3,20}$/.test(username)){setMessageError("El alias debe tener entre 3 y 20 caracteres: letras, números o guion bajo.");return}
  setSaving(true);setMessage("");setMessageError("");
  try{
   await saveProdeUsername(username);
   await saveProdeCrest({primary:draft.primary,secondary:draft.secondary,textColor:draft.text,font:draft.font,style:"pro",symbol:crestSymbol});
   const updated=await fetchProdeProfile();
   setProfile(updated);
   setDraft({username:updated.username||"",primary:updated.crestPrimary,secondary:updated.crestSecondary,text:updated.crestText,font:updated.crestFont,design:parseSportsDesign(updated.crestSymbol)});
   window.dispatchEvent(new Event("prode-profile-updated"));
   setMessage("Perfil actualizado correctamente.");
  }catch(err){setMessageError(err.message||"No se pudieron guardar los cambios.");}
  finally{setSaving(false)}
 };
 return <main className="lna-profile-page"><div className="lna-profile-wrap">
  <Link to="/" className="lna-profile-back"><ArrowLeft size={16}/> Volver a LNA</Link>
  <header className="lna-profile-heading"><span><UserRound size={23}/></span><div><small>LA NARANJA ARGENTINA</small><h1>MI PERFIL</h1></div></header>
  {loading?<p className="lna-profile-status"><span className="lna-profile-spinner"/> Cargando tu cuenta…</p>:!user?<section className="lna-profile-card"><h2>Ingresá a tu perfil</h2><p>Usá tu cuenta de Google para configurar tu identidad LNA.</p><button type="button" onClick={login} disabled={busy}><LogIn size={17}/>{busy?"Conectando…":"Continuar con Google"}</button>{error&&<small role="alert">{error}</small>}</section>:profileLoading||!profile?<section className="lna-profile-loading" role="status">{loadError?<><strong>No pudimos cargar tu perfil</strong><small>{loadError}</small><button type="button" onClick={loadProfile}>Reintentar</button></>:<><span className="lna-profile-spinner"/><strong>Cargando tu perfil…</strong><small>Estamos preparando tu escudo y tus datos.</small></>}</section>:<>
   <section className="lna-profile-identity"><div className="lna-profile-crest"><ProdeCrest name={crestName} primary={draft.primary} secondary={draft.secondary} textColor={draft.text} style="pro" font={draft.font} symbol={crestSymbol} size={94}/></div><div className="lna-profile-identity-copy"><small>IDENTIDAD LNA</small><h2>{profile.username||profile.googleName||"Jugador"}</h2><span>{user.email||""}</span><p>Tu alias y escudo se comparten entre Prode y Mi Carrera.</p></div></section>
   <section className="lna-profile-history"><span aria-hidden="true">★</span><div><small>PUNTOS HISTÓRICOS</small><strong>{points===null?"—":points.toLocaleString("es-AR")} PTS</strong></div></section>
   <section className="lna-profile-session">
    <div><small>SESIÓN ACTIVA</small><strong>{user.email||"Cuenta Google conectada"}</strong></div>
    <button type="button" onClick={()=>{setLogoutError("");setLogoutConfirmOpen(true)}}><LogOut size={16}/>Cerrar sesión</button>
    {logoutError&&<p role="alert">{logoutError}</p>}
   </section>
   <form className="lna-profile-editor" onSubmit={save}>
    <div className="lna-profile-editor-heading"><div><small>PERSONALIZACIÓN</small><h2>Tu identidad deportiva</h2></div><span>PERFIL LNA</span></div>
    <label className="lna-profile-field">Alias público<input value={draft.username} onChange={e=>setField("username",e.target.value.replace(/\s/g,"").slice(0,20))} minLength={3} maxLength={20} autoComplete="nickname" placeholder="Ej. Piky_10"/><small>Entre 3 y 20 caracteres. Letras, números y guion bajo. Debe ser único.</small></label>
    <div className="lna-profile-editor-preview"><div><small>VISTA PREVIA</small><strong>{crestName}</strong></div><ProdeCrest name={crestName} primary={draft.primary} secondary={draft.secondary} textColor={draft.text} style="pro" font={draft.font} symbol={crestSymbol} size={86}/></div>
    <label className="lna-profile-field">Nombre dentro del escudo<input value={draft.design.label} maxLength={20} onChange={e=>setDesign("label",e.target.value.toUpperCase())} placeholder="Ej. CLUB PIKY"/><small>Puede ser distinto de tu alias. Hasta 20 caracteres.</small></label>
    <div className="lna-profile-editor-section"><h3>Colores del escudo</h3><div className="lna-profile-colors">
      <label><span>Principal</span><input type="color" value={draft.primary} onChange={e=>setField("primary",e.target.value)}/><code>{draft.primary.toUpperCase()}</code></label>
      <label><span>Secundario</span><input type="color" value={draft.secondary} onChange={e=>setField("secondary",e.target.value)}/><code>{draft.secondary.toUpperCase()}</code></label>
      <label><span>Texto</span><input type="color" value={draft.text} onChange={e=>setField("text",e.target.value)}/><code>{draft.text.toUpperCase()}</code></label>
    </div><div className="lna-profile-palette-list" aria-label="Paletas rápidas">{[{name:"Azul hielo",colors:["#073e82","#b9e9ff","#06111c"]},{name:"Bordó oro",colors:["#7c182b","#d9aa53","#fff2cc"]},{name:"Grafito",colors:["#17232f","#d9dfe6","#101820"]},{name:"Verde",colors:["#125b40","#c0df70","#102b1c"]},{name:"Violeta",colors:["#54258d","#efa7d2","#1a0f2d"]}].map(option=><button key={option.name} type="button" title={option.name} aria-label={"Aplicar paleta "+option.name} onClick={()=>{setField("primary",option.colors[0]);setField("secondary",option.colors[1]);setField("text",option.colors[2])}}><i style={{background:option.colors[0]}}/><i style={{background:option.colors[1]}}/></button>)}</div></div>
    <div className="lna-profile-editor-section"><h3>Diseño del escudo</h3><div className="lna-profile-select-grid">
      <label>Forma<select value={draft.design.shape} onChange={e=>setDesign("shape",e.target.value)}>{SPORTS_SHAPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>Franjas<select value={draft.design.pattern} onChange={e=>setDesign("pattern",e.target.value)}>{SPORTS_PATTERNS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>Ubicación del nombre<select value={draft.design.placement} onChange={e=>setDesign("placement",e.target.value)}>{SPORTS_PLACEMENTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>Borde<select value={draft.design.border} onChange={e=>setDesign("border",e.target.value)}>{SPORTS_BORDERS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="lna-profile-font">Tipografía<select value={draft.font} onChange={e=>setField("font",e.target.value)}><option value="sport">Deportiva</option><option value="college">Universitaria</option><option value="gamer">Gamer</option></select></label>
    </div></div>
    {messageError&&<p className="lna-profile-feedback error" role="alert">{messageError}</p>}
    {message&&<p className="lna-profile-feedback success" role="status"><Check size={15}/>{message}</p>}
    <button className="lna-profile-save" type="submit" disabled={saving||draft.username.trim().length<3}><Save size={17}/>{saving?"Guardando perfil…":"Guardar perfil"}</button>
   </form>
   {logoutConfirmOpen&&<div className="lna-profile-dialog-backdrop" onClick={()=>!logoutBusy&&setLogoutConfirmOpen(false)}>
    <section className="lna-profile-dialog" role="alertdialog" aria-modal="true" aria-labelledby="lna-profile-logout-title" aria-describedby="lna-profile-logout-description" onClick={event=>event.stopPropagation()}>
     <div><h2 id="lna-profile-logout-title">¿Querés cerrar sesión?</h2><button type="button" aria-label="Cancelar" disabled={logoutBusy} onClick={()=>setLogoutConfirmOpen(false)}><X size={19}/></button></div>
     <p id="lna-profile-logout-description">Vas a cerrar tu cuenta Google en LNA. Tus puntos, pronósticos y escudo quedan guardados.</p>
     <footer><button type="button" disabled={logoutBusy} onClick={()=>setLogoutConfirmOpen(false)}>Cancelar</button><button type="button" disabled={logoutBusy} onClick={logout}>{logoutBusy?"Saliendo…":"Cerrar sesión"}</button></footer>
    </section>
   </div>}
  </>}
 </div></main>;
}
