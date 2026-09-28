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

        <Link
          to="/"
          className="logo"
          onClick={closeMenu}
        >
          <span className="logo-short">
            LNA
          </span>

          <span className="logo-name">
            La Naranja Argentina
          </span>
        </Link>

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