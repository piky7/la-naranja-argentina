import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Header from "./components/Header";
import SeoMeta from "./components/SeoMeta";
import Footer from "./components/Footer";
import SwipeNavigation from "./components/SwipeNavigation";

import Home from "./pages/Home";
import Liga from "./pages/Liga";
import Equipos from "./pages/Equipos";
import Equipo from "./pages/Equipo";
import Jugadores from "./pages/Jugadores";
import Estadisticas from "./pages/Estadisticas";
import Privacidad from "./pages/Privacidad";
import Acerca from "./pages/Acerca";
import Prode from "./pages/Prode";
import Admin from "./pages/Admin";

function AnimatedRoutes() {
  const location = useLocation();
  // Mantener Prode montado después de la primera visita: no repetir la carga
  // de Firebase, ligas y rankings cada vez que cambia la pestaña.
  const isProde = location.pathname === "/prode";
  const [prodeVisited, setProdeVisited] = useState(isProde);
  const [animation, setAnimation] = useState("");

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
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/liga" element={<Liga />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/equipos/:teamId" element={<Equipo />} />
        <Route path="/jugadores" element={<Jugadores />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/prode" element={null} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/invitacion" element={<Navigate to={"/prode" + (() => {
          const params = new URLSearchParams(location.search);
          const token = params.get("token") || params.get("invite");
          return token && /^[a-f0-9]{64}$/i.test(token) ? "?invite=" + encodeURIComponent(token) : "";
        })()} replace />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/acerca" element={<Acerca />} />
      </Routes>
    </div>
    {prodeVisited && <div style={{ display: isProde ? undefined : "none" }} aria-hidden={!isProde}>
      <Prode />
    </div>}
    </>
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
