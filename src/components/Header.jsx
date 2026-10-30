
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./Header.css";
import FanLevel from "./FanLevel";
import { House, Trophy, Shield, ChartNoAxesColumn, Download, Share2, PlusSquare, X } from "lucide-react";

function Header() {
  const [navCompact, setNavCompact] = useState(false);
  const lastScrollY = useRef(0);
  const [installPlatform, setInstallPlatform] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!mobile || standalone) return;
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setInstallPlatform(ios ? "ios" : "android");
    try { setInstallDismissed(localStorage.getItem("lna-install-tip-dismissed") === "1"); }
    catch { setInstallDismissed(false); }
    const onBeforeInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismissInstall = () => {
    setInstallDismissed(true);
    try { localStorage.setItem("lna-install-tip-dismissed", "1"); } catch {}
  };

  const installApp = async () => {
    if (installPlatform === "android" && installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      setInstallOpen(false);
      dismissInstall();
    } else {
      setInstallOpen(true);
    }
  };

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let idleTimer;
    let frame = null;
    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        lastScrollY.current = currentY;
        if (currentY < 40 || delta < -5) setNavCompact(false);
        else if (delta > 5) setNavCompact(true);
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => setNavCompact(false), 850);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(idleTimer);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-container">

          {/* LOGO */}
          <Link
            to="/"
            className="logo"
          >
            <img
              src="/logo-lna.png"
              alt="La Naranja Argentina"
              className="logo-image"
            />
          </Link>

          {/* IDENTIDAD */}
          <div className="header-brand">
            <div className="header-tagline">
              <span>EL BÁSQUET ARGENTINO,</span>
              <strong>EN UN SOLO LUGAR.</strong>
            </div>

            <div className="header-league">
              LIGA NACIONAL
            </div>
          </div>

          {/* DECORACIÓN */}
          <div className="header-ball" aria-hidden="true">
            <div className="header-ball-line header-ball-line-1"></div>
            <div className="header-ball-line header-ball-line-2"></div>
            <div className="header-ball-line header-ball-line-3"></div>
          </div>

          <FanLevel />

          {/* NAVEGACIÓN ESCRITORIO */}
          <nav className="navigation">
            <Link to="/">Inicio</Link>
            <Link to="/liga">Liga</Link>
            <Link to="/equipos">Equipos</Link>
            <Link to="/jugadores">Jugadores</Link>
            <Link to="/estadisticas">Estadísticas</Link>
          </nav>

        </div>

      </header>

      {installPlatform && !installDismissed && !installOpen && (
        <aside className="lna-install-tip" aria-label="Instalar La Naranja Argentina">
          <img src="/logo-lna.png" alt="" />
          <div><strong>Llevá LNA a tu inicio</strong><span>Accedé como una app desde tu celular.</span></div>
          <button type="button" className="lna-install-tip-action" onClick={installApp}>Ver cómo</button>
          <button type="button" className="lna-install-tip-close" onClick={dismissInstall} aria-label="Cerrar aviso"><X size={18} /></button>
        </aside>
      )}
      {installPlatform && installOpen && (
        <div className="lna-install-overlay" onClick={() => setInstallOpen(false)}>
          <section className="lna-install-dialog" role="dialog" aria-modal="true" aria-labelledby="lna-install-title" onClick={event => event.stopPropagation()}>
            <button type="button" className="lna-install-dialog-close" aria-label="Cerrar" onClick={() => { setInstallOpen(false); dismissInstall(); }}><X size={22} /></button>
            <img src="/logo-lna.png" alt="La Naranja Argentina" />
            <h2 id="lna-install-title">LNA EN TU CELULAR</h2>
            <p>Agregá La Naranja Argentina a tu pantalla de inicio y entrá directamente, como una app.</p>
            <ol>
              {installPlatform === "ios" ? (
                <>
                  <li><span>1</span><div>Tocá <strong>Compartir</strong> <Share2 size={17} aria-hidden="true" /> en Safari.</div></li>
                  <li><span>2</span><div>Buscá y elegí <strong>Agregar a inicio</strong> <PlusSquare size={17} aria-hidden="true" />.</div></li>
                  <li><span>3</span><div>Confirmá tocando <strong>Agregar</strong>.</div></li>
                </>
              ) : (
                <>
                  <li><span>1</span><div>Abrí el menú <strong>⋮</strong> de Chrome.</div></li>
                  <li><span>2</span><div>Elegí <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.</div></li>
                  <li><span>3</span><div>Confirmá la instalación.</div></li>
                </>
              )}
            </ol>
            <button type="button" className="lna-install-understood" onClick={() => { setInstallOpen(false); dismissInstall(); }}>Entendido</button>
          </section>
        </div>
      )}

     {/* NAVEGACIÓN INFERIOR MOBILE */}
<nav
  className={navCompact ? "bottom-navigation is-compact" : "bottom-navigation"}
  aria-label="Navegación inferior"
>
  <NavLink
    to="/"
    end
    className={({ isActive }) =>
      `bottom-nav-link ${isActive ? "active" : ""}`
    }
  >
    <House size={22} strokeWidth={2} aria-hidden="true" />
    <span>Inicio</span>
  </NavLink>

  <NavLink
    to="/liga"
    className={({ isActive }) =>
      `bottom-nav-link ${isActive ? "active" : ""}`
    }
  >
    <Trophy size={22} strokeWidth={2} aria-hidden="true" />
    <span>Liga</span>
  </NavLink>

  <NavLink
    to="/equipos"
    className={({ isActive }) =>
      `bottom-nav-link ${isActive ? "active" : ""}`
    }
  >
    <Shield size={22} strokeWidth={2} aria-hidden="true" />
    <span>Equipos</span>
  </NavLink>

  <NavLink
    to="/estadisticas"
    className={({ isActive }) =>
      `bottom-nav-link ${isActive ? "active" : ""}`
    }
  >
    <ChartNoAxesColumn size={22} strokeWidth={2} aria-hidden="true" />
    <span>Estadísticas</span>
  </NavLink>
</nav>
    </>
  );
}

export default Header;
