import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Header from "./components/Header";
import SeoMeta from "./components/SeoMeta";
import Footer from "./components/Footer";
import SwipeNavigation from "./components/SwipeNavigation";

import Home from "./pages/Home";
const loadLiga = () => import("./pages/Liga");
const Liga = lazy(loadLiga);
const Equipos = lazy(() => import("./pages/Equipos"));
const Equipo = lazy(() => import("./pages/Equipo"));
const Jugadores = lazy(() => import("./pages/Jugadores"));
const loadEstadisticas = () => import("./pages/Estadisticas");
const Estadisticas = lazy(loadEstadisticas);
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Acerca = lazy(() => import("./pages/Acerca"));
const Prode = lazy(() => import("./pages/Prode"));
const Admin = lazy(() => import("./pages/Admin"));
const EstadioPreview = lazy(() => import("./pages/EstadioPreview"));

// Precarga suave: no bloquea el render inicial ni consume datos extra
// en conexiones lentas o con ahorro de datos activado.
function PreloadSections() {
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData || /(^|\\s)(slow-2g|2g)(\\s|$)/i.test(connection?.effectiveType || "")) return;
    let idleId = null;
    let timerId = window.setTimeout(() => {
      const preload = () => {
        void Promise.allSettled([loadLiga(), loadEstadisticas()]);
      };
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(preload, { timeout: 6000 });
      else preload();
    }, 1400);
    return () => {
      window.clearTimeout(timerId);
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, []);
  return null;
}

function RouteLoading() {
  return <div role="status" aria-live="polite" style={{ minHeight: "45vh", display: "grid", placeItems: "center", color: "#e9f0f5", fontSize: "14px", fontWeight: 700 }}>
    Cargando sección…
  </div>;
}

function AnimatedRoutes() {
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
        <Route path="/" element={<Home />} />
        <Route path="/liga" element={<Liga />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/equipos/:teamId" element={<Equipo />} />
        <Route path="/jugadores" element={<Jugadores />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/prode" element={null} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/mi-estadio-preview" element={<EstadioPreview />} />
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

function App() {
  return (
    <BrowserRouter>
      <PreloadSections />
      <SeoMeta />
      <SwipeNavigation />
      <Header />
      <AnimatedRoutes />
      <Footer />
    </BrowserRouter>
  );
}

export default App;
