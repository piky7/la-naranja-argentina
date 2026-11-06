import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogIn, LogOut, ShieldCheck, Pencil, X, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { signInProdeWithGoogle, signOutProde, watchProdeUser } from "../auth/prodeAuth";
import ProdeCrest from "./ProdeCrest";
import { SPORTS_SHAPES, SPORTS_PATTERNS, SPORTS_PLACEMENTS, SPORTS_BORDERS, parseSportsDesign, serializeSportsDesign, isSportsDesign } from "./sportsCrestDesign";
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
  const [editOpen, setEditOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [crestPrimary, setCrestPrimary] = useState("#7de83d");
  const [crestSecondary, setCrestSecondary] = useState("#10283c");
  const [crestText, setCrestText] = useState("#ffffff");
  const [crestStyle, setCrestStyle] = useState("pro");
  const [crestFont, setCrestFont] = useState("sport");
  const [crestSymbol, setCrestSymbol] = useState(serializeSportsDesign({}));
  const updateSportsDesign = patch => setCrestSymbol(previous => serializeSportsDesign({ ...parseSportsDesign(previous), ...patch }));
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
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
      if (active) { setProfile(data.user); setUsername(data.user.username || ""); setCrestPrimary(data.user.crestPrimary || "#7de83d"); setCrestSecondary(data.user.crestSecondary || "#10283c"); setCrestText(data.user.crestText || "#ffffff"); setCrestStyle(data.user.crestStyle || "pro"); setCrestFont(data.user.crestFont || "sport"); setCrestSymbol(isSportsDesign(data.user.crestSymbol) ? data.user.crestSymbol : serializeSportsDesign({ label: data.user.username || "" })); }
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
      if (active) window.dispatchEvent(new Event("prode-profile-updated"));
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

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setProfileError("");
    try {
      const token = await user.getIdToken();
      const usernameResponse = await fetch(PRODE_API + "/api/prode/profile/username", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ username: username.trim() }),
      });
      const usernameData = await usernameResponse.json();
      if (!usernameResponse.ok || !usernameData.ok) {
        throw Error(usernameData.error || "No se pudo guardar el alias");
      }

      const crestResponse = await fetch(PRODE_API + "/api/prode/profile/crest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ primary: crestPrimary, secondary: crestSecondary, textColor: crestText, style: crestStyle, font: crestFont, symbol: crestSymbol }),
      });
      const crestData = await crestResponse.json();
      if (!crestResponse.ok || !crestData.ok) {
        throw Error("El alias se guardó, pero el escudo no. " + (crestData.error || "Intentá nuevamente."));
      }
      if (crestData.crestSymbol !== crestSymbol) {
        throw Error("El nuevo catálogo de escudos todavía no está disponible en la API. Intentá guardar nuevamente cuando termine su despliegue.");
      }

      setProfile(prev => ({
        ...prev,
        username: usernameData.username,
        crestPrimary: crestData.crestPrimary,
        crestSecondary: crestData.crestSecondary,
        crestText: crestData.crestText,
        crestStyle: crestData.crestStyle,
        crestFont: crestData.crestFont,
        crestSymbol: crestData.crestSymbol,
      }));
      setEditOpen(false);
      window.dispatchEvent(new Event("prode-profile-updated"));
    } catch (error) {
      setProfileError(error.message || "Error de conexión al guardar el perfil");
    } finally {
      setSaving(false);
    }
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
    if (busy) return;
    setBusy(true);
    try { await signOutProde(); setLogoutConfirmOpen(false); }
    catch { setError("No se pudo cerrar la sesión."); }
    finally { setBusy(false); }
  };

  return (
    <div className="prode-google-access">
      {loading ? <span>Comprobando sesión…</span> : user ? (
        <>
          <div className="prode-google-identity">
            <ProdeCrest name={profile?.username || profile?.googleName || "Jugador"} primary={profile?.crestPrimary} secondary={profile?.crestSecondary} textColor={profile?.crestText} style={profile?.crestStyle} font={profile?.crestFont} symbol={profile?.crestSymbol} size={55} className="prode-account-crest"/>
            <div className="prode-identity-info">
              <div className="prode-identity-name-row">
                <strong>{profile?.username || profile?.googleName || "Elegí tu nombre de usuario"}</strong>
                <div className="prode-account-actions">
                  {adminAllowed && <Link className="prode-admin-entry" to="/admin" title="Panel de administración" aria-label="Abrir panel de administración de LNA"><LockKeyhole size={17}/></Link>}
                  <button type="button" className="prode-account-icon prode-account-edit" title="Mi perfil" aria-label="Editar mi perfil" onClick={() => {
                    setProfileError("");
                    setUsername(profile?.username || "");
                    setCrestPrimary(profile?.crestPrimary || "#7de83d");
                    setCrestSecondary(profile?.crestSecondary || "#10283c");
                    setCrestText(profile?.crestText || "#ffffff");
                    setCrestStyle(profile?.crestStyle || "pro");
                    setCrestFont(profile?.crestFont || "sport");
                    setCrestSymbol(isSportsDesign(profile?.crestSymbol) ? profile.crestSymbol : serializeSportsDesign({ label: profile?.username || "" }));
                    setEditOpen(true);
                  }} disabled={busy || syncing || !profile}><Pencil size={17}/></button>
                  <button type="button" className="prode-account-icon prode-account-logout" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => setLogoutConfirmOpen(true)} disabled={busy}><LogOut size={17}/></button>
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
      {logoutConfirmOpen && <div className="prode-dialog-backdrop" onClick={() => !busy && setLogoutConfirmOpen(false)}>
        <div className="prode-dialog" role="alertdialog" aria-modal="true" aria-labelledby="prode-logout-title" aria-describedby="prode-logout-description" onClick={e => e.stopPropagation()}>
          <div className="prode-dialog-heading">
            <h3 id="prode-logout-title">¿Querés cerrar sesión?</h3>
            <button type="button" aria-label="Cancelar cierre de sesión" disabled={busy} onClick={() => setLogoutConfirmOpen(false)}><X size={20}/></button>
          </div>
          <p id="prode-logout-description">Vas a salir de tu cuenta Prode. Podés volver a ingresar con Google cuando quieras.</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="prode-create-submit" style={{ flex: 1, background: "#273f48", color: "#f2f7f5" }} disabled={busy} onClick={() => setLogoutConfirmOpen(false)}>Cancelar</button>
            <button type="button" className="prode-create-submit" style={{ flex: 1 }} disabled={busy} onClick={logout}>{busy ? "Saliendo…" : "Cerrar sesión"}</button>
          </div>
        </div>
      </div>}
      {editOpen && createPortal(<div className="prode-dialog-backdrop prode-crest-editor-overlay" onClick={() => !saving && setEditOpen(false)}>
        <form className="prode-dialog prode-profile-editor" onClick={e => e.stopPropagation()} onSubmit={saveProfile}>
          <div className="prode-dialog-heading">
            <h3>Mi perfil Prode</h3>
            <button type="button" aria-label="Cerrar" disabled={saving} onClick={() => setEditOpen(false)}><X size={20}/></button>
          </div>

          <div className="prode-identity-preview">
            <ProdeCrest name={username || "Jugador"} primary={crestPrimary} secondary={crestSecondary}
              textColor={crestText} style={crestStyle} font={crestFont} symbol={crestSymbol} size={80}/>
            <div className="prode-identity-preview-copy">
              <span className="prode-identity-preview-eyebrow">TU IDENTIDAD EN PRODE</span>
              <strong>{username.trim() || "Jugador"}</strong>
              <span>Temporada 2026/27 · Liga Nacional</span>
              {careerLink && <small><ShieldCheck size={13}/> Mi Carrera vinculada</small>}
            </div>
          </div>

          <label className="prode-profile-alias">Nombre de usuario
            <input required minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off"
              value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej. TripleMaestro"/>
          </label>
          <p className="prode-profile-helper">Si no elegís un alias, se muestra tu nombre de Google en Prode.</p>

          <fieldset className="prode-sports-builder">
            <legend>Forma del escudo</legend>
            <div className="prode-sports-shapes">
              {SPORTS_SHAPES.map(([id,label]) => <button key={id} type="button"
                className={"prode-sports-choice" + (parseSportsDesign(crestSymbol).shape === id ? " is-selected" : "")}
                aria-pressed={parseSportsDesign(crestSymbol).shape === id} onClick={() => updateSportsDesign({shape:id})}>
                <ProdeCrest name="" primary={crestPrimary} secondary={crestSecondary} textColor={crestText} font={crestFont}
                  symbol={serializeSportsDesign({...parseSportsDesign(crestSymbol),shape:id,pattern:"solid",placement:"none"})} size={48}/>
                <span>{label}</span>
              </button>)}
            </div>
          </fieldset>

          <fieldset className="prode-sports-builder">
            <legend>Diseño interior</legend>
            <div className="prode-sports-patterns">
              {SPORTS_PATTERNS.map(([id,label]) => <button key={id} type="button"
                className={"prode-sports-choice" + (parseSportsDesign(crestSymbol).pattern === id ? " is-selected" : "")}
                aria-pressed={parseSportsDesign(crestSymbol).pattern === id} onClick={() => updateSportsDesign({pattern:id})}>
                <ProdeCrest name="" primary={crestPrimary} secondary={crestSecondary} textColor={crestText}
                  symbol={serializeSportsDesign({...parseSportsDesign(crestSymbol),pattern:id,placement:"none"})} size={48}/>
                <span>{label}</span>
              </button>)}
            </div>
          </fieldset>

          <fieldset className="prode-sports-builder">
            <legend>Nombre del escudo</legend>
            <input className="prode-sports-name" maxLength={20} value={parseSportsDesign(crestSymbol).label}
              onChange={e => updateSportsDesign({label:e.target.value})} placeholder="Ej. CLUB PIKY"/>
            <p className="prode-profile-helper">Este nombre puede ser distinto de tu alias. Hasta 20 caracteres.</p>
            <div className="prode-sports-text-options">
              {SPORTS_PLACEMENTS.map(([id,label]) => <button key={id} type="button"
                className={"prode-sports-text-option" + (parseSportsDesign(crestSymbol).placement === id ? " is-selected" : "")}
                aria-pressed={parseSportsDesign(crestSymbol).placement === id} onClick={() => updateSportsDesign({placement:id})}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset className="prode-sports-builder">
            <legend>Borde del escudo</legend>
            <div className="prode-sports-text-options">
              {SPORTS_BORDERS.map(([id,label]) => <button key={id} type="button"
                className={"prode-sports-text-option" + (parseSportsDesign(crestSymbol).border === id ? " is-selected" : "")}
                aria-pressed={parseSportsDesign(crestSymbol).border === id} onClick={() => updateSportsDesign({border:id})}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset className="prode-profile-fonts">
            <legend>Tipografía del escudo</legend>
            <div className="prode-profile-font-grid">
              {[{id:"sport",label:"Deportiva"},{id:"college",label:"Universitaria"},{id:"gamer",label:"Gamer"}].map(option => (
                <button key={option.id} type="button" aria-pressed={crestFont === option.id}
                  className={"prode-profile-font-option" + (crestFont === option.id ? " is-selected" : "")}
                  onClick={() => setCrestFont(option.id)}>
                  <strong className={"font-" + option.id}>ABC</strong>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="prode-profile-colors">
            <legend>Colores del escudo</legend>
            <div className="prode-profile-color-grid">
              {[{label:"Principal",value:crestPrimary,set:setCrestPrimary},{label:"Secundario",value:crestSecondary,set:setCrestSecondary},{label:"Texto",value:crestText,set:setCrestText}].map(option => (
                <label key={option.label}>{option.label}
                  <input type="color" value={option.value} onChange={e => option.set(e.target.value)}/>
                </label>
              ))}
            </div>
            <div className="prode-profile-palette-list" aria-label="Paletas rápidas">
              {[{name:"Azul hielo",colors:["#073e82","#b9e9ff","#06111c"]},
                {name:"Bordó oro",colors:["#7c182b","#d9aa53","#fff2cc"]},
                {name:"Grafito",colors:["#17232f","#d9dfe6","#101820"]},
                {name:"Verde",colors:["#125b40","#c0df70","#102b1c"]},
                {name:"Violeta",colors:["#54258d","#efa7d2","#1a0f2d"]}].map(option => (
                <button key={option.name} type="button" title={option.name} aria-label={"Aplicar paleta " + option.name}
                  className="prode-profile-palette"
                  onClick={() => {setCrestPrimary(option.colors[0]);setCrestSecondary(option.colors[1]);setCrestText(option.colors[2]);}}>
                  <i style={{background:option.colors[0]}}/><i style={{background:option.colors[1]}}/>
                </button>
              ))}
            </div>
          </fieldset>

          {profileError && <p className="prode-group-error" role="alert">{profileError}</p>}
          <button className="prode-create-submit prode-profile-save" type="submit"
            disabled={saving || !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())}>
            {saving ? "Guardando…" : "Guardar perfil"}
          </button>
        </form>
      </div>, document.body)}
    </div>
  );
}
