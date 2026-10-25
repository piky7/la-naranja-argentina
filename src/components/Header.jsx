
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./Header.css";
import { House, Trophy, Shield, ChartNoAxesColumn } from "lucide-react";

function Header() {
  const [navCompact, setNavCompact] = useState(false);
  const lastScrollY = useRef(0);

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
