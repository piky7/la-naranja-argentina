import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UsersRound, Trophy, Link2, UserPlus, RefreshCcw, LockKeyhole, ArrowLeft, Database } from "lucide-react";
import { signInProdeWithGoogle, watchProdeUser } from "../auth/prodeAuth";
import "./Admin.css";
import AdminNotifications from "./AdminNotifications";

const API = "https://lna-prode-api.lnab.workers.dev";
const days = Array.from({ length: 7 }, (_, offset) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (6 - offset));
  return date.toISOString().slice(0, 10);
});

export default function Admin() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe;
    watchProdeUser(next => { if (active) { setUser(next); setAuthLoaded(true); } })
      .then(stop => { if (active) unsubscribe = stop; else stop?.(); })
      .catch(() => { if (active) { setAuthLoaded(true); setError("No se pudo comprobar la sesión Google."); } });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!user) { setSummary(null); return; }
    let active = true;
    setLoading(true); setError(""); setSummary(null);
    user.getIdToken().then(token => fetch(API + "/api/prode/admin/summary", {
      headers: { Authorization: "Bearer " + token }, cache: "no-store"
    })).then(async response => {
      const body = await response.json();
      if (!response.ok || !body.ok) {
        if (response.status === 403) throw Error("Esta cuenta no tiene autorización para administrar LNA.");
        throw Error(body.error || "No se pudo cargar el panel.");
      }
      if (active) setSummary(body);
    }).catch(error => { if (active) setError(error.message || "No se pudo conectar."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, revision]);

  const signIn = async () => {
    setLoginBusy(true); setError("");
    try { await signInProdeWithGoogle(); }
    catch { setError("No se pudo iniciar sesión con Google."); }
    finally { setLoginBusy(false); }
  };
  const dailyValues = days.map(day => Number(summary?.daily?.find(entry => entry.day === day)?.total || 0));
  const highest = Math.max(1, ...dailyValues);
  const metrics = [
    { label: "Cuentas Prode", value: summary?.accounts, icon: UsersRound, detail: "Perfiles registrados" },
    { label: "Mi Carrera vinculadas", value: summary?.linkedCareers, icon: Link2, detail: "Cuentas asociadas" },
    { label: "Ligas creadas", value: summary?.leagues, icon: Trophy, detail: "Ligas de amigos" },
    { label: "Nuevos en 7 días", value: summary?.new7Days, icon: UserPlus, detail: "Registros recientes" },
    { label: "Nuevos en 30 días", value: summary?.new30Days, icon: UserPlus, detail: "Último mes" },
    { label: "Afiliaciones", value: summary?.memberships, icon: UsersRound, detail: "Incluye usuarios en varias ligas" },
  ];

  return <main className="lna-admin-page">
    <div className="lna-admin-container">
      <Link to="/prode" className="lna-admin-back"><ArrowLeft size={16}/> Volver a Prode</Link>
      <header className="lna-admin-header">
        <div><span className="lna-admin-eyebrow"><ShieldCheck size={15}/> LA NARANJA ARGENTINA · ACCESO RESTRINGIDO</span>
          <h1>Panel de <em>control</em></h1><p>Actividad de cuentas y ligas de Prode LNA.</p></div>
        <LockKeyhole size={29} aria-hidden="true"/>
      </header>
      {!authLoaded && <div className="lna-admin-notice">Comprobando sesión…</div>}
      {authLoaded && !user && <section className="lna-admin-notice">
        <LockKeyhole size={25}/><h2>Acceso privado</h2>
        <p>Iniciá sesión con tu cuenta Google administradora para continuar.</p>
        <button type="button" disabled={loginBusy} onClick={signIn}>{loginBusy ? "Conectando…" : "Continuar con Google"}</button>
      </section>}
      {authLoaded && user && loading && <div className="lna-admin-notice">Consultando métricas protegidas…</div>}
      {error && !loading && <div role="alert" className="lna-admin-notice lna-admin-error"><LockKeyhole size={23}/><h2>{error.includes("autorización") ? "Acceso restringido" : "No se pudo cargar el panel"}</h2><p>{error.includes("autorización") ? "Solo la cuenta administradora de LNA puede acceder a esta sección." : error}</p></div>}
      {summary && !loading && <>
        <div className="lna-admin-toolbar"><span>Actualizado: {new Date(summary.generatedAt).toLocaleString("es-AR")}</span>
          <button type="button" onClick={() => setRevision(x => x + 1)}><RefreshCcw size={16}/> Actualizar</button></div>
        <div className="lna-admin-metrics">
          {metrics.map(metric => { const Icon = metric.icon; return <article key={metric.label} className="lna-admin-metric">
            <div><span>{metric.label}</span><Icon size={20}/></div>
            <strong>{Number(metric.value || 0).toLocaleString("es-AR")}</strong>
            <small>{metric.detail}</small>
          </article>; })}
        </div>
        <AdminNotifications user={user}/>
        <section className="lna-admin-section">
          <h2>Registros de los últimos 7 días</h2>
          <div className="lna-admin-bars" role="img" aria-label={"Registros diarios: " + days.map((day, index) => day + ": " + dailyValues[index]).join(", ")}>
            {days.map((day, index) => <div className="lna-admin-bar-col" key={day}>
              <span>{dailyValues[index]}</span><div className="lna-admin-bar-track"><div style={{ height: (dailyValues[index] ? Math.max(5, dailyValues[index] / highest * 100) : 0) + "%" }}/></div>
              <small>{new Date(day + "T12:00:00Z").toLocaleDateString("es-AR", {weekday:"short",timeZone:"UTC"})}</small>
            </div>)}
          </div>
        </section>
        <section className="lna-admin-section lna-admin-system">
          <h2><Database size={19}/> Estado de los servicios</h2>
          <p><span className="lna-admin-status-dot"/> API de Prode y base de datos D1: respondiendo.</p>
          <small>El estado de lna-live, lna-sync y las sincronizaciones oficiales todavía no está conectado a este panel.</small>
        </section>
        <p className="lna-admin-footnote">Estos contadores corresponden a Prode LNA. No incluyen visitantes anónimos de la web ni todas las carreras locales sin cuenta.</p>
      </>}
    </div>
  </main>;
}
