import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck, Pencil, X } from "lucide-react";
import { signInProdeWithGoogle, signOutProde, watchProdeUser } from "../auth/prodeAuth";

const PRODE_API = "https://lna-prode-api.lnab.workers.dev";

export default function ProdeGoogleAccess() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

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
    if (!user) { setProfile(null); setSyncing(false); return () => { active = false; }; }
    setSyncing(true);
    setError("");
    user.getIdToken().then(async (token) => {
      const response = await fetch(PRODE_API + "/api/prode/me", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.user) throw new Error("profile");
      if (active) { setProfile(data.user); setUsername(data.user.username || ""); }
    }).catch(() => {
      if (active) setError("Tu cuenta Google está conectada, pero no pudimos registrar tu perfil Prode. Intentá recargar la página.");
    }).finally(() => { if (active) setSyncing(false); });
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
            <span className="prode-profile-avatar">{(profile?.username || "J").slice(0,1).toUpperCase()}</span>
            <div><strong>{profile?.username || "Elegí tu nombre de usuario"}</strong><span>{syncing ? "Registrando perfil Prode…" : profile?.username ? "Tu identidad pública en Prode LNA" : "Configurá tu alias para aparecer en las ligas"}</span></div>
          </div>
          <button type="button" className="prode-profile-edit-button" onClick={() => { setProfileError(""); setEditOpen(true); }} disabled={busy || syncing || !profile}><Pencil size={16}/> Mi perfil</button>
          <button type="button" onClick={logout} disabled={busy}><LogOut size={16}/> Cerrar sesión</button>
        </>
      ) : (
        <>
          <span><ShieldCheck size={16}/> Iniciá sesión para preparar tu perfil del Prode.</span>
          <button type="button" onClick={login} disabled={busy}><LogIn size={16}/> {busy ? "Conectando…" : "Continuar con Google"}</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {editOpen && <div className="prode-dialog-backdrop" onClick={() => !saving && setEditOpen(false)}><form className="prode-dialog" onClick={e => e.stopPropagation()} onSubmit={saveUsername}><div className="prode-dialog-heading"><h3>Mi perfil Prode</h3><button type="button" aria-label="Cerrar" onClick={() => setEditOpen(false)}><X size={20}/></button></div><label>Nombre de usuario<input required minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej. TripleMaestro"/></label><p>Es el nombre que verán los demás en ligas y rankings. Tu nombre y apellido de Google no se mostrarán.</p>{profileError && <p className="prode-group-error" role="alert">{profileError}</p>}<button className="prode-create-submit" type="submit" disabled={saving || !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())}>{saving ? "Guardando…" : "Guardar perfil"}</button></form></div>}
    </div>
  );
}
