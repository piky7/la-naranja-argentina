import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { completeProdeRedirect, signInProdeWithGoogle, signOutProde, watchProdeUser } from "../auth/prodeAuth";

export default function ProdeGoogleAccess() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = watchProdeUser((next) => { setUser(next); setLoading(false); });
    completeProdeRedirect().catch(() => setError("No se pudo completar el acceso con Google."));
    return unsubscribe;
  }, []);

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
            <div><strong>{user.displayName || "Usuario LNA"}</strong><span>Cuenta Google conectada · Grupos próximamente</span></div>
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
