import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { signInProdeWithGoogle, signOutProde, watchProdeUser } from "../auth/prodeAuth";

const PRODE_API = "https://lna-prode-api.lnab.workers.dev";

export default function ProdeGoogleAccess() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);

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
      if (active) setProfile(data.user);
    }).catch(() => {
      if (active) setError("Tu cuenta Google está conectada, pero no pudimos registrar tu perfil Prode. Intentá recargar la página.");
    }).finally(() => { if (active) setSyncing(false); });
    return () => { active = false; };
  }, [user]);

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
            {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
            <div><strong>{user.displayName || "Usuario LNA"}</strong><span>{syncing ? "Registrando perfil Prode…" : profile ? "Perfil Prode registrado · Ligas disponibles" : "Cuenta Google conectada · Perfil pendiente"}</span></div>
          </div>
          <button type="button" onClick={logout} disabled={busy}><LogOut size={16}/> Cerrar sesión</button>
        </>
      ) : (
        <>
          <span><ShieldCheck size={16}/> Iniciá sesión para preparar tu perfil del Prode.</span>
          <button type="button" onClick={login} disabled={busy}><LogIn size={16}/> {busy ? "Conectando…" : "Continuar con Google"}</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
