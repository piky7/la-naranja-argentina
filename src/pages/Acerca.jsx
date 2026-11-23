
function Acerca() {
  return (
    <main
      style={{
        maxWidth: "850px",
        margin: "40px auto",
        padding: "24px",
        color: "#f5f5f5",
        lineHeight: 1.8,
      }}
    >
      <h1 style={{ color: "#ff8c00" }}>
        Acerca de La Naranja Argentina
      </h1>

      <p>
        La Naranja Argentina (LNA) es un proyecto digital
        independiente dedicado a informar sobre el básquet
        argentino, con especial atención a la Liga Nacional.
      </p>

      <h2>Nuestro objetivo</h2>
      <p>
        Queremos reunir en un solo lugar la información
        que los seguidores del básquet necesitan para
        mantenerse al día con la competencia.
      </p>

      <h2>¿Qué podés encontrar en LNA?</h2>
      <ul>
        <li>Resultados y seguimiento de partidos en vivo.</li>
        <li>Fixture de la Liga Nacional.</li>
        <li>Tabla de posiciones actualizada.</li>
        <li>Información de los equipos participantes.</li>
        <li>Jugadores y estadísticas de la temporada.</li>
      </ul>

      <h2>Un proyecto independiente</h2>
      <p>
        La Naranja Argentina es una iniciativa independiente
        y no representa oficialmente a la Liga Nacional de
        Básquet ni a sus clubes.
      </p>

      <h2>Seguinos y contactanos</h2>
      <p>
        Podés seguir las novedades del proyecto y
        comunicarte con nosotros a través de nuestra
        cuenta oficial de X:{" "}
        <a
          href="https://x.com/lnabasket"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#ff8c00" }}
        >
          @lnabasket
        </a>.
      </p>
    </main>
  );
}

export default Acerca;
