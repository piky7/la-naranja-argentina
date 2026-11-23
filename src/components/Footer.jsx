
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
      {/* APOYAR A LNA */}
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto 24px",
          padding: "18px 20px",
          background: "#1c2028",
          border: "1px solid #343434",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "800",
            marginBottom: "8px",
          }}
        >
          ☕ Apoyá a La Naranja Argentina
        </div>

        <p
          style={{
            color: "#b8bec8",
            fontSize: "13px",
            lineHeight: "1.6",
            margin: "0 0 16px",
          }}
        >
          LNA es un proyecto independiente dedicado al básquet
          argentino. Si te gusta lo que hacemos, podés ayudarnos
          a seguir creciendo con un cafecito.
        </p>

        <a
          href="https://cafecito.app/lanaranjaargentina"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "11px 20px",
            background: "#ff8c00",
            color: "#15171c",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "800",
            textDecoration: "none",
          }}
        >
          ☕ Invitanos un cafecito
        </a>
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
