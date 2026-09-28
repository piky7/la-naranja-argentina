import "./Header.css";

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <a href="/" className="logo">
          <span className="logo-short">LNA</span>

          <span className="logo-name">
            La Naranja Argentina
          </span>
        </a>

        <nav className="navigation">
          <a href="/">Inicio</a>
          <a href="/liga">Liga</a>
          <a href="/equipos">Equipos</a>
          <a href="/jugadores">Jugadores</a>
          <a href="/estadisticas">Estadísticas</a>
        </nav>

        <button className="menu-button" type="button">
          ☰
        </button>
      </div>
    </header>
  );
}

export default Header;