import { Component } from "react";

// Una importación diferida desactualizada o un error en un módulo no debe
// dejar una pantalla vacía, especialmente en el navegador integrado de iOS.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("LNA: no se pudo mostrar la pantalla", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" style={{
        minHeight: "65vh", padding: "48px 18px", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 15, textAlign: "center", color: "#f4f7fb", background: "#101c2b",
      }}>
        <div style={{ color: "#ff9b31", fontSize: 42 }} aria-hidden="true">⚠</div>
        <h1 style={{ fontSize: 23, fontWeight: 900 }}>No pudimos cargar esta pantalla</h1>
        <p style={{ maxWidth: 330, lineHeight: 1.5, color: "#b5c6d7" }}>
          Puede haber quedado una versión anterior de LNA en caché.
          Actualizá para cargar la versión más reciente.
        </p>
        <button type="button" onClick={() => {
          const url = new URL(window.location.href);
          url.searchParams.set("actualizar", Date.now().toString());
          window.location.replace(url.toString());
        }} style={{
          background: "#ff9932", border: 0, borderRadius: 10, color: "#10151d",
          padding: "13px 22px", fontWeight: 900, cursor: "pointer",
        }}>Actualizar y volver a intentar</button>
        <a href="/" style={{ color: "#f8b872", fontSize: 13 }}>Volver a LNA</a>
      </main>
    );
  }
}
