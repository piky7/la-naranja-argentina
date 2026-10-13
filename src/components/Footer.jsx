
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer
      style={{
        background: "#15171c",
        borderTop: "1px solid #343434",
        padding: "22px 16px",
        marginTop: "40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: "#ff8c00",
          fontSize: "14px",
          fontWeight: "700",
          marginBottom: "10px",
        }}
      >
        LA NARANJA ARGENTINA
      </div>

      <nav
        aria-label="Enlaces del pie de página"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          flexWrap: "wrap",
          fontSize: "13px",
        }}
      >
        <Link to="/acerca" style={{ color: "#ddd" }}>
  Acerca de LNA
</Link>
        <Link to="/privacidad" style={{ color: "#ddd" }}>
          Política de privacidad
        </Link>

        <a
          href="https://x.com/lnabasket"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#ddd" }}
        >
          Contacto
        </a>
      </nav>

      <p
        style={{
          color: "#999",
          fontSize: "12px",
          marginTop: "12px",
          marginBottom: 0,
        }}
      >
        © 2026 La Naranja Argentina
      </p>
    </footer>
  );
}

export default Footer;
