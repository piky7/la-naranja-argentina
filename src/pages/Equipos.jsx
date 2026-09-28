import { useState } from "react";
import { Link } from "react-router-dom";

import { teams } from "../data/teams";

import "./Equipos.css";

function Equipos() {
  const [search, setSearch] = useState("");

  const filteredTeams = teams.filter((team) => {
    const searchValue = search.toLowerCase().trim();

    return (
      team.name.toLowerCase().includes(searchValue) ||
      team.shortName.toLowerCase().includes(searchValue) ||
      team.city.toLowerCase().includes(searchValue) ||
      team.province.toLowerCase().includes(searchValue)
    );
  });

  return (
    <main className="teams-page">

      {/* =========================================
          HEADER
          ========================================= */}

      <section className="teams-header">
        <div className="page-container">

          <span className="teams-label">
            LIGA NACIONAL
          </span>

          <h1>
            Equipos
          </h1>

          <p>
            Conocé los equipos que forman parte de
            la Liga Nacional.
          </p>

        </div>
      </section>


      {/* =========================================
          CONTENIDO
          ========================================= */}

      <section className="teams-content">
        <div className="page-container">

          {/* =========================================
              BUSCADOR
              ========================================= */}

          <div className="teams-toolbar">

            <div className="teams-results">
              <span className="teams-count-label">
                EQUIPOS
              </span>

              <strong className="teams-count">
                {filteredTeams.length}
              </strong>
            </div>

            <div className="teams-search">

              <span className="teams-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Buscar equipo..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  type="button"
                  className="teams-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}

            </div>

          </div>


          {/* =========================================
              EQUIPOS
              ========================================= */}

          {filteredTeams.length > 0 ? (

            <div className="teams-grid">

              {filteredTeams.map((team) => (

                <Link
                  key={team.id}
                  to={`/equipos/${team.id}`}
                  className="team-card"
                >

                  {/* Parte superior */}

                  <div className="team-card-top">

                    <span className="team-card-number">
                      {team.abbreviation}
                    </span>

                    <span className="team-card-arrow">
                      →
                    </span>

                  </div>


                  {/* Escudo */}

                  <div className="team-logo-container">

                    <img
                      src={team.logo}
                      alt={`Escudo de ${team.name}`}
                      className="team-logo"
                    />

                  </div>


                  {/* Información */}

                  <div className="team-card-info">

                    <span className="team-card-location">
                      {team.city}
                    </span>

                    <h2>
                      {team.name}
                    </h2>

                    <p>
                      {team.province}
                    </p>

                  </div>


                  {/* Footer */}

                  <div className="team-card-footer">

                    <span>
                      Ver equipo
                    </span>

                    <span className="team-card-footer-arrow">
                      →
                    </span>

                  </div>

                </Link>

              ))}

            </div>

          ) : (

            <div className="teams-empty">

              <div className="teams-empty-icon">
                ?
              </div>

              <div>

                <span>
                  SIN RESULTADOS
                </span>

                <h2>
                  No encontramos equipos
                </h2>

                <p>
                  Probá con otro nombre, ciudad o
                  provincia.
                </p>

              </div>

            </div>

          )}

        </div>
      </section>

    </main>
  );
}

export default Equipos;