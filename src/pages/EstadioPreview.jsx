import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, Award, Banknote, Building2, Check, ChevronRight,
  CircleHelp, Crown, Dumbbell, Eye, Flame, Hammer, House, LockKeyhole,
  Medal, Pencil, ShieldCheck, Sparkles, Trophy, Users, Wrench, X
} from "lucide-react";
import { Link } from "react-router-dom";
import { signInProdeWithGoogle, watchProdeUser } from "../auth/prodeAuth";
import "./EstadioPreview.css";

const ADMIN_API = "https://lna-prode-api.lnab.workers.dev";
const zones = [
  { id: "court", name: "Cancha", level: 2, progress: 100, icon: House, detail: "Parquet profesional, diseño central y aro reglamentario.", next: "Piso premium", cost: "$ 48.000", gain: "Identidad visual exclusiva" },
  { id: "stands", name: "Tribunas", level: 2, progress: 72, icon: Users, detail: "Dos sectores de tribuna y platea lateral.", next: "Ampliar tribuna norte", cost: "$ 25.000", gain: "+300 localidades" },
  { id: "locker", name: "Vestuarios", level: 1, progress: 44, icon: Dumbbell, detail: "Vestuario local equipado y zona de preparación.", next: "Gimnasio de fuerza", cost: "$ 32.000", gain: "Mejor preparación del plantel" },
  { id: "tech", name: "Tecnología", level: 1, progress: 28, icon: Sparkles, detail: "Tablero electrónico básico y sonido ambiente.", next: "Pantalla central", cost: "$ 40.000", gain: "Presentaciones de partido" },
  { id: "academy", name: "Academia", level: 0, progress: 0, icon: Medal, detail: "Un espacio para formar a las próximas generaciones.", next: "Construir academia", cost: "$ 65.000", gain: "Desarrollo de juveniles" },
  { id: "club", name: "Área social", level: 0, progress: 0, icon: Building2, detail: "Tienda, museo y espacios para los hinchas.", next: "Abrir tienda del club", cost: "$ 38.000", gain: "Identidad y vida institucional" },
];
const missions = [
  { title: "Defendé tu localía", desc: "Ganà 2 partidos como local", reward: "+ $ 8.000", progress: 1, total: 2 },
  { title: "La gente acompaña", desc: "Alcanzá 3 partidos con buena asistencia", reward: "+ 250 prestigio", progress: 2, total: 3 },
  { title: "Proyecto de inferiores", desc: "Completá una mejora de instalaciones", reward: "Plano de academia", progress: 0, total: 1 },
];

function CourtIllustration({ accent = "#f28b28", variant = "arena" }) {
  return <div className={"stadium-art stadium-art-" + variant}>
    <div className="stadium-roof-glow" />
    <div className="stadium-rig stadium-rig-left" />
    <div className="stadium-rig stadium-rig-right" />
    <div className="stadium-upper-stands"><span/><span/><span/><span/><span/><span/></div>
    <div className="stadium-lower-stands"><span/><span/><span/><span/><span/><span/><span/><span/></div>
    <div className="stadium-court-shell">
      <div className="stadium-court" style={{ "--court-accent": accent }}>
        <div className="court-half court-half-left"/><div className="court-half court-half-right"/>
        <div className="court-center-circle"/><div className="court-center-line"/>
        <div className="court-key court-key-left"/><div className="court-key court-key-right"/>
        <div className="court-three court-three-left"/><div className="court-three court-three-right"/>
        <div className="court-logo">LNA</div>
        <div className="court-hoop court-hoop-left"/><div className="court-hoop court-hoop-right"/>
      </div>
    </div>
    <div className="stadium-front-boards"><span>LA NARANJA ARGENTINA</span><span>EL TEMPLO</span><span>MI CARRERA</span></div>
    <div className="stadium-crowd-glow"/>
  </div>;
}

function AdminGate({ children }) {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let stop;
    watchProdeUser(next => { if (active) { setUser(next); setAuthLoaded(true); setAuthorized(false); setError(""); } })
      .then(unsubscribe => { if (active) stop = unsubscribe; else unsubscribe?.(); })
      .catch(() => { if (active) { setAuthLoaded(true); setError("No se pudo comprobar la sesión de Google."); } });
    return () => { active = false; stop?.(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setChecking(true);
    user.getIdToken().then(token => fetch(ADMIN_API + "/api/prode/admin/summary", {
      headers: { Authorization: "Bearer " + token }, cache: "no-store"
    })).then(async response => {
      const body = await response.json().catch(() => ({}));
      if (response.status === 403) throw new Error("Esta cuenta no tiene permisos de administración.");
      if (!response.ok || !body.ok) throw new Error(body.error || "No se pudo validar el acceso privado.");
      if (active) setAuthorized(true);
    }).catch(err => { if (active) setError(err.message || "No se pudo validar el acceso."); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [user]);

  const signIn = async () => {
    setLoginBusy(true); setError("");
    try { await signInProdeWithGoogle(); }
    catch { setError("No se pudo iniciar sesión con Google."); }
    finally { setLoginBusy(false); }
  };

  if (!authLoaded || checking) return <main className="stadium-gate"><div className="stadium-gate-card"><div className="stadium-gate-mark"><LockKeyhole/></div><strong>Validando acceso privado</strong><span>Comprobando la cuenta administradora de LNA…</span></div></main>;
  if (!user) return <main className="stadium-gate"><div className="stadium-gate-card"><div className="stadium-gate-mark"><LockKeyhole/></div><span className="stadium-kicker">LA NARANJA ARGENTINA · PROTOTIPO PRIVADO</span><h1>Mi Estadio</h1><p>Esta pantalla es una vista de diseño exclusiva para administración. Iniciá sesión con tu cuenta Google administradora para verla.</p><button onClick={signIn} disabled={loginBusy}>{loginBusy ? "Conectando…" : "Continuar con Google"}</button>{error && <small role="alert">{error}</small>}</div></main>;
  if (error || !authorized) return <main className="stadium-gate"><div className="stadium-gate-card"><div className="stadium-gate-mark"><ShieldCheck/></div><span className="stadium-kicker">ACCESO RESTRINGIDO</span><h1>Solo administración</h1><p>{error || "La cuenta conectada no tiene autorización para ver este prototipo."}</p><Link to="/" className="stadium-back-link"><ArrowLeft size={16}/> Volver a LNA</Link></div></main>;
  return children;
}

export default function EstadioPreview() {
  const [tab, setTab] = useState("overview");
  const [selectedZone, setSelectedZone] = useState("stands");
  const [stadiumName, setStadiumName] = useState("Arena del Barrio");
  const [editingName, setEditingName] = useState(false);
  const [accent, setAccent] = useState("#f28b28");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgraded, setUpgraded] = useState([]);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const activeZone = zones.find(zone => zone.id === selectedZone) || zones[0];
  const completedUpgrades = upgraded.length;
  const level = 2 + Math.floor(completedUpgrades / 2);
  const prestige = 1240 + completedUpgrades * 250;
  const capacity = 1500 + (upgraded.includes("stands") ? 300 : 0);
  const tabs = [{ id: "overview", label: "Estadio", icon: Eye }, { id: "build", label: "Construcción", icon: Hammer }, { id: "identity", label: "Identidad", icon: Pencil }, { id: "museum", label: "Museo", icon: Trophy }];

  const openUpgrade = () => setShowUpgrade(true);
  const confirmUpgrade = () => { setUpgraded(current => current.includes(selectedZone) ? current : [...current, selectedZone]); setShowUpgrade(false); };

  return <AdminGate>
    <main className="stadium-preview-page">
      <div className="stadium-preview-wrap">
        <div className="stadium-preview-topline"><Link to="/admin"><ArrowLeft size={15}/> Panel de administración</Link><span><LockKeyhole size={12}/> VISTA PRIVADA · SOLO DISEÑO</span></div>
        <header className="stadium-preview-hero">
          <div className="stadium-hero-copy">
            <span className="stadium-kicker"><span className="stadium-live-dot"/> MI CARRERA · PROYECTO DE CLUB</span>
            <h1>MI <em>ESTADIO</em></h1>
            <p>Tu casa. Tu historia. Tu legado.</p>
            <div className="stadium-hero-tags"><span><House size={14}/> Tu localía</span><span><Trophy size={14}/> Tu historia</span><span><Flame size={14}/> Tu pasión</span></div>
          </div>
          <div className="stadium-hero-ball" aria-hidden="true"><div/></div>
        </header>

        <section className="stadium-name-card">
          <div className="stadium-name-main"><div className="stadium-crest"><ShieldCheck size={25}/><span>LNA</span></div><div className="stadium-name-copy">
            <span className="stadium-kicker">EL HOGAR DE TU EQUIPO</span>
            {editingName ? <input autoFocus maxLength={30} value={stadiumName} onChange={event => setStadiumName(event.target.value)} onBlur={() => setEditingName(false)} onKeyDown={event => { if (event.key === "Enter") setEditingName(false); }}/> : <h2>{stadiumName}</h2>}
            <span className="stadium-location"><span/> Liga de Desarrollo · Temporada 2026/27</span>
          </div></div>
          <button className="stadium-icon-button" aria-label="Editar nombre del estadio" onClick={() => setEditingName(true)}><Pencil size={17}/></button>
        </section>

        <section className="stadium-visual-card">
          <div className="stadium-visual-head"><div><span className="stadium-kicker">TU CASA, EN EVOLUCIÓN</span><h2>{stadiumName}</h2></div><span className="stadium-level-pill"><Crown size={13}/> NIVEL {level}</span></div>
          <CourtIllustration accent={accent}/>
          <div className="stadium-visual-stats">
            <div><Users size={16}/><strong>{capacity.toLocaleString("es-AR")}</strong><span>Capacidad</span></div>
            <div><Award size={16}/><strong>{prestige.toLocaleString("es-AR")}</strong><span>Prestigio</span></div>
            <div><Trophy size={16}/><strong>3</strong><span>Títulos</span></div>
          </div>
          <div className="stadium-progress-line"><div><span>Desarrollo del estadio</span><strong>{Math.min(100, 68 + completedUpgrades * 5)}%</strong></div><div className="stadium-progress-track"><span style={{width: Math.min(100, 68 + completedUpgrades * 5) + "%"}}/></div></div>
        </section>

        <nav className="stadium-tabs" aria-label="Secciones de Mi Estadio">
          {tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><Icon size={16}/><span>{item.label}</span></button>; })}
        </nav>

        {tab === "overview" && <div className="stadium-content-grid">
          <section className="stadium-panel stadium-next-project">
            <div className="stadium-panel-heading"><div><span className="stadium-kicker">PRÓXIMO OBJETIVO</span><h3>Hacé crecer tu localía</h3></div><span className="stadium-heading-icon"><Hammer size={18}/></span></div>
            <p>Una cancha más grande, más hinchas y una institución que crece con cada temporada.</p>
            <div className="stadium-project-row"><div className="stadium-project-thumb"><Users size={24}/></div><div><strong>Ampliación de tribuna norte</strong><span>+300 lugares · más ambiente local</span></div><b>$ 25.000</b></div>
            <button className="stadium-primary-button" onClick={() => {setSelectedZone("stands"); openUpgrade();}}>Ver proyecto <ArrowUpRight size={16}/></button>
          </section>
          <section className="stadium-panel stadium-economy-panel">
            <div className="stadium-panel-heading"><div><span className="stadium-kicker">FINANZAS DEL CLUB</span><h3>Recursos disponibles</h3></div><Banknote size={20}/></div>
            <div className="stadium-wallet"><span>Fondos del club</span><strong>$ 86.500</strong><small>+ $ 12.000 esta semana</small></div>
            <div className="stadium-wallet-bottom"><span>Prestigio acumulado</span><strong>{prestige.toLocaleString("es-AR")} pts</strong></div>
          </section>
          <section className="stadium-panel stadium-missions-panel">
            <div className="stadium-panel-heading"><div><span className="stadium-kicker">CARRERA + ESTADIO</span><h3>Objetivos del club</h3></div><span className="stadium-heading-icon"><TargetIcon/></span></div>
            {(showAllMissions ? missions : missions.slice(0,2)).map((mission, index) => <div className="stadium-mission" key={mission.title}><div className="stadium-mission-top"><div><strong>{mission.title}</strong><span>{mission.desc}</span></div><b>{mission.reward}</b></div><div className="stadium-mission-track"><span style={{width: mission.progress / mission.total * 100 + "%"}}/></div><small>{mission.progress}/{mission.total} completado{mission.total === 1 ? "" : "s"}</small></div>)}
            <button className="stadium-text-button" onClick={() => setShowAllMissions(value => !value)}>{showAllMissions ? "Ver menos" : "Ver todos los objetivos"} <ChevronRight size={15}/></button>
          </section>
          <section className="stadium-panel stadium-career-link">
            <div className="stadium-career-emblem"><Trophy size={23}/></div><div><span className="stadium-kicker">CADA PARTIDO CONSTRUYE</span><h3>Tu carrera deja huella</h3><p>Victorias, ascensos y temporadas históricas impulsan el crecimiento de tu estadio.</p></div>
            <div className="stadium-career-pills"><span>🏆 Campeonatos</span><span>📈 Ascensos</span><span>🔥 Localía</span></div>
          </section>
        </div>}

        {tab === "build" && <section className="stadium-build-view">
          <div className="stadium-section-title"><div><span className="stadium-kicker">PLAN MAESTRO</span><h2>Construí tu templo</h2><p>Elegí qué sector mejorar primero. Cada decisión cambia el futuro del club.</p></div><span className="stadium-funds-chip"><Banknote size={15}/> $ 86.500</span></div>
          <div className="stadium-zone-layout"><div className="stadium-zone-list">{zones.map(zone => { const Icon = zone.icon; const done = upgraded.includes(zone.id); return <button key={zone.id} className={"stadium-zone-item " + (selectedZone === zone.id ? "selected" : "")} onClick={() => setSelectedZone(zone.id)}><span className="stadium-zone-icon"><Icon size={18}/></span><span className="stadium-zone-info"><strong>{zone.name}</strong><small>{done ? "Mejora adquirida" : zone.level ? "Nivel " + zone.level : "Por construir"}</small></span><span className="stadium-zone-progress"><i><b style={{width: (done ? 100 : zone.progress) + "%"}}/></i><small>{done ? "100" : zone.progress}%</small></span><ChevronRight size={16}/></button>; })}</div>
            <div className="stadium-zone-detail"><div className="stadium-zone-detail-art"><activeZone.icon size={30}/><span>SECTOR DEL ESTADIO</span></div><span className="stadium-kicker">SECTOR SELECCIONADO</span><h3>{activeZone.name}</h3><p>{activeZone.detail}</p><div className="stadium-zone-next"><span>PRÓXIMA MEJORA</span><strong>{upgraded.includes(selectedZone) ? "Mejora completada" : activeZone.next}</strong><small>{activeZone.gain}</small></div><div className="stadium-zone-cost"><span>Inversión estimada</span><strong>{activeZone.cost}</strong></div><button className="stadium-primary-button" onClick={openUpgrade} disabled={upgraded.includes(selectedZone)}>{upgraded.includes(selectedZone) ? <><Check size={16}/> Ya mejorado</> : <>Ver mejora <ArrowUpRight size={16}/></>}</button><small className="stadium-demo-note">Simulación visual: no realiza compras ni guarda cambios.</small></div></div>
        </section>}

        {tab === "identity" && <section className="stadium-build-view"><div className="stadium-section-title"><div><span className="stadium-kicker">IDENTIDAD DEL CLUB</span><h2>Que se sienta tuyo</h2><p>Personalizá el aspecto de tu casa y la identidad de tu institución.</p></div></div><div className="stadium-identity-grid"><div className="stadium-panel"><span className="stadium-kicker">NOMBRE DEL ESTADIO</span><label className="stadium-field-label">Cómo se llama tu cancha</label><input className="stadium-name-input" maxLength={30} value={stadiumName} onChange={event => setStadiumName(event.target.value)}/><small>El nombre aparece en la presentación y en el perfil de tu club.</small><div className="stadium-color-heading">Color principal de cancha</div><div className="stadium-color-options">{["#f28b28","#e64a3b","#3c8fce","#48a879","#9b76cf","#d3b75c"].map(color => <button key={color} aria-label={"Elegir color " + color} className={accent === color ? "selected" : ""} style={{"--swatch":color}} onClick={() => setAccent(color)}><span/></button>)}</div></div><div className="stadium-panel stadium-identity-preview"><span className="stadium-kicker">VISTA PREVIA</span><CourtIllustration accent={accent} variant="mini"/><strong>{stadiumName || "Tu estadio"}</strong><small>La casa de tu equipo</small></div></div></section>}

        {tab === "museum" && <section className="stadium-build-view"><div className="stadium-section-title"><div><span className="stadium-kicker">MEMORIA DEL CLUB</span><h2>La historia vive acá</h2><p>Cada logro de Mi Carrera se transforma en parte del museo de tu estadio.</p></div></div><div className="stadium-museum-grid"><article className="stadium-trophy-card featured"><div className="stadium-trophy-glow"><Trophy size={38}/></div><span className="stadium-kicker">MÁXIMO LOGRO</span><h3>Campeón de Liga</h3><p>Temporada 2025/26</p><b>EN EXHIBICIÓN</b></article><article className="stadium-trophy-card"><div className="stadium-trophy-glow"><Medal size={34}/></div><span className="stadium-kicker">ASCENSOS</span><h3>Un paso más arriba</h3><p>2 ascensos conseguidos</p><b>EN EXHIBICIÓN</b></article><article className="stadium-trophy-card locked"><div className="stadium-trophy-glow"><Crown size={34}/></div><span className="stadium-kicker">OBJETIVO FUTURO</span><h3>Gloria nacional</h3><p>Alcanzá la máxima categoría</p><b><LockKeyhole size={12}/> BLOQUEADO</b></article></div><div className="stadium-museum-note"><Award size={18}/><p>Los trofeos, récords y temporadas se guardarían en forma permanente. Tu estadio sería el archivo vivo de toda tu carrera.</p></div></section>}

        <footer className="stadium-preview-foot"><span><LockKeyhole size={13}/> PROTOTIPO PRIVADO · DATOS FICTICIOS</span><span>NO MODIFICA MI CARRERA</span></footer>
      </div>
      {showUpgrade && <div className="stadium-modal-backdrop" role="presentation" onMouseDown={event => {if(event.target === event.currentTarget) setShowUpgrade(false);}}><section className="stadium-upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="stadium-upgrade-title"><button className="stadium-modal-close" onClick={() => setShowUpgrade(false)} aria-label="Cerrar"><X size={19}/></button><div className="stadium-upgrade-icon"><Wrench size={25}/></div><span className="stadium-kicker">PROYECTO DE INFRAESTRUCTURA</span><h2 id="stadium-upgrade-title">{activeZone.next}</h2><p>{activeZone.gain}. Esta es una simulación de cómo se presentarían las mejoras dentro del juego.</p><div className="stadium-modal-cost"><span>Inversión ilustrativa</span><strong>{activeZone.cost}</strong></div><div className="stadium-modal-actions"><button className="stadium-secondary-button" onClick={() => setShowUpgrade(false)}>Volver</button><button className="stadium-primary-button" onClick={confirmUpgrade}>Probar mejora <Sparkles size={15}/></button></div><small>La acción solo cambia esta vista temporal. No afecta partidas, saldos ni datos reales.</small></section></div>}
    </main>
  </AdminGate>;
}

function TargetIcon() { return <CircleHelp size={18}/>; }
