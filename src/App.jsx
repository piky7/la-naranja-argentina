import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import Header from "./components/Header";
const LigaFederal = lazy(() => import("./pages/LigaFederal"));
import SeoMeta from "./components/SeoMeta";
import Footer from "./components/Footer";
import SwipeNavigation from "./components/SwipeNavigation";
import Home from "./pages/Home";
const HomeLigaArgentina = lazy(() => import("./pages/HomeLigaArgentina"));
const loadLiga = () => import("./pages/Liga");
const loadLigaArgentina = () => import("./pages/LigaArgentina");
const LigaArgentinaEquipos = lazy(() => import("./pages/LigaArgentinaEquipos"));
const LigaArgentinaEstadisticas = lazy(() => import("./pages/LigaArgentinaEstadisticas"));
const LigaArgentina = lazy(loadLigaArgentina);
const loadProde = () => import("./pages/Prode");
const Liga = lazy(loadLiga);
const Equipos = lazy(() => import("./pages/Equipos"));
const Equipo = lazy(() => import("./pages/Equipo"));
const Jugadores = lazy(() => import("./pages/Jugadores"));
const loadEstadisticas = () => import("./pages/Estadisticas");
const Estadisticas = lazy(loadEstadisticas);
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Acerca = lazy(() => import("./pages/Acerca"));
const Prode = lazy(loadProde);
const Perfil = lazy(() => import("./pages/Perfil"));
const Admin = lazy(() => import("./pages/Admin"));

// Precarga solo el código de las secciones desde Inicio, sin consultar APIs
// autenticadas ni D1 hasta que el usuario abra cada sección.
function PreloadSections() {
  const location = useLocation();
  const preloadStarted = useRef(false);

  useEffect(() => {
    if (location.pathname !== "/" || preloadStarted.current) return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData || /^(slow-2g|2g|3g)$/i.test(connection?.effectiveType || "")) return;
    let idleId = null;
    let timerId = null;
    let fallbackId = null;
    let active = true;
    const preload = () => {
      if (!active || preloadStarted.current || document.visibilityState !== "visible") return;
      preloadStarted.current = true;
      void Promise.allSettled([loadLiga(), loadEstadisticas(), loadProde()]);
    };
    timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(preload, { timeout: 6000 });
      } else {
        preload();
      }
    }, 1400);
    return () => {
      active = false;
      window.clearTimeout(timerId);
      if (fallbackId !== null) window.clearTimeout(fallbackId);
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [location.pathname]);
  return null;
}
function RouteLoading() {
  return <div role="status" aria-live="polite" style={{ minHeight: "45vh", display: "grid", placeItems: "center", color: "#e9f0f5", fontSize: "14px", fontWeight: 700 }}>
    Cargando sección…
  </div>;
}

function AnimatedRoutes({ selectedTournament, onTournamentChange }) {
  const location = useLocation();
  // Mantener Prode montado después de la primera visita: no repetir la carga
  // de Firebase, ligas y rankings cada vez que cambia la pestaña.
  const isProde = location.pathname === "/prode";
  const [prodeVisited, setProdeVisited] = useState(isProde);
  const [animation, setAnimation] = useState("");
  const prodeLeftAt = useRef(null);

  useEffect(() => {
    if (!isProde && prodeVisited && prodeLeftAt.current === null) {
      prodeLeftAt.current = Date.now();
    } else if (isProde && prodeLeftAt.current !== null) {
      const elapsed = Date.now() - prodeLeftAt.current;
      prodeLeftAt.current = null;
      if (elapsed > 60_000) window.dispatchEvent(new Event("prode-page-reopened"));
    }
  }, [isProde, prodeVisited]);

  useEffect(() => {
    if (isProde) setProdeVisited(true);
  }, [isProde]);

  useEffect(() => {
    const direction = location.state?.swipeDirection;
    setAnimation(direction === "left" ? "page-enter-from-right" :
      direction === "right" ? "page-enter-from-left" : "");
  }, [location.key, location.state]);


  return (
    <>
    <div key={location.key} className={animation}>
      <Suspense fallback={<RouteLoading />}>
      <Routes location={location}>
        <Route path="/" element={selectedTournament === "lab" ? <HomeLigaArgentina /> : <Home />} />
        <Route path="/liga" element={selectedTournament === "lab" ? <LigaArgentina /> : <Liga />} />
        <Route path="/equipos" element={selectedTournament === "lab" ? <LigaArgentinaEquipos /> : <Equipos />} />
        <Route path="/equipos/:teamId" element={selectedTournament === "lab" ? <LigaArgentinaEquipos /> : <Equipo />} />
        <Route path="/jugadores" element={selectedTournament === "lab" ? <Navigate to="/estadisticas" replace /> : <Jugadores />} />
        <Route path="/estadisticas" element={selectedTournament === "lab" ? <LigaArgentinaEstadisticas /> : <Estadisticas />} />
        <Route path="/prode" element={null} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/invitacion" element={<Navigate to={"/prode" + (() => {
          const params = new URLSearchParams(location.search);
          const token = params.get("token") || params.get("invite");
          return token && /^[a-f0-9]{64}$/i.test(token) ? "?invite=" + encodeURIComponent(token) : "";
        })()} replace />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/acerca" element={<Acerca />} />
      </Routes>
      </Suspense>
    </div>
    {prodeVisited && <div style={{ display: isProde ? undefined : "none" }} aria-hidden={!isProde}>
      <Suspense fallback={isProde ? <RouteLoading /> : null}>
        <Prode />
      </Suspense>
    </div>}
    </>
  );
}

function readSelectedTournament() {
  const valid = value => ["lnb", "lab", "federal"].includes(value);
  // localStorage conserva la competencia entre recargas y nuevas pestañas.
  // sessionStorage queda como respaldo para navegadores con restricciones.
  try {
    const saved = localStorage.getItem("lna-selected-tournament");
    if (valid(saved)) return saved;
  } catch {
    // Puede estar bloqueado en algunos modos de navegación.
  }
  try {
    const saved = sessionStorage.getItem("lna-selected-tournament");
    if (valid(saved)) return saved;
  } catch {
    // Si ambos almacenamientos están bloqueados, se usa LNB como valor inicial.
  }
  return "lnb";
}

function AppContent() {
  const [selectedTournament, setSelectedTournament] = useState(readSelectedTournament);
  const navigate = useNavigate();

  const changeTournament = (tournament) => {
    const nextTournament = ["lnb", "lab", "federal"].includes(tournament) ? tournament : "lnb";
    setSelectedTournament(nextTournament);
    try {
      localStorage.setItem("lna-selected-tournament", nextTournament);
    } catch {
      // localStorage puede estar bloqueado; se intenta conservar la selección en sesión.
    }
    try {
      sessionStorage.setItem("lna-selected-tournament", nextTournament);
    } catch {
      // sessionStorage también puede estar bloqueado; la navegación debe seguir funcionando.
    }
    // Cada competencia abre siempre en su portada al cambiar el selector.
    if (window.location.pathname !== "/") navigate("/");
  };

  return (
    <>
      <PreloadSections />
      <SeoMeta />
      <SwipeNavigation />
      <Header selectedTournament={selectedTournament} onTournamentChange={changeTournament} />
      {selectedTournament === "federal"
        ? <LigaFederal />
        : <AnimatedRoutes selectedTournament={selectedTournament} onTournamentChange={changeTournament} />}
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
