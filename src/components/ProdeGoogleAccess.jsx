import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck, Pencil, X, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { signInProdeWithGoogle, signOutProde, watchProdeUser } from "../auth/prodeAuth";
import ProdeCrest from "./ProdeCrest";

const PRODE_API = "https://lna-prode-api.lnab.workers.dev";

export default function ProdeGoogleAccess({ onReady }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [crestPrimary, setCrestPrimary] = useState("#7de83d");
  const [crestSecondary, setCrestSecondary] = useState("#10283c");
  const [crestText, setCrestText] = useState("#ffffff");
  const [crestStyle, setCrestStyle] = useState("pro");
  const [crestBusy, setCrestBusy] = useState(false);
  const [crestMessage, setCrestMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [careerLink, setCareerLink] = useState(null);
  const [linkNotice, setLinkNotice] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkConfirm, setLinkConfirm] = useState(false);
  const [adminAllowed, setAdminAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe;
    watchProdeUser((next) => {
      if (active) { setUser(next); setLoading(false); }
    }).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }).catch(() => {
      if (active) { setLoading(false); setError("No se pudo cargar el acceso con Google."); }
    });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) { setProfile(null); setCareerLink(null); setSyncing(false); setProfileLoaded(true); return () => { active = false; }; }
    setProfileLoaded(false);
    setCareerLink(null); // Pendiente de verificar: no mostrar la invitación durante la carga.
    setLinkNotice(false);
    setSyncing(true);
    setError("");
    user.getIdToken().then(async (token) => {
      const response = await fetch(PRODE_API + "/api/prode/me", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.user) throw new Error("profile");
      if (active) { setProfile(data.user); setUsername(data.user.username || ""); setCrestPrimary(data.user.crestPrimary || "#7de83d"); setCrestSecondary(data.user.crestSecondary || "#10283c"); setCrestText(data.user.crestText || "#ffffff"); setCrestStyle(data.user.crestStyle || "pro"); }
      const linkRes = await fetch(PRODE_API + "/api/prode/career-link", { headers: { Authorization: "Bearer " + token } });
      if (linkRes.ok) { const link = await linkRes.json(); if (active) setCareerLink(Boolean(link.linked)); }
    }).catch(() => {
      if (active) setError("Tu cuenta Google está conectada, pero no pudimos registrar tu perfil Prode. Intentá recargar la página.");
    }).finally(() => { if (active) { setSyncing(false); setProfileLoaded(true); } });
    return () => { active = false; };
  }, [user]);

  useEffect(() => { if (!loading && profileLoaded) onReady?.(true); }, [loading, profileLoaded, onReady]);

  // No basarse en el alias: el Worker verifica firma Firebase y el UID autorizado.
  useEffect(() => {
    let active = true;
    setAdminAllowed(false);
    if (!user) return () => { active = false; };
    user.getIdToken().then(token => fetch(PRODE_API + "/api/prode/admin/access", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store"
    })).then(async response => {
      if (!response.ok) return;
      const result = await response.json();
      if (active && result.ok && result.admin === true) setAdminAllowed(true);
    }).catch(() => { /* Sin permiso o sin conexión: nunca mostrar el enlace. */ });
    return () => { active = false; };
  }, [user]);

  const saveUsername = async (event) => {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true); setProfileError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(PRODE_API + "/api/prode/profile/username", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || "No se pudo guardar el perfil");
      setProfile(prev => ({ ...prev, username: data.username }));
      setEditOpen(false);
      window.dispatchEvent(new Event("prode-profile-updated"));
    } catch (e) { setProfileError(e.message || "Error de conexión"); }
    finally { setSaving(false); }
  };

  const saveCrest = async () => {
    if (!user || crestBusy) return;
    setCrestBusy(true); setCrestMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(PRODE_API + "/api/prode/profile/crest", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ primary: crestPrimary, secondary: crestSecondary, textColor: crestText, style: crestStyle }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || "No se pudo guardar el avatar");
      setProfile(prev => ({ ...prev, crestPrimary: data.crestPrimary, crestSecondary: data.crestSecondary, crestText: data.crestText, crestStyle: data.crestStyle }));
      setCrestMessage("Avatar guardado correctamente");
      window.dispatchEvent(new Event("prode-profile-updated"));
    } catch (error) { setCrestMessage(error.message || "Error al guardar"); }
    finally { setCrestBusy(false); }
  };

  const linkCareer = async () => {
    if (!user || linkBusy || !linkConfirm) return;
    const visitorId = localStorage.getItem("lna-vote-visitor-id");
    if (!visitorId) { setLinkError("Primero abrí Mi Carrera en este navegador. No podemos vincular votos de otro dispositivo automáticamente."); return; }
    setLinkBusy(true); setLinkError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(PRODE_API + "/api/prode/career-link", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo vincular");
      setCareerLink(true); setLinkConfirm(false); setLinkNotice(true);
      // Actualizar los rankings sin pedir que el usuario cambie su alias.
      window.dispatchEvent(new Event("prode-profile-updated"));
    } catch (e) { setLinkError(e.message || "Error de conexión"); }
    finally { setLinkBusy(false); }
  };

  useEffect(() => {
    if (!linkNotice) return;
    const timeout = setTimeout(() => setLinkNotice(false), 4500);
    return () => clearTimeout(timeout);
  }, [linkNotice]);

  const login = async () => {
    setError("");
    setBusy(true);
    try { await signInProdeWithGoogle(); }
    catch { setError("No se pudo iniciar sesión. Intentá nuevamente."); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    setBusy(true);
    try { await signOutProde(); }
    catch { setError("No se pudo cerrar la sesión."); }
    finally { setBusy(false); }
  };

  return (
    <div className="prode-google-access">
      {loading ? <span>Comprobando sesión…</span> : user ? (
        <>
          <div className="prode-google-identity">
            <ProdeCrest name={profile?.username || "Jugador"} primary={profile?.crestPrimary} secondary={profile?.crestSecondary} textColor={profile?.crestText} style={profile?.crestStyle} size={55} className="prode-account-crest"/>
            <div className="prode-identity-info">
              <div className="prode-identity-name-row">
                <strong>{profile?.username || "Elegí tu nombre de usuario"}</strong>
                <div className="prode-account-actions">
                  {adminAllowed && <Link className="prode-admin-entry" to="/admin" title="Panel de administración" aria-label="Abrir panel de administración de LNA"><LockKeyhole size={17}/></Link>}
                  <button type="button" className="prode-account-icon prode-account-edit" title="Mi perfil" aria-label="Editar mi perfil" onClick={() => { setProfileError(""); setEditOpen(true); }} disabled={busy || syncing || !profile}><Pencil size={17}/></button>
                  <button type="button" className="prode-account-icon prode-account-logout" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout} disabled={busy}><LogOut size={17}/></button>
                </div>
              </div>
              <span>{syncing ? "Registrando perfil Prode…" : profile?.username ? "Tu identidad pública en Prode LNA" : "Configurá tu alias para aparecer en las ligas"}</span>
            </div>
          </div>
          {(careerLink === false || linkNotice) && <div className="prode-career-link" role={linkNotice ? "status" : undefined}>
            <strong>{careerLink ? "✓ Mi Carrera vinculada" : "Vincular Mi Carrera"}</strong>
            <p>{careerLink ? "Tu cuenta Google quedó asociada a esta carrera. Los pronósticos y puntos de Prode todavía no se sincronizan." : "Vinculá la carrera de este navegador con tu cuenta Prode. No cambia los votos ni puntos existentes."}</p>
            {careerLink === false && <>
              <label className="prode-career-consent"><input type="checkbox" checked={linkConfirm} onChange={e => setLinkConfirm(e.target.checked)}/> Confirmo que esta es mi carrera y quiero asociarla a mi cuenta Google.</label>
              <button type="button" onClick={linkCareer} disabled={!linkConfirm || linkBusy}>{linkBusy ? "Vinculando…" : "Vincular Mi Carrera"}</button>
            </>}
            {linkError && <p role="alert" className="prode-group-error">{linkError}</p>}
          </div>}
        </>
      ) : (
        <>
          <span><ShieldCheck size={16}/> Iniciá sesión para preparar tu perfil del Prode.</span>
          <button type="button" onClick={login} disabled={busy}><LogIn size={16}/> {busy ? "Conectando…" : "Continuar con Google"}</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {editOpen && <div className="prode-dialog-backdrop" onClick={() => !saving && setEditOpen(false)}><form className="prode-dialog" onClick={e => e.stopPropagation()} onSubmit={saveUsername}><div className="prode-dialog-heading"><h3>Mi perfil Prode</h3><button type="button" aria-label="Cerrar" onClick={() => setEditOpen(false)}><X size={20}/></button></div><label>Nombre de usuario<input required minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej. TripleMaestro"/></label><p>Es el nombre que verán los demás en ligas y rankings. Tu nombre y apellido de Google no se mostrarán.</p>

        <fieldset className="prode-avatar-styles">
          <legend>Elegí tu modelo de avatar</legend>
          <div className="prode-avatar-style-grid">
            {[{id:"elite",label:"Escudo Elite"},{id:"pro",label:"Insignia Pro"},{id:"legend",label:"Emblema Legend"}].map(option => (
              <button key={option.id} type="button" aria-pressed={crestStyle === option.id}
                className={"prode-avatar-style-option" + (crestStyle === option.id ? " is-selected" : "")}
                onClick={() => setCrestStyle(option.id)}>
                <ProdeCrest name={username || "Jugador"} primary={crestPrimary} secondary={crestSecondary}
                  textColor={crestText} style={option.id} size={66}/>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="prode-crest-config">
          <ProdeCrest name={username || "Jugador"} primary={crestPrimary} secondary={crestSecondary} textColor={crestText} style={crestStyle} size={90}/>
          <div className="prode-crest-colors">
            <label>Color principal<input type="color" value={crestPrimary} onChange={e => setCrestPrimary(e.target.value)}/></label>
            <label>Color secundario<input type="color" value={crestSecondary} onChange={e => setCrestSecondary(e.target.value)}/></label>
            <label>Color del texto<input type="color" value={crestText} onChange={e => setCrestText(e.target.value)}/></label>
          </div>
        </div>
        <button className="prode-crest-save" type="button" disabled={crestBusy} onClick={saveCrest}>{crestBusy ? "Guardando avatar…" : "Guardar avatar"}</button>
        {crestMessage && <p role="status" className="prode-crest-feedback">{crestMessage}</p>}{profileError && <p className="prode-group-error" role="alert">{profileError}</p>}<button className="prode-create-submit" type="submit" disabled={saving || !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())}>{saving ? "Guardando…" : "Guardar perfil"}</button></form></div>}
    </div>
  );
}
