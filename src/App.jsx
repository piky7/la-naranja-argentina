import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import SeoMeta from "./components/SeoMeta";
import Footer from "./components/Footer";
import SwipeNavigation from "./components/SwipeNavigation";

import Home from "./pages/Home";
const Liga = lazy(() => import("./pages/Liga"));
const Equipos = lazy(() => import("./pages/Equipos"));
const Equipo = lazy(() => import("./pages/Equipo"));
const Jugadores = lazy(() => import("./pages/Jugadores"));
const Estadisticas = lazy(() => import("./pages/Estadisticas"));
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Acerca = lazy(() => import("./pages/Acerca"));

function AnimatedRoutes() {
  const location = useLocation();
  const [animation, setAnimation] = useState("");

  useEffect(() => {
    const direction = location.state?.swipeDirection;
    setAnimation(direction === "left" ? "page-enter-from-right" :
      direction === "right" ? "page-enter-from-left" : "");
  }, [location.key, location.state]);

  return (
    <div key={location.key} className={animation}>
      <Suspense fallback={<div role="status" style={{ minHeight: "calc(100dvh - 120px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-soft)" }}>Cargando sección…</div>}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/liga" element={<Liga />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/equipos/:teamId" element={<Equipo />} />
        <Route path="/jugadores" element={<Jugadores />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/acerca" element={<Acerca />} />
      </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SeoMeta />
      <SwipeNavigation />
      <Header />
      <AnimatedRoutes />
      <Footer />
    </BrowserRouter>
  );
}

export default App;
