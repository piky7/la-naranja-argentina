import { useEffect, useState } from "react";
import { LogIn, ShieldCheck, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { signInProdeWithGoogle, watchProdeUser } from "../auth/prodeAuth";
import ProdeCrest from "./ProdeCrest";
import { ensureGoogleCareer } from "../auth/careerAccount";


const PRODE_API = "https://lna-prode-api.lnab.workers.dev";
const VOTING_VISITOR_KEY = "lna-vote-visitor-id";

function getVotingVisitorId() {
  try {
    let id = localStorage.getItem(VOTING_VISITOR_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(VOTING_VISITOR_KEY, id); }
    return id;
  } catch { return null; }
}

export default function ProdeGoogleAccess({ onReady }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [voteSourceError, setVoteSourceError] = useState("");
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
    setVoteSourceError("");
    user.getIdToken().then(async (token) => {
      const response = await fetch(PRODE_API + "/api/prode/me", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.user) throw new Error("profile");
      if (active) setProfile(data.user);
      // Tanto Mi Carrera como Prode consultan una única identidad Google.
      // La inicialización es idempotente y no reemplaza una carrera ya vinculada.
      await ensureGoogleCareer(token);
      const linkRes = await fetch(PRODE_API + "/api/prode/career-link", {
        headers: { Authorization: "Bearer " + token }, cache: "no-store"
      });
      if (linkRes.ok) {
        const link = await linkRes.json();
        if (active) setCareerLink(Boolean(link.linked));
      }
      // La carga inicial no modifica el perfil: no notificar al encabezado
      // para evitar que vuelva a consultar escudo y puntos al entrar a Prode.
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



  return (
    <div className="prode-google-access">
      {loading || (user && !profile) ? <div className="prode-profile-loading" role="status" aria-live="polite"><span className="prode-profile-loading-spinner" aria-hidden="true"/><span>{error || (loading ? "Comprobando sesión…" : "Cargando tu perfil…")}</span></div> : user ? (
        <>
          <div className="prode-google-identity">
            <ProdeCrest name={profile?.username || profile?.googleName || "Jugador"} primary={profile?.crestPrimary} secondary={profile?.crestSecondary} textColor={profile?.crestText} style={profile?.crestStyle} font={profile?.crestFont} symbol={profile?.crestSymbol} size={55} className="prode-account-crest"/>
            <div className="prode-identity-info">
              <div className="prode-identity-name-row">
                <strong>{profile?.username || profile?.googleName || "Elegí tu nombre de usuario"}</strong>
                <div className="prode-account-actions">
                  {adminAllowed && <Link className="prode-admin-entry" to="/admin" title="Panel de administración" aria-label="Abrir panel de administración de LNA"><LockKeyhole size={17}/></Link>}
                  
                </div>
              </div>
              <span>{syncing ? "Registrando perfil Prode…" : profile?.username ? "Tu identidad pública en Prode LNA" : "Se muestra tu nombre de Google hasta que elijas un alias"}</span>
            </div>
          </div>
          {careerLink === false && !syncing && <div className="prode-career-link" role="status">
            <strong>Mi Carrera todavía no está sincronizada</strong>
            <p>Volvé a abrir la página para reintentar. No se borraron tus puntos anteriores.</p>
          </div>}
        </>
      ) : (
        <>
          <span><ShieldCheck size={16}/> Iniciá sesión para preparar tu perfil del Prode.</span>
          <button type="button" onClick={login} disabled={busy}><LogIn size={16}/> {busy ? "Conectando…" : "Continuar con Google"}</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {user && voteSourceError && <p role="status" className="prode-group-error">Pronósticos Prode: {voteSourceError}</p>}


    </div>
  );
}
