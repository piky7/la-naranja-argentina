import { useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-container">

        {/* LOGO */}
        <Link
          to="/"
          className="logo"
          onClick={closeMenu}
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

        {/* NAVEGACIÓN */}
        <nav className="navigation">
          <Link to="/">
            Inicio
          </Link>

          <Link to="/liga">
            Liga
          </Link>

          <Link to="/equipos">
            Equipos
          </Link>

          <Link to="/jugadores">
            Jugadores
          </Link>

          <Link to="/estadisticas">
            Estadísticas
          </Link>
        </nav>

        {/* BOTÓN MOBILE */}
        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={
            menuOpen
              ? "Cerrar menú"
              : "Abrir menú"
          }
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* MENÚ MOBILE */}
      {menuOpen && (
        <nav className="mobile-navigation">
          <Link
            to="/"
            onClick={closeMenu}
          >
            Inicio
          </Link>

          <Link
            to="/liga"
            onClick={closeMenu}
          >
            Liga
          </Link>

          <Link
            to="/equipos"
            onClick={closeMenu}
          >
            Equipos
          </Link>

          <Link
            to="/jugadores"
            onClick={closeMenu}
          >
            Jugadores
          </Link>

          <Link
            to="/estadisticas"
            onClick={closeMenu}
          >
            Estadísticas
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Header;